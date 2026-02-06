/**
 * 3D City builder with modular architecture
 * Creates buildings, roads, parks, and urban infrastructure
 */
import * as THREE from 'three';

export class City {
    constructor(scene) {
        this.scene = scene;
        this.buildings = [];
        this.roads = [];
        this.parks = [];
        this.decorations = [];
        this.lights = [];
        
        // City configuration
        this.config = {
            size: 200,
            blockSize: 40,
            roadWidth: 4,
            buildingCount: 8,
            treeCount: 12,
            lampCount: 8
        };
        
        this.materials = this.createMaterials();
    }

    async build() {
        console.log('[City] Building urban environment...');
        
        // Build in layers
        this.createGround();
        this.createRoadNetwork();
        this.createBuildings();
        this.createParks();
        this.createStreetFurniture();
        this.addAtmosphere();
        
        console.log(`[City] Built ${this.buildings.length} buildings, ${this.roads.length} road segments, ${this.parks.length} parks`);
    }

    createMaterials() {
        return {
            ground: new THREE.MeshLambertMaterial({ 
                color: 0x90EE90,
                transparent: true,
                opacity: 0.9
            }),
            
            road: new THREE.MeshLambertMaterial({ color: 0x444444 }),
            roadLine: new THREE.MeshBasicMaterial({ color: 0xFFFFFF }),
            
            concrete: new THREE.MeshLambertMaterial({ color: 0xCCCCCC }),
            glass: new THREE.MeshPhysicalMaterial({
                color: 0x87CEEB,
                transparent: true,
                opacity: 0.3,
                roughness: 0.1,
                metalness: 0.1
            }),
            
            parkGrass: new THREE.MeshLambertMaterial({ color: 0x228B22 }),
            treeTrunk: new THREE.MeshLambertMaterial({ color: 0x8B4513 }),
            treeLeaves: new THREE.MeshLambertMaterial({ color: 0x228B22 }),
            
            lamp: new THREE.MeshBasicMaterial({ 
                color: 0xFFFFAA,
                transparent: true,
                opacity: 0.8
            })
        };
    }

    createGround() {
        const groundGeometry = new THREE.PlaneGeometry(this.config.size, this.config.size, 32, 32);
        
        // Add some height variation
        const vertices = groundGeometry.attributes.position.array;
        for (let i = 2; i < vertices.length; i += 3) {
            vertices[i] = Math.random() * 0.5; // Small height variations
        }
        groundGeometry.attributes.position.needsUpdate = true;
        groundGeometry.computeVertexNormals();
        
        const ground = new THREE.Mesh(groundGeometry, this.materials.ground);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        ground.name = 'ground';
        
        this.scene.add(ground);
    }

    createRoadNetwork() {
        const roadSegments = [
            // Main horizontal road
            { 
                geometry: new THREE.PlaneGeometry(this.config.size, this.config.roadWidth),
                position: [0, 0.01, 0],
                rotation: [-Math.PI / 2, 0, 0]
            },
            // Main vertical road  
            {
                geometry: new THREE.PlaneGeometry(this.config.roadWidth, this.config.size),
                position: [0, 0.01, 0],
                rotation: [-Math.PI / 2, 0, 0]
            }
        ];
        
        roadSegments.forEach((segment, index) => {
            const road = new THREE.Mesh(segment.geometry, this.materials.road);
            road.position.set(...segment.position);
            road.rotation.set(...segment.rotation);
            road.name = `road-${index}`;
            road.receiveShadow = true;
            
            this.scene.add(road);
            this.roads.push(road);
            
            // Add road markings
            this.addRoadMarkings(road, index === 0 ? 'horizontal' : 'vertical');
        });
    }

    addRoadMarkings(road, orientation) {
        const lineGeometry = new THREE.PlaneGeometry(
            orientation === 'horizontal' ? this.config.size : 0.2,
            orientation === 'horizontal' ? 0.2 : this.config.size
        );
        
        const centerLine = new THREE.Mesh(lineGeometry, this.materials.roadLine);
        centerLine.position.copy(road.position);
        centerLine.position.y += 0.01;
        centerLine.rotation.copy(road.rotation);
        centerLine.name = `road-line-${orientation}`;
        
        this.scene.add(centerLine);
    }

    createBuildings() {
        const buildingConfigs = [
            // Office district
            { pos: [-30, -30], size: [8, 15, 8], color: 0x4A90E2, type: 'office' },
            { pos: [30, -30], size: [6, 12, 6], color: 0x7ED321, type: 'office' },
            { pos: [-20, 20], size: [10, 18, 10], color: 0xF5A623, type: 'office' },
            { pos: [25, 25], size: [7, 14, 7], color: 0xBD10E0, type: 'office' },
            
            // Residential district
            { pos: [-40, 0], size: [5, 8, 5], color: 0xFF6B6B, type: 'residential' },
            { pos: [40, 0], size: [4, 6, 4], color: 0x4ECDC4, type: 'residential' },
            { pos: [0, -40], size: [6, 10, 6], color: 0xFFE66D, type: 'residential' },
            { pos: [0, 40], size: [5, 9, 5], color: 0xA8E6CF, type: 'residential' }
        ];

        buildingConfigs.forEach((config, index) => {
            const building = this.createBuilding(config, index);
            this.buildings.push(building);
        });
    }

    createBuilding(config, index) {
        const [width, height, depth] = config.size;
        const buildingGroup = new THREE.Group();
        buildingGroup.name = `building-${index}-${config.type}`;
        
        // Main building structure
        const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
        const buildingMaterial = new THREE.MeshLambertMaterial({ color: config.color });
        const buildingMesh = new THREE.Mesh(buildingGeometry, buildingMaterial);
        
        buildingMesh.position.set(config.pos[0], height / 2, config.pos[1]);
        buildingMesh.castShadow = true;
        buildingMesh.receiveShadow = true;
        
        buildingGroup.add(buildingMesh);
        
        // Add architectural details
        this.addBuildingDetails(buildingGroup, buildingMesh, config);
        
        this.scene.add(buildingGroup);
        return buildingGroup;
    }

    addBuildingDetails(buildingGroup, buildingMesh, config) {
        const [width, height, depth] = config.size;
        
        // Windows
        this.addWindows(buildingGroup, buildingMesh, config);
        
        // Rooftop details for taller buildings
        if (height > 10) {
            this.addRooftopDetails(buildingGroup, buildingMesh, config);
        }
        
        // Entrance for ground floor
        this.addEntrance(buildingGroup, buildingMesh, config);
    }

    addWindows(buildingGroup, buildingMesh, config) {
        const [width, height, depth] = config.size;
        const windowSize = 0.8;
        const windowSpacing = 2;
        
        const windowGeometry = new THREE.PlaneGeometry(windowSize, windowSize);
        
        // Front face windows
        const windowsX = Math.floor(width / windowSpacing);
        const windowsY = Math.floor(height / 3);
        
        for (let x = 0; x < windowsX; x++) {
            for (let y = 1; y < windowsY + 1; y++) {
                const window = new THREE.Mesh(windowGeometry, this.materials.glass);
                
                window.position.set(
                    buildingMesh.position.x + (x - windowsX/2 + 0.5) * windowSpacing,
                    buildingMesh.position.y - height/2 + y * 3,
                    buildingMesh.position.z + depth/2 + 0.01
                );
                
                buildingGroup.add(window);
            }
        }
    }

    addRooftopDetails(buildingGroup, buildingMesh, config) {
        const [width, height, depth] = config.size;
        
        // Rooftop structure
        const rooftopGeometry = new THREE.BoxGeometry(width * 0.6, 1, depth * 0.6);
        const rooftopMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
        const rooftop = new THREE.Mesh(rooftopGeometry, rooftopMaterial);
        
        rooftop.position.set(
            buildingMesh.position.x,
            buildingMesh.position.y + height/2 + 0.5,
            buildingMesh.position.z
        );
        
        buildingGroup.add(rooftop);
    }

    addEntrance(buildingGroup, buildingMesh, config) {
        const [width, height, depth] = config.size;
        
        // Simple entrance doorway
        const doorGeometry = new THREE.BoxGeometry(1.5, 2.5, 0.1);
        const doorMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
        const door = new THREE.Mesh(doorGeometry, doorMaterial);
        
        door.position.set(
            buildingMesh.position.x,
            buildingMesh.position.y - height/2 + 1.25,
            buildingMesh.position.z + depth/2 + 0.05
        );
        
        buildingGroup.add(door);
    }

    createParks() {
        // Central park
        const centralPark = this.createPark([0, 0], 12);
        this.parks.push(centralPark);
        
        // Smaller neighborhood parks
        const parkLocations = [
            [-60, -60], [60, -60], [-60, 60], [60, 60]
        ];
        
        parkLocations.forEach((pos, index) => {
            const park = this.createPark(pos, 6, `neighborhood-${index}`);
            this.parks.push(park);
        });
    }

    createPark(position, radius, name = 'central') {
        const parkGroup = new THREE.Group();
        parkGroup.name = `park-${name}`;
        
        // Park ground
        const parkGeometry = new THREE.CircleGeometry(radius, 16);
        const park = new THREE.Mesh(parkGeometry, this.materials.parkGrass);
        park.rotation.x = -Math.PI / 2;
        park.position.set(position[0], 0.02, position[1]);
        park.receiveShadow = true;
        
        parkGroup.add(park);
        
        // Trees around the perimeter
        const treeCount = Math.floor(radius / 2);
        for (let i = 0; i < treeCount; i++) {
            const angle = (i / treeCount) * Math.PI * 2;
            const treeRadius = radius * 0.7;
            const x = position[0] + Math.cos(angle) * treeRadius;
            const z = position[1] + Math.sin(angle) * treeRadius;
            
            const tree = this.createTree(x, z);
            parkGroup.add(tree);
        }
        
        // Park benches
        this.addParkFurniture(parkGroup, position, radius);
        
        this.scene.add(parkGroup);
        return parkGroup;
    }

    createTree(x, z) {
        const treeGroup = new THREE.Group();
        
        // Trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.4, 4, 8);
        const trunk = new THREE.Mesh(trunkGeometry, this.materials.treeTrunk);
        trunk.position.set(x, 2, z);
        trunk.castShadow = true;
        treeGroup.add(trunk);
        
        // Leaves (multiple spheres for more natural look)
        const leafPositions = [
            [0, 0, 0], [-1, 0.5, 0], [1, 0.5, 0], [0, 0.5, -1], [0, 0.5, 1]
        ];
        
        leafPositions.forEach(([offsetX, offsetY, offsetZ]) => {
            const foliageGeometry = new THREE.SphereGeometry(2 + Math.random(), 6, 4);
            const foliage = new THREE.Mesh(foliageGeometry, this.materials.treeLeaves);
            foliage.position.set(x + offsetX, 5 + offsetY, z + offsetZ);
            foliage.castShadow = true;
            treeGroup.add(foliage);
        });
        
        return treeGroup;
    }

    addParkFurniture(parkGroup, position, radius) {
        // Simple benches
        const benchPositions = [
            [position[0] - radius/2, position[1]],
            [position[0] + radius/2, position[1]],
            [position[0], position[1] - radius/2],
            [position[0], position[1] + radius/2]
        ];
        
        benchPositions.forEach(pos => {
            const benchGeometry = new THREE.BoxGeometry(2, 0.5, 0.5);
            const benchMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
            const bench = new THREE.Mesh(benchGeometry, benchMaterial);
            bench.position.set(pos[0], 0.25, pos[1]);
            bench.castShadow = true;
            parkGroup.add(bench);
        });
    }

    createStreetFurniture() {
        // Street lamps
        const lampPositions = [
            [-15, -15], [15, -15], [-15, 15], [15, 15],
            [-30, 0], [30, 0], [0, -30], [0, 30]
        ];
        
        lampPositions.forEach((pos, index) => {
            const lamp = this.createStreetLamp(pos[0], pos[1], index);
            this.decorations.push(lamp);
        });
        
        // Traffic elements
        this.addTrafficElements();
    }

    createStreetLamp(x, z, index) {
        const lampGroup = new THREE.Group();
        lampGroup.name = `street-lamp-${index}`;
        
        // Lamp post
        const postGeometry = new THREE.CylinderGeometry(0.1, 0.1, 8);
        const postMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const post = new THREE.Mesh(postGeometry, postMaterial);
        post.position.set(x, 4, z);
        post.castShadow = true;
        lampGroup.add(post);
        
        // Lamp fixture
        const lampGeometry = new THREE.SphereGeometry(0.5);
        const lamp = new THREE.Mesh(lampGeometry, this.materials.lamp);
        lamp.position.set(x, 8, z);
        lampGroup.add(lamp);
        
        // Point light for illumination
        const pointLight = new THREE.PointLight(0xFFFFAA, 0.5, 20);
        pointLight.position.set(x, 8, z);
        pointLight.castShadow = true;
        pointLight.shadow.mapSize.width = 512;
        pointLight.shadow.mapSize.height = 512;
        lampGroup.add(pointLight);
        
        this.lights.push(pointLight);
        this.scene.add(lampGroup);
        
        return lampGroup;
    }

    addTrafficElements() {
        // Simple crosswalk markings
        const crosswalkPositions = [
            { pos: [0, -2], rotation: [0, 0, 0], size: [8, 0.5] },
            { pos: [0, 2], rotation: [0, 0, 0], size: [8, 0.5] },
            { pos: [-2, 0], rotation: [0, Math.PI/2, 0], size: [8, 0.5] },
            { pos: [2, 0], rotation: [0, Math.PI/2, 0], size: [8, 0.5] }
        ];
        
        crosswalkPositions.forEach((crosswalk, index) => {
            const geometry = new THREE.PlaneGeometry(crosswalk.size[0], crosswalk.size[1]);
            const material = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
            const mesh = new THREE.Mesh(geometry, material);
            
            mesh.position.set(crosswalk.pos[0], 0.02, crosswalk.pos[1]);
            mesh.rotation.set(-Math.PI/2, crosswalk.rotation[1], crosswalk.rotation[2]);
            mesh.name = `crosswalk-${index}`;
            
            this.scene.add(mesh);
        });
    }

    addAtmosphere() {
        // Particle system for ambient effects could go here
        // For now, just ensure proper fog and background are set
        
        console.log('[City] Atmospheric effects configured');
    }

    // Dynamic time-of-day lighting control
    updateLighting(timeOfDay) {
        const isNight = timeOfDay < 0.25 || timeOfDay > 0.75;
        
        // Street lamps
        this.lights.forEach(light => {
            light.intensity = isNight ? 1.0 : 0.2;
            light.visible = true;
        });
        
        // Building window lights
        this.buildings.forEach(building => {
            building.traverse(child => {
                if (child.material === this.materials.glass) {
                    child.material.emissive.setHex(isNight ? 0x332211 : 0x000000);
                }
            });
        });
    }

    // Utility methods
    getBuildingCount() {
        return this.buildings.length;
    }

    getParkCount() {
        return this.parks.length;
    }

    getLightCount() {
        return this.lights.length;
    }

    getStats() {
        return {
            buildings: this.buildings.length,
            roads: this.roads.length,
            parks: this.parks.length,
            decorations: this.decorations.length,
            lights: this.lights.length
        };
    }
}

// Factory function
export function createCity(scene) {
    return new City(scene);
}