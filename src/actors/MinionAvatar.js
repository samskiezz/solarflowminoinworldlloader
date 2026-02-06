/**
 * High-quality 3D avatar system for minions
 * Supports multiple formats: ReadyPlayerMe, VRM, GLB models
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { eventBus } from '../core/EventBus.js';

export class MinionAvatar {
    constructor(minionData) {
        this.minionData = minionData;
        this.group = new THREE.Group();
        this.mixer = null;
        this.animations = {};
        this.currentAnimation = null;
        
        // Avatar configuration
        this.config = {
            type: minionData.avatarRig || 'PROCEDURAL', // RPM, VRM, GLB, PROCEDURAL
            lod: minionData.lodProfile || 'med', // low, med, high
            scale: this.getScaleByTier(minionData.tier),
            color: this.getColorByTier(minionData.tier)
        };
        
        // Animation state
        this.animationState = {
            idle: true,
            walking: false,
            working: false,
            talking: false
        };
        
        // Behavior properties
        this.walkTarget = null;
        this.walkSpeed = 0.02 + Math.random() * 0.03;
        this.thoughtBubble = null;
        this.healthWidget = null;
        
        this.init();
    }

    async init() {
        // Set basic properties
        this.group.name = `Avatar_${this.minionData.id}`;
        this.group.userData = {
            minionId: this.minionData.id,
            type: 'minion-avatar',
            selectable: true
        };
        
        // Create avatar based on type
        await this.createAvatar();
        
        // Setup interaction zones
        this.setupInteractionZones();
        
        // Position in world
        this.positionInWorld();
        
        // Initialize UI elements
        this.createThoughtBubble();
        this.createHealthWidget();
        
        console.log(`[MinionAvatar] Created ${this.config.type} avatar for ${this.minionData.id}`);
        eventBus.emit('avatar:created', { id: this.minionData.id, avatar: this });
    }

    async createAvatar() {
        switch (this.config.type) {
            case 'RPM':
                await this.loadReadyPlayerMeAvatar();
                break;
            case 'GLB':
                await this.loadGLBAvatar();
                break;
            case 'VRM':
                await this.loadVRMAvatar();
                break;
            default:
                this.createProceduralAvatar();
        }
    }

    async loadReadyPlayerMeAvatar() {
        // For now, create procedural until RPM assets are available
        console.log(`[MinionAvatar] RPM avatar requested for ${this.minionData.id}, using procedural fallback`);
        this.createProceduralAvatar();
    }

    async loadGLBAvatar() {
        try {
            const loader = new GLTFLoader();
            const avatarPath = this.minionData.avatarUrl || `assets/models/minions/${this.minionData.id.toLowerCase()}.glb`;
            
            const gltf = await new Promise((resolve, reject) => {
                loader.load(avatarPath, resolve, undefined, reject);
            });
            
            const model = gltf.scene;
            model.scale.setScalar(this.config.scale);
            
            // Setup animations
            if (gltf.animations?.length > 0) {
                this.mixer = new THREE.AnimationMixer(model);
                gltf.animations.forEach(clip => {
                    this.animations[clip.name] = this.mixer.clipAction(clip);
                });
            }
            
            this.group.add(model);
            console.log(`[MinionAvatar] Loaded GLB avatar for ${this.minionData.id}`);
            
        } catch (error) {
            console.warn(`[MinionAvatar] Failed to load GLB for ${this.minionData.id}:`, error);
            this.createProceduralAvatar();
        }
    }

    async loadVRMAvatar() {
        // VRM support would require VRM loader
        console.log(`[MinionAvatar] VRM avatar requested for ${this.minionData.id}, using procedural fallback`);
        this.createProceduralAvatar();
    }

    createProceduralAvatar() {
        // Enhanced procedural avatar with more detail
        const avatarGroup = new THREE.Group();
        
        // Body (capsule for humanoid shape)
        const bodyGeometry = new THREE.CapsuleGeometry(0.4, 1.2, 4, 8);
        const bodyMaterial = new THREE.MeshLambertMaterial({ 
            color: this.config.color,
            transparent: true,
            opacity: 0.9
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 1;
        body.castShadow = true;
        body.receiveShadow = true;
        avatarGroup.add(body);
        
        // Head
        const headGeometry = new THREE.SphereGeometry(0.3, 16, 12);
        const headMaterial = new THREE.MeshLambertMaterial({ color: 0xFFDBCC }); // Skin tone
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.8;
        head.castShadow = true;
        avatarGroup.add(head);
        
        // Eyes
        const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 6);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.1, 1.85, 0.25);
        avatarGroup.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.1, 1.85, 0.25);
        avatarGroup.add(rightEye);
        
        // Accessories based on tier/role
        this.addAccessories(avatarGroup);
        
        // Scale based on tier
        avatarGroup.scale.setScalar(this.config.scale);
        
        this.group.add(avatarGroup);
        this.avatarMesh = avatarGroup; // Reference for animations
        
        // Simple animation setup for procedural avatars
        this.setupProceduralAnimations();
    }

    addAccessories(avatarGroup) {
        // Add tier-specific accessories
        if (this.minionData.tier === 3) {
            // Crown for overseers
            const crownGeometry = new THREE.CylinderGeometry(0.35, 0.3, 0.2, 8);
            const crownMaterial = new THREE.MeshLambertMaterial({ color: 0xFFD700 });
            const crown = new THREE.Mesh(crownGeometry, crownMaterial);
            crown.position.y = 2.1;
            avatarGroup.add(crown);
        } else if (this.minionData.tier === 2) {
            // Badge for specialists
            const badgeGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.02, 8);
            const badgeMaterial = new THREE.MeshLambertMaterial({ color: 0xC0C0C0 });
            const badge = new THREE.Mesh(badgeGeometry, badgeMaterial);
            badge.position.set(0.3, 1.2, 0.35);
            badge.rotation.x = Math.PI / 2;
            avatarGroup.add(badge);
        }
        
        // Role-specific accessories
        if (this.minionData.specialties?.includes('ci-fix')) {
            // Tool belt for CI specialists
            const beltGeometry = new THREE.BoxGeometry(0.8, 0.1, 0.1);
            const beltMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
            const belt = new THREE.Mesh(beltGeometry, beltMaterial);
            belt.position.y = 0.8;
            avatarGroup.add(belt);
        }
    }

    setupProceduralAnimations() {
        // Simple keyframe animations for procedural avatars
        this.animations.idle = {
            play: () => this.startIdleAnimation(),
            stop: () => this.stopIdleAnimation()
        };
        
        this.animations.walk = {
            play: () => this.startWalkAnimation(),
            stop: () => this.stopWalkAnimation()
        };
    }

    setupInteractionZones() {
        // Invisible sphere for mouse interaction detection
        const interactionGeometry = new THREE.SphereGeometry(1.5, 8, 6);
        const interactionMaterial = new THREE.MeshBasicMaterial({ 
            visible: false,
            transparent: true,
            opacity: 0
        });
        
        this.interactionZone = new THREE.Mesh(interactionGeometry, interactionMaterial);
        this.interactionZone.userData = {
            type: 'interaction-zone',
            minionId: this.minionData.id,
            avatar: this
        };
        
        this.group.add(this.interactionZone);
    }

    positionInWorld() {
        if (this.minionData.position) {
            this.group.position.copy(this.minionData.position);
        } else {
            // Default positioning in circle around center
            const index = this.minionData.id.charCodeAt(0) % 50; // Simple hash
            const angle = (index / 50) * Math.PI * 2;
            const radius = 15 + (index % 3) * 5;
            
            this.group.position.set(
                Math.cos(angle) * radius,
                0,
                Math.sin(angle) * radius
            );
            
            // Special position for ATLAS
            if (this.minionData.id === 'ATLAS') {
                this.group.position.set(0, 0, 0);
            }
        }
    }

    createThoughtBubble() {
        // This will be created as DOM element for better text rendering
        // Implementation matches existing thought bubble system
        this.thoughtBubble = {
            element: null,
            visible: false,
            text: this.minionData.ai?.currentThought || "Thinking..."
        };
    }

    createHealthWidget() {
        // DOM-based health widget for better UI
        this.healthWidget = {
            element: null,
            visible: false,
            data: {
                health: this.minionData.ai?.energy || 100,
                mood: this.minionData.happiness || 50,
                credits: this.minionData.credits || 0,
                activity: this.minionData.ai?.currentActivity || "Idle"
            }
        };
    }

    // Animation methods
    playAnimation(name, loop = true) {
        if (this.currentAnimation) {
            this.currentAnimation.stop();
        }
        
        if (this.animations[name]) {
            this.currentAnimation = this.animations[name];
            if (this.mixer) {
                this.currentAnimation.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce);
                this.currentAnimation.play();
            } else if (this.animations[name].play) {
                this.animations[name].play();
            }
        }
    }

    startIdleAnimation() {
        // Simple breathing/bobbing animation
        this.idleAnimation = {
            startTime: Date.now(),
            amplitude: 0.05
        };
    }

    startWalkAnimation() {
        // Walking animation state
        this.walkAnimation = {
            startTime: Date.now(),
            stepFreq: 4
        };
    }

    stopIdleAnimation() {
        this.idleAnimation = null;
    }

    stopWalkAnimation() {
        this.walkAnimation = null;
    }

    // Update method called in animation loop
    update(deltaTime) {
        // Update mixer animations
        if (this.mixer) {
            this.mixer.update(deltaTime);
        }
        
        // Handle procedural animations
        this.updateProceduralAnimations();
        
        // Handle movement
        this.updateMovement(deltaTime);
        
        // Update AI state
        this.updateAI();
    }

    updateProceduralAnimations() {
        if (!this.avatarMesh) return;
        
        const time = Date.now() * 0.001;
        
        // Idle animation - slight breathing
        if (this.idleAnimation) {
            const breathe = Math.sin(time * 2) * this.idleAnimation.amplitude;
            this.avatarMesh.position.y = breathe;
        }
        
        // Walk animation
        if (this.walkAnimation) {
            const step = Math.sin(time * this.walkAnimation.stepFreq) * 0.1;
            this.avatarMesh.position.y = Math.abs(step);
            this.avatarMesh.rotation.z = Math.sin(time * this.walkAnimation.stepFreq * 2) * 0.1;
        }
    }

    updateMovement(deltaTime) {
        if (!this.walkTarget) return;
        
        const currentPos = this.group.position;
        const targetPos = this.walkTarget;
        
        const dx = targetPos.x - currentPos.x;
        const dz = targetPos.z - currentPos.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance > 0.5) {
            // Move towards target
            const moveDistance = this.walkSpeed * deltaTime * 60; // 60fps normalization
            
            currentPos.x += (dx / distance) * moveDistance;
            currentPos.z += (dz / distance) * moveDistance;
            
            // Face movement direction
            this.group.rotation.y = Math.atan2(dx, dz);
            
            // Play walk animation
            if (!this.walkAnimation) {
                this.playAnimation('walk');
            }
        } else {
            // Reached target
            this.walkTarget = null;
            this.playAnimation('idle');
        }
    }

    updateAI() {
        // Update AI state occasionally
        if (Math.random() < 0.001) { // Very low frequency
            this.minionData.ai.currentThought = this.getRandomThought();
            this.thoughtBubble.text = this.minionData.ai.currentThought;
            
            eventBus.emit('minion:thought-changed', {
                id: this.minionData.id,
                thought: this.minionData.ai.currentThought
            });
        }
        
        // Random movement occasionally
        if (Math.random() < 0.001) { // Very low frequency
            this.setRandomWalkTarget();
        }
    }

    // Interaction methods
    setWalkTarget(x, z) {
        this.walkTarget = new THREE.Vector3(x, this.group.position.y, z);
    }

    setRandomWalkTarget() {
        const angle = Math.random() * Math.PI * 2;
        const distance = 2 + Math.random() * 5;
        const x = this.group.position.x + Math.cos(angle) * distance;
        const z = this.group.position.z + Math.sin(angle) * distance;
        this.setWalkTarget(x, z);
    }

    getRandomThought() {
        const thoughts = [
            "Working on renewable energy!", "This data is fascinating",
            "Time for a break", "Collaborating effectively",
            "System running smoothly", "Optimizing performance",
            "Learning new algorithms", "Contributing to the hive"
        ];
        return thoughts[Math.floor(Math.random() * thoughts.length)];
    }

    // Utility methods
    getScaleByTier(tier) {
        switch (tier) {
            case 3: return 1.2; // Overseers are larger
            case 2: return 1.0; // Specialists normal size
            case 1: return 0.8; // Operators smaller
            default: return 1.0;
        }
    }

    getColorByTier(tier) {
        switch (tier) {
            case 3: return 0xFFD700; // Gold for overseers
            case 2: return 0xC0C0C0; // Silver for specialists
            case 1: return 0xCD7F32; // Bronze for operators
            default: return 0x87CEEB; // Sky blue default
        }
    }

    // Cleanup
    dispose() {
        if (this.mixer) {
            this.mixer.uncacheRoot(this.group);
        }
        
        // Dispose geometries and materials
        this.group.traverse(child => {
            if (child.isMesh) {
                child.geometry?.dispose();
                child.material?.dispose();
            }
        });
        
        eventBus.emit('avatar:disposed', { id: this.minionData.id });
    }
}

// Factory function for creating avatars
export function createMinionAvatar(minionData) {
    return new MinionAvatar(minionData);
}