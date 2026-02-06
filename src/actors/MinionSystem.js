/**
 * MinionSystem - Manages all minion avatars in the world
 * Handles spawning, updating, and synchronization with hive state
 */
import * as THREE from "three";
import { MinionAvatar } from "./MinionAvatar.js";

export class MinionSystem {
    constructor({ scene, assets, store, bus }) {
        this.scene = scene;
        this.assets = assets;
        this.store = store;
        this.bus = bus;
        this.avatars = new Map();
        this.spawnArea = { x: 40, z: 40 };
        
        // Listen for hive state updates
        bus.on("hive:updated", () => this.syncFromStore());
        
        console.log('[MinionSystem] Initialized with spawn area:', this.spawnArea);
    }

    /**
     * Synchronize avatars with current store state
     * Adds new minions, removes deleted ones
     */
    async syncFromStore() {
        console.log('[MinionSystem] Syncing from store...');
        
        const currentMinions = this.store.getMinions();
        if (!currentMinions || currentMinions.length === 0) {
            console.warn('[MinionSystem] No minions in store');
            return;
        }
        
        const ids = new Set(currentMinions.map(m => m.id));
        
        // Remove missing avatars
        for (const [id, avatar] of this.avatars.entries()) {
            if (!ids.has(id)) {
                console.log(`[MinionSystem] Removing ${id} (no longer in store)`);
                this.scene.remove(avatar.group);
                avatar.dispose();
                this.avatars.delete(id);
            }
        }
        
        // Add new avatars
        let newCount = 0;
        for (const minion of currentMinions) {
            if (this.avatars.has(minion.id)) continue;
            
            console.log(`[MinionSystem] Creating avatar for ${minion.id}`);
            const avatar = new MinionAvatar(minion);
            
            // Spawn placement (use provided position if exists)
            const px = minion.position?.x ?? (Math.random() - 0.5) * this.spawnArea.x;
            const pz = minion.position?.z ?? (Math.random() - 0.5) * this.spawnArea.z;
            const py = 0;
            
            avatar.group.position.set(px, py, pz);
            this.scene.add(avatar.group);
            this.avatars.set(minion.id, avatar);
            newCount++;
            
            // Load model asynchronously (from repo path)
            this.loadAvatarModel(avatar, minion);
        }
        
        console.log(`[MinionSystem] Sync complete: ${newCount} new, ${this.avatars.size} total`);
        
        // Emit update event
        this.bus.emit('avatars:synced', {
            total: this.avatars.size,
            new: newCount
        });
    }

    /**
     * Load avatar model asynchronously
     */
    async loadAvatarModel(avatar, minion) {
        try {
            // For GLB avatars, use the asset manager if available
            if (this.assets && minion.avatarUrl) {
                console.log(`[MinionSystem] Loading GLB model for ${minion.id}: ${minion.avatarUrl}`);
                // Avatar will handle its own loading
            }
            
            // The avatar handles its own model loading in the existing system
            
        } catch (error) {
            console.warn(`[MinionSystem] Failed to load model for ${minion.id}:`, error);
        }
    }

    /**
     * Update all avatars
     */
    update(deltaTime) {
        for (const avatar of this.avatars.values()) {
            avatar.update(deltaTime);
        }
    }

    /**
     * Get all meshes for raycasting (hover detection)
     */
    getHoverables() {
        const meshes = [];
        
        for (const avatar of this.avatars.values()) {
            // Traverse avatar groups for meshes
            avatar.group.traverse(obj => {
                if (obj.isMesh && obj.userData?.type !== 'interaction-zone') {
                    // Add reference to parent avatar
                    obj.userData.avatar = avatar;
                    obj.userData.minionId = avatar.minionData.id;
                    meshes.push(obj);
                }
            });
        }
        
        return meshes;
    }

    /**
     * Get avatar by minion ID
     */
    getAvatar(minionId) {
        return this.avatars.get(minionId);
    }

    /**
     * Get all avatars
     */
    getAllAvatars() {
        return Array.from(this.avatars.values());
    }

    /**
     * Select an avatar (for camera follow, etc.)
     */
    selectAvatar(minionId) {
        const avatar = this.avatars.get(minionId);
        if (avatar) {
            this.selectedAvatar = avatar;
            this.bus.emit('avatar:selected', {
                avatar,
                minionData: avatar.minionData
            });
            return avatar;
        }
        return null;
    }

    /**
     * Get currently selected avatar
     */
    getSelectedAvatar() {
        return this.selectedAvatar;
    }

    /**
     * Update minion positions based on formation or pattern
     */
    arrangeInFormation(formation = 'circle') {
        const avatars = Array.from(this.avatars.values());
        const count = avatars.length;
        
        if (count === 0) return;
        
        switch (formation) {
            case 'circle':
                avatars.forEach((avatar, index) => {
                    const angle = (index / count) * Math.PI * 2;
                    const radius = 15 + Math.floor(index / 10) * 5; // Multiple rings
                    const x = Math.cos(angle) * radius;
                    const z = Math.sin(angle) * radius;
                    
                    avatar.setWalkTarget(x, z);
                });
                break;
                
            case 'grid':
                const gridSize = Math.ceil(Math.sqrt(count));
                const spacing = 3;
                
                avatars.forEach((avatar, index) => {
                    const row = Math.floor(index / gridSize);
                    const col = index % gridSize;
                    const x = (col - gridSize / 2) * spacing;
                    const z = (row - gridSize / 2) * spacing;
                    
                    avatar.setWalkTarget(x, z);
                });
                break;
                
            case 'line':
                avatars.forEach((avatar, index) => {
                    const x = (index - count / 2) * 2;
                    const z = 0;
                    
                    avatar.setWalkTarget(x, z);
                });
                break;
                
            case 'scatter':
                avatars.forEach(avatar => {
                    avatar.setRandomWalkTarget();
                });
                break;
        }
        
        console.log(`[MinionSystem] Arranged ${count} avatars in ${formation} formation`);
    }

    /**
     * Update all minion activities based on world state
     */
    updateActivities() {
        const worldTime = this.store.getWorldTime?.() || { hour: 12, day: 1 };
        const isWorkTime = worldTime.hour >= 8 && worldTime.hour < 18;
        
        for (const [id, avatar] of this.avatars.entries()) {
            const minion = this.store.getMinion(id);
            if (!minion) continue;
            
            // Update activity based on time and minion state
            let newActivity = 'idle';
            
            if (isWorkTime && minion.ai?.energy > 30) {
                newActivity = 'working';
            } else if (minion.ai?.energy < 30) {
                newActivity = 'resting';
            } else if (Math.random() < 0.1) { // 10% chance of talking
                newActivity = 'talking';
            }
            
            // Update minion's current activity
            if (minion.ai) {
                minion.ai.currentActivity = newActivity;
            }
            
            // Play appropriate animation
            avatar.playAnimation(newActivity);
        }
    }

    /**
     * Get system statistics
     */
    getStats() {
        const avatars = Array.from(this.avatars.values());
        const activeCount = avatars.filter(a => a.minionData.ai?.energy > 50).length;
        const workingCount = avatars.filter(a => a.minionData.ai?.currentActivity === 'working').length;
        const restingCount = avatars.filter(a => a.minionData.ai?.currentActivity === 'resting').length;
        
        return {
            total: this.avatars.size,
            active: activeCount,
            working: workingCount,
            resting: restingCount,
            selected: this.selectedAvatar?.minionData.id || null
        };
    }

    /**
     * Dispose of all avatars and cleanup
     */
    dispose() {
        console.log('[MinionSystem] Disposing all avatars');
        
        for (const [id, avatar] of this.avatars.entries()) {
            this.scene.remove(avatar.group);
            avatar.dispose();
        }
        
        this.avatars.clear();
        this.selectedAvatar = null;
    }
}