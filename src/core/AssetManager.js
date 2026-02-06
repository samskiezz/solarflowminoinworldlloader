/**
 * Professional Asset Management System
 * Handles all asset loading with caching, error handling, and progress tracking
 */
import * as THREE from "three";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";

export class AssetManager {
    constructor(options = {}) {
        // Core loaders
        this.gltf = new GLTFLoader();
        this.rgbe = new RGBELoader();
        this.fbx = new FBXLoader();
        this.textureLoader = new THREE.TextureLoader();
        
        // Setup DRACO compression support
        this.draco = new DRACOLoader();
        this.draco.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
        this.gltf.setDRACOLoader(this.draco);
        
        // Asset cache and tracking
        this.cache = new Map();
        this.loading = new Map();
        this.loadQueue = [];
        this.stats = {
            loaded: 0,
            failed: 0,
            total: 0,
            cacheHits: 0
        };
        
        // Configuration
        this.config = {
            maxConcurrent: options.maxConcurrent || 4,
            timeout: options.timeout || 30000,
            retries: options.retries || 2,
            basePath: options.basePath || '',
            enableCache: options.enableCache !== false,
            ...options
        };
        
        this.isProcessing = false;
        
        console.log('[AssetManager] Initialized with config:', this.config);
    }

    /**
     * Load HDRI environment map
     */
    async loadHDRI(path) {
        const fullPath = this.resolvePath(path);
        
        if (this.config.enableCache && this.cache.has(fullPath)) {
            this.stats.cacheHits++;
            console.log('[AssetManager] HDRI cache hit:', path);
            return this.cache.get(fullPath);
        }

        console.log('[AssetManager] Loading HDRI:', fullPath);
        
        try {
            const tex = await this.loadWithTimeout(
                () => this.rgbe.loadAsync(fullPath),
                fullPath
            );
            
            tex.mapping = THREE.EquirectangularReflectionMapping;
            tex.name = path;
            
            if (this.config.enableCache) {
                this.cache.set(fullPath, tex);
            }
            
            this.stats.loaded++;
            console.log('[AssetManager] HDRI loaded successfully:', path);
            return tex;
            
        } catch (error) {
            this.stats.failed++;
            console.error('[AssetManager] Failed to load HDRI:', path, error);
            throw error;
        }
    }

    /**
     * Load GLTF/GLB model with full processing
     */
    async loadGLB(path, options = {}) {
        const fullPath = this.resolvePath(path);
        
        if (this.config.enableCache && this.cache.has(fullPath)) {
            this.stats.cacheHits++;
            console.log('[AssetManager] GLB cache hit:', path);
            return this.cache.get(fullPath).clone();
        }

        console.log('[AssetManager] Loading GLB:', fullPath);
        
        try {
            const gltf = await this.loadWithTimeout(
                () => this.gltf.loadAsync(fullPath),
                fullPath
            );
            
            // Process the loaded model
            this.processGLTF(gltf, options);
            
            if (this.config.enableCache) {
                this.cache.set(fullPath, gltf);
            }
            
            this.stats.loaded++;
            console.log('[AssetManager] GLB loaded successfully:', path, {
                scenes: gltf.scenes.length,
                animations: gltf.animations.length,
                materials: Object.keys(gltf.userData?.materials || {}).length
            });
            
            return gltf;
            
        } catch (error) {
            this.stats.failed++;
            console.error('[AssetManager] Failed to load GLB:', path, error);
            throw error;
        }
    }

    /**
     * Load texture with full processing
     */
    async loadTexture(path, options = {}) {
        const fullPath = this.resolvePath(path);
        
        if (this.config.enableCache && this.cache.has(fullPath)) {
            this.stats.cacheHits++;
            return this.cache.get(fullPath);
        }

        console.log('[AssetManager] Loading texture:', fullPath);
        
        try {
            const texture = await this.loadWithTimeout(
                () => this.textureLoader.loadAsync(fullPath),
                fullPath
            );
            
            // Apply texture processing options
            if (options.colorSpace) {
                texture.colorSpace = options.colorSpace;
            } else if (fullPath.includes('baseColor') || fullPath.includes('diffuse')) {
                texture.colorSpace = THREE.SRGBColorSpace;
            }
            
            if (options.flipY !== undefined) {
                texture.flipY = options.flipY;
            }
            
            if (options.wrapS) texture.wrapS = options.wrapS;
            if (options.wrapT) texture.wrapT = options.wrapT;
            
            texture.name = path;
            
            if (this.config.enableCache) {
                this.cache.set(fullPath, texture);
            }
            
            this.stats.loaded++;
            return texture;
            
        } catch (error) {
            this.stats.failed++;
            console.error('[AssetManager] Failed to load texture:', path, error);
            throw error;
        }
    }

    /**
     * Load FBX model (legacy support)
     */
    async loadFBX(path) {
        const fullPath = this.resolvePath(path);
        
        if (this.config.enableCache && this.cache.has(fullPath)) {
            this.stats.cacheHits++;
            return this.cache.get(fullPath).clone();
        }

        try {
            const model = await this.loadWithTimeout(
                () => this.fbx.loadAsync(fullPath),
                fullPath
            );
            
            if (this.config.enableCache) {
                this.cache.set(fullPath, model);
            }
            
            this.stats.loaded++;
            return model;
            
        } catch (error) {
            this.stats.failed++;
            console.error('[AssetManager] Failed to load FBX:', path, error);
            throw error;
        }
    }

    /**
     * Batch load multiple assets with progress tracking
     */
    async loadBatch(assets, onProgress) {
        const results = [];
        const errors = [];
        
        this.stats.total += assets.length;
        
        for (let i = 0; i < assets.length; i++) {
            const asset = assets[i];
            
            try {
                let result;
                
                switch (asset.type) {
                    case 'gltf':
                    case 'glb':
                        result = await this.loadGLB(asset.path, asset.options);
                        break;
                    case 'hdri':
                        result = await this.loadHDRI(asset.path);
                        break;
                    case 'texture':
                        result = await this.loadTexture(asset.path, asset.options);
                        break;
                    case 'fbx':
                        result = await this.loadFBX(asset.path);
                        break;
                    default:
                        throw new Error(`Unknown asset type: ${asset.type}`);
                }
                
                results.push({ ...asset, result, status: 'loaded' });
                
            } catch (error) {
                console.error(`[AssetManager] Failed to load ${asset.type}:`, asset.path, error);
                results.push({ ...asset, error, status: 'failed' });
                errors.push({ asset, error });
            }
            
            // Progress callback
            if (onProgress) {
                onProgress({
                    loaded: i + 1,
                    total: assets.length,
                    progress: (i + 1) / assets.length,
                    current: asset,
                    errors: errors.length
                });
            }
        }
        
        console.log(`[AssetManager] Batch completed: ${results.length - errors.length}/${assets.length} successful`);
        
        return {
            results,
            errors,
            success: errors.length === 0
        };
    }

    /**
     * Preload critical assets based on manifest
     */
    async preloadCritical(manifest) {
        console.log('[AssetManager] Preloading critical assets:', manifest.length);
        
        const critical = manifest.filter(asset => asset.priority === 'critical');
        const result = await this.loadBatch(critical, (progress) => {
            console.log(`[AssetManager] Critical preload: ${progress.loaded}/${progress.total}`);
        });
        
        return result;
    }

    /**
     * Process GLTF after loading
     */
    processGLTF(gltf, options = {}) {
        // Setup shadows and materials
        gltf.scene.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = options.castShadow !== false;
                node.receiveShadow = options.receiveShadow !== false;
                
                // Ensure correct color space for textures
                if (node.material?.map) {
                    node.material.map.colorSpace = THREE.SRGBColorSpace;
                }
                
                // Optimize material for performance
                if (options.optimizeMaterials) {
                    this.optimizeMaterial(node.material);
                }
            }
            
            if (node.isLight) {
                node.castShadow = options.lightShadows !== false;
            }
        });
        
        // Store animation metadata
        if (gltf.animations?.length) {
            gltf.userData.animationNames = gltf.animations.map(clip => clip.name);
        }
    }

    /**
     * Optimize material for better performance
     */
    optimizeMaterial(material) {
        if (!material) return;
        
        // Disable unnecessary features for performance
        if (material.normalMap && material.normalScale) {
            material.normalScale.set(0.5, 0.5); // Reduce normal intensity
        }
        
        // Optimize reflection if present but not critical
        if (material.envMapIntensity && material.envMapIntensity > 1) {
            material.envMapIntensity = 1;
        }
    }

    /**
     * Load with timeout and retry logic
     */
    async loadWithTimeout(loadFunction, path) {
        let lastError;
        
        for (let attempt = 0; attempt <= this.config.retries; attempt++) {
            try {
                const result = await Promise.race([
                    loadFunction(),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Timeout')), this.config.timeout)
                    )
                ]);
                
                return result;
                
            } catch (error) {
                lastError = error;
                console.warn(`[AssetManager] Load attempt ${attempt + 1} failed for ${path}:`, error.message);
                
                if (attempt < this.config.retries) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
                }
            }
        }
        
        throw lastError;
    }

    /**
     * Resolve asset path with base path
     */
    resolvePath(path) {
        if (path.startsWith('http') || path.startsWith('/')) {
            return path;
        }
        
        return this.config.basePath ? `${this.config.basePath}/${path}` : path;
    }

    /**
     * Clear cache and free memory
     */
    clearCache() {
        for (const [path, asset] of this.cache) {
            if (asset.dispose) {
                asset.dispose();
            }
        }
        
        this.cache.clear();
        console.log('[AssetManager] Cache cleared');
    }

    /**
     * Get loading statistics
     */
    getStats() {
        const cacheSize = this.cache.size;
        const memoryEstimate = cacheSize * 0.1; // Rough estimate in MB
        
        return {
            ...this.stats,
            cacheSize,
            memoryEstimate: `${memoryEstimate.toFixed(1)}MB`,
            loadingProgress: this.stats.total > 0 ? (this.stats.loaded / this.stats.total) : 0
        };
    }

    /**
     * Dispose of the asset manager
     */
    dispose() {
        this.clearCache();
        this.draco.dispose();
        console.log('[AssetManager] Disposed');
    }
}