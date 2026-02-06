/**
 * Main engine that integrates all systems
 * Replaces monolithic HTML approach with modular architecture
 */
import * as THREE from 'three';
import { createRenderer, createScene, createCamera, createLighting, handleResize } from './Renderer.js';
import { PostFXManager } from './PostFX.js';
import { AssetManager } from './AssetManager.js';
import { eventBus } from './EventBus.js';
import { stateStore } from './StateStore.js';
import { createCity } from '../world/City.js';
import { MinionSystem } from '../actors/MinionSystem.js';

export class DominionEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.postFX = null;
        
        // Game systems
        this.city = null;
        this.assets = new AssetManager({ basePath: './assets' });
        this.minions = null; // MinionSystem
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Time system
        this.gameTime = {
            day: 1,
            hour: 8,
            minute: 0,
            speed: 1,
            paused: false,
            timeOfDay: 0.33 // 0-1 range
        };
        
        // Animation
        this.clock = new THREE.Clock();
        this.animationId = null;
        
        // State
        this.selectedAvatar = null;
        this.followingAvatar = null;
        this.initialized = false;
        
        this.setupEventListeners();
    }

    async initialize() {
        console.log('[Engine] Initializing Dominion City Engine...');
        
        try {
            // Core 3D setup
            this.renderer = createRenderer(this.canvas);
            this.scene = createScene();
            this.camera = createCamera();
            this.lighting = createLighting(this.scene);
            
            // Post-processing
            this.postFX = new PostFXManager(this.renderer, this.scene, this.camera);
            
            // Load hive state
            await stateStore.loadHiveState();
            
            // Build world
            await this.buildWorld();
            
            // Initialize minion system
            await this.initializeMinionSystem();
            
            // Setup interaction
            this.setupInteraction();
            
            // Start time system
            this.startTimeSystem();
            
            // Start animation loop
            this.start();
            
            this.initialized = true;
            eventBus.emit('engine:initialized', { engine: this });
            
            console.log(`[Engine] Initialization complete! ${this.avatars.size} avatars in world`);
            
        } catch (error) {
            console.error('[Engine] Initialization failed:', error);
            eventBus.emit('engine:error', { error, stage: 'initialization' });
            throw error;
        }
    }

    async buildWorld() {
        console.log('[Engine] Building world...');
        
        // Create city
        this.city = createCity(this.scene);
        await this.city.build();
        
        eventBus.emit('world:built', { city: this.city });
    }

    async initializeMinionSystem() {
        console.log('[Engine] Initializing enhanced minion system...');
        
        // Create minion system with integrated asset management
        this.minions = new MinionSystem({
            scene: this.scene,
            assets: this.assets,
            store: stateStore,
            bus: eventBus
        });
        
        // Sync from store to create initial avatars
        await this.minions.syncFromStore();
        
        console.log('[Engine] Minion system initialized');
        eventBus.emit('minions:initialized', { system: this.minions });
    }

    setupInteraction() {
        // Mouse events
        this.canvas.addEventListener('click', this.onMouseClick.bind(this));
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        
        // Window events
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // Keyboard events
        window.addEventListener('keydown', this.onKeyDown.bind(this));
        
        console.log('[Engine] Interaction system initialized');
    }

    setupEventListeners() {
        // Listen to state changes
        eventBus.on('hive:loaded', this.onHiveLoaded.bind(this));
        eventBus.on('minion:selected', this.onMinionSelected.bind(this));
        eventBus.on('avatar:disposed', this.onAvatarDisposed.bind(this));
        
        // Engine control events
        eventBus.on('engine:pause', () => this.pause());
        eventBus.on('engine:resume', () => this.resume());
        eventBus.on('engine:setTimeSpeed', (speed) => this.setTimeSpeed(speed));
    }

    onHiveLoaded(data) {
        console.log('[Engine] Hive data loaded:', data);
        // Could trigger avatar updates here
    }

    onMinionSelected(data) {
        this.selectedAvatar = this.avatars.get(data.minionId);
        console.log('[Engine] Selected avatar:', data.minionId);
    }

    onAvatarDisposed(data) {
        this.avatars.delete(data.id);
        console.log('[Engine] Avatar disposed:', data.id);
    }

    // Input handling
    onMouseClick(event) {
        this.updateMousePosition(event);
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Check for avatar intersections using minion system
        const hoverables = this.minions?.getHoverables() || [];
        const intersects = this.raycaster.intersectObjects(hoverables);
        
        if (intersects.length > 0) {
            const hitObject = intersects[0].object;
            const avatar = hitObject.userData.avatar;
            const minionId = hitObject.userData.minionId;
            
            if (avatar && minionId) {
                this.selectAvatar(avatar);
                eventBus.emit('avatar:clicked', { 
                    avatar, 
                    minionId: minionId,
                    position: intersects[0].point
                });
            }
        }
    }

    onMouseMove(event) {
        this.updateMousePosition(event);
        
        // Handle hover effects here if needed
        // Could show thought bubbles or health widgets
    }

    updateMousePosition(event) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    onKeyDown(event) {
        switch (event.code) {
            case 'KeyP':
                this.togglePause();
                break;
            case 'KeyF':
                if (this.selectedAvatar) {
                    this.followAvatar(this.selectedAvatar);
                }
                break;
            case 'KeyR':
                this.resetCamera();
                break;
            case 'Escape':
                this.deselectAvatar();
                break;
        }
    }

    onWindowResize() {
        handleResize(this.renderer, this.camera, this.postFX?.composer);
        eventBus.emit('engine:resized', { 
            width: window.innerWidth, 
            height: window.innerHeight 
        });
    }

    // Avatar interaction
    selectAvatar(avatar) {
        // Deselect previous
        if (this.selectedAvatar) {
            // Could add visual deselection here
        }
        
        this.selectedAvatar = avatar;
        
        // Visual selection feedback
        // Could add outline, glow, or other effects
        
        eventBus.emit('avatar:selected', { 
            avatar, 
            minionData: avatar.minionData 
        });
        
        console.log('[Engine] Selected avatar:', avatar.minionData.id);
    }

    deselectAvatar() {
        if (this.selectedAvatar) {
            // Remove visual selection
            eventBus.emit('avatar:deselected', { avatar: this.selectedAvatar });
            this.selectedAvatar = null;
        }
    }

    followAvatar(avatar) {
        this.followingAvatar = avatar;
        eventBus.emit('camera:following', { avatar });
        console.log('[Engine] Following avatar:', avatar.minionData.id);
    }

    stopFollowing() {
        this.followingAvatar = null;
        eventBus.emit('camera:stopped-following');
        console.log('[Engine] Stopped following');
    }

    // Camera controls
    resetCamera() {
        this.camera.position.set(0, 30, 50);
        this.camera.lookAt(0, 0, 0);
        this.stopFollowing();
        eventBus.emit('camera:reset');
    }

    setCameraPosition(x, y, z) {
        this.camera.position.set(x, y, z);
    }

    setCameraTarget(x, y, z) {
        this.camera.lookAt(x, y, z);
    }

    // Time system
    startTimeSystem() {
        setInterval(() => {
            if (!this.gameTime.paused) {
                this.updateGameTime();
            }
        }, 1000);
        
        console.log('[Engine] Time system started');
    }

    updateGameTime() {
        this.gameTime.minute += this.gameTime.speed;
        
        if (this.gameTime.minute >= 60) {
            this.gameTime.minute = 0;
            this.gameTime.hour++;
            
            if (this.gameTime.hour >= 24) {
                this.gameTime.hour = 0;
                this.gameTime.day++;
                eventBus.emit('time:newDay', this.gameTime);
            }
        }
        
        // Calculate time of day (0-1)
        this.gameTime.timeOfDay = (this.gameTime.hour + this.gameTime.minute / 60) / 24;
        
        // Update world lighting
        this.scene.userData.updateLighting?.(this.gameTime.timeOfDay);
        this.city?.updateLighting?.(this.gameTime.timeOfDay);
        
        eventBus.emit('time:updated', this.gameTime);
    }

    setTimeSpeed(speed) {
        this.gameTime.speed = Math.max(0, Math.min(10, speed));
        eventBus.emit('time:speedChanged', this.gameTime.speed);
    }

    pause() {
        this.gameTime.paused = true;
        eventBus.emit('engine:paused');
    }

    resume() {
        this.gameTime.paused = false;
        eventBus.emit('engine:resumed');
    }

    togglePause() {
        if (this.gameTime.paused) {
            this.resume();
        } else {
            this.pause();
        }
    }

    // IMPORTANT: canonical hive refresh path
    async refreshHive() {
        try {
            const res = await fetch("hive_state.json?" + Date.now(), { cache: "no-store" });
            const hive = await res.json();
            
            // Apply to store and emit update
            stateStore.applyHive(hive);
            eventBus.emit("hive:updated", hive);
            
            console.log('[Engine] Hive state refreshed from canonical source');
            return hive;
        } catch (error) {
            console.error('[Engine] Failed to refresh hive state:', error);
            throw error;
        }
    }

    startAutoRefresh(ms = 30000) {
        console.log(`[Engine] Starting auto-refresh every ${ms}ms`);
        setInterval(() => this.refreshHive().catch(console.error), ms);
    }

    // Enhanced tick method with proper animation loop
    tick() {
        const dt = this.clock.getDelta();
        
        // Update minion system (handles all avatars)
        if (this.minions) {
            this.minions.update(dt);
        }
        
        // Update camera following
        if (this.followingAvatar) {
            const avatarPos = this.followingAvatar.group.position;
            const offset = new THREE.Vector3(10, 10, 10);
            this.camera.position.lerp(avatarPos.clone().add(offset), 0.02);
            this.camera.lookAt(avatarPos);
        }
        
        // Optional: Load HDRI environment if not already loaded
        if (!this.scene.environment && this.assets) {
            this.loadEnvironment();
        }
        
        // Render with composer for post-processing
        if (this.postFX && this.postFX.composer) {
            this.postFX.render(dt);
        } else {
            this.renderer.render(this.scene, this.camera);
        }
        
        // Emit frame event for external systems
        eventBus.emit('engine:frame', { deltaTime: dt, frame: this.clock.elapsedTime });
        
        // Continue animation loop
        requestAnimationFrame(() => this.tick());
    }

    // Enhanced resize handling
    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Update composer size for post-processing
        if (this.postFX && this.postFX.composer) {
            this.postFX.composer.setSize(window.innerWidth, window.innerHeight);
        }
        
        console.log(`[Engine] Resized to ${window.innerWidth}x${window.innerHeight}`);
        eventBus.emit('engine:resized', { 
            width: window.innerWidth, 
            height: window.innerHeight 
        });
    }

    // Animation loop (legacy method for compatibility)
    start() {
        if (this.animationId) return;
        
        this.clock.start();
        this.tick(); // Use enhanced tick method
        
        console.log('[Engine] Animation started with tick loop');
        eventBus.emit('engine:started');
    }

    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        console.log('[Engine] Animation stopped');
        eventBus.emit('engine:stopped');
    }

    // Enhanced environment loading
    async loadEnvironment() {
        try {
            // Try to load HDRI environment if available
            const hdri = await this.assets.loadHDRI('hdri/studio_small_09_2k.hdr');
            if (hdri) {
                this.scene.environment = hdri;
                console.log('[Engine] HDRI environment loaded');
            }
        } catch (error) {
            console.log('[Engine] HDRI not available, using basic lighting');
        }
    }

    // Public API methods
    getAvatar(minionId) {
        return this.minions?.getAvatar(minionId);
    }

    getAllAvatars() {
        return this.minions?.getAllAvatars() || [];
    }

    getSelectedAvatar() {
        return this.selectedAvatar;
    }

    getGameTime() {
        return { ...this.gameTime };
    }

    getCityStats() {
        return this.city?.getStats() || {};
    }

    getEngineStats() {
        const minionStats = this.minions?.getStats() || {};
        
        return {
            avatars: minionStats.total || 0,
            selectedAvatar: this.selectedAvatar?.minionData.id || null,
            followingAvatar: this.followingAvatar?.minionData.id || null,
            gameTime: this.gameTime,
            postFXEnabled: this.postFX?.enabled || false,
            renderInfo: this.renderer?.info || {},
            minionStats
        };
    }

    // Cleanup
    dispose() {
        this.stop();
        
        // Dispose minion system
        if (this.minions) {
            this.minions.dispose();
        }
        
        // Dispose assets
        if (this.assets) {
            this.assets.dispose();
        }
        
        // Dispose renderer
        this.renderer?.dispose();
        
        // Remove event listeners
        window.removeEventListener('resize', this.onWindowResize);
        window.removeEventListener('keydown', this.onKeyDown);
        
        console.log('[Engine] Disposed');
        eventBus.emit('engine:disposed');
    }
}

// Factory function
export function createEngine(canvas) {
    return new DominionEngine(canvas);
}