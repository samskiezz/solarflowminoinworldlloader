/**
 * Post-processing effects stack for 2025-grade visuals
 * Modular system that can be enabled/disabled based on performance
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';

export class PostFXManager {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        this.composer = null;
        this.passes = {};
        this.enabled = true;
        this.qualityLevel = 'high'; // low, med, high
        
        this.init();
    }

    init() {
        // Create composer
        this.composer = new EffectComposer(this.renderer);
        
        // Base render pass (always needed)
        this.passes.render = new RenderPass(this.scene, this.camera);
        this.composer.addPass(this.passes.render);
        
        // Bloom pass for glow effects
        this.setupBloomPass();
        
        // Anti-aliasing (if supported)
        this.setupAntiAliasing();
        
        // Output pass (gamma correction)
        this.passes.output = new OutputPass();
        this.composer.addPass(this.passes.output);
        
        console.log('[PostFX] Initialized with quality level:', this.qualityLevel);
    }

    setupBloomPass() {
        const bloomParams = this.getBloomParams();
        
        this.passes.bloom = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            bloomParams.strength,
            bloomParams.radius,
            bloomParams.threshold
        );
        
        this.composer.addPass(this.passes.bloom);
        console.log('[PostFX] Bloom pass configured:', bloomParams);
    }

    setupAntiAliasing() {
        try {
            if (this.qualityLevel === 'high') {
                this.passes.smaa = new SMAAPass(window.innerWidth * this.renderer.getPixelRatio(), window.innerHeight * this.renderer.getPixelRatio());
                this.composer.addPass(this.passes.smaa);
                console.log('[PostFX] SMAA anti-aliasing enabled');
            }
        } catch (error) {
            console.warn('[PostFX] SMAA not available, using renderer anti-aliasing');
        }
    }

    getBloomParams() {
        switch (this.qualityLevel) {
            case 'low':
                return { strength: 0.3, radius: 0.2, threshold: 0.9 };
            case 'med':
                return { strength: 0.5, radius: 0.4, threshold: 0.8 };
            case 'high':
                return { strength: 0.7, radius: 0.6, threshold: 0.7 };
            default:
                return { strength: 0.5, radius: 0.4, threshold: 0.8 };
        }
    }

    render(deltaTime) {
        if (this.enabled && this.composer) {
            this.composer.render(deltaTime);
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }

    setQuality(level) {
        this.qualityLevel = level;
        
        // Reconfigure bloom
        if (this.passes.bloom) {
            const params = this.getBloomParams();
            this.passes.bloom.strength = params.strength;
            this.passes.bloom.radius = params.radius;
            this.passes.bloom.threshold = params.threshold;
        }
        
        console.log('[PostFX] Quality level changed to:', level);
    }

    toggleBloom() {
        if (this.passes.bloom) {
            this.passes.bloom.enabled = !this.passes.bloom.enabled;
            console.log('[PostFX] Bloom:', this.passes.bloom.enabled ? 'ON' : 'OFF');
            return this.passes.bloom.enabled;
        }
        return false;
    }

    setBloomStrength(value) {
        if (this.passes.bloom) {
            this.passes.bloom.strength = Math.max(0, Math.min(3, value));
            console.log('[PostFX] Bloom strength:', this.passes.bloom.strength);
        }
    }

    enable() {
        this.enabled = true;
        console.log('[PostFX] Effects enabled');
    }

    disable() {
        this.enabled = false;
        console.log('[PostFX] Effects disabled - using basic rendering');
    }

    resize(width, height) {
        if (this.composer) {
            this.composer.setSize(width, height);
        }
        
        if (this.passes.smaa) {
            this.passes.smaa.setSize(width * this.renderer.getPixelRatio(), height * this.renderer.getPixelRatio());
        }
        
        if (this.passes.bloom) {
            this.passes.bloom.setSize(width, height);
        }
        
        console.log(`[PostFX] Resized to ${width}x${height}`);
    }

    getStats() {
        return {
            enabled: this.enabled,
            quality: this.qualityLevel,
            passes: Object.keys(this.passes).length,
            bloomEnabled: this.passes.bloom?.enabled || false,
            smaaEnabled: this.passes.smaa?.enabled || false
        };
    }
}

// Utility function for basic setup
export function createBasicPostFX(renderer, scene, camera) {
    return new PostFXManager(renderer, scene, camera);
}

// Performance detection
export function detectPostFXCapabilities() {
    const gl = document.createElement('canvas').getContext('webgl');
    if (!gl) return { recommended: 'none' };
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
    
    // Basic GPU detection for quality recommendations
    const isHighEnd = /RTX|GTX|Radeon|Metal|Apple/.test(renderer);
    const isMobile = /Mobile|Android|iPhone/.test(navigator.userAgent);
    
    let recommended = 'med';
    
    if (isMobile) {
        recommended = 'low';
    } else if (isHighEnd) {
        recommended = 'high';
    }
    
    console.log('[PostFX] Capabilities detected:', { renderer, recommended, isMobile });
    
    return {
        recommended,
        renderer,
        isMobile,
        webgl2: !!document.createElement('canvas').getContext('webgl2')
    };
}