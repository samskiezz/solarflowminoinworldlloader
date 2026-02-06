/**
 * 2025-grade renderer with proper color space and tone mapping
 * Replaces basic THREE.WebGLRenderer setup with professional defaults
 */
import * as THREE from 'three';

export function createRenderer(canvas) {
    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
        stencil: false,
        depth: true
    });

    // Device pixel ratio clamping for performance
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    // 2025 baseline realism settings - CRITICAL for proper visuals
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    // Shadow configuration
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = true;

    // Performance optimizations
    renderer.info.autoReset = true;
    renderer.sortObjects = true;

    // Physical lighting
    renderer.physicallyCorrectLights = true;

    console.log('[Renderer] Initialized with 2025-grade settings');
    console.log(`[Renderer] Pixel ratio: ${renderer.getPixelRatio()}, Size: ${renderer.getSize(new THREE.Vector2())}`);

    return renderer;
}

export function createScene() {
    const scene = new THREE.Scene();
    
    // Proper background and fog for depth
    scene.background = new THREE.Color(0x87CEEB); // Sky blue
    scene.fog = new THREE.Fog(0x87CEEB, 50, 200);
    
    // Environment setup
    scene.userData = {
        timeOfDay: 0.5, // 0 = midnight, 0.5 = noon, 1 = midnight
        weather: 'clear',
        season: 'spring'
    };

    return scene;
}

export function createCamera() {
    const camera = new THREE.PerspectiveCamera(
        75, // FOV
        window.innerWidth / window.innerHeight, // Aspect
        0.1, // Near
        1000 // Far
    );
    
    camera.position.set(0, 30, 50);
    camera.lookAt(0, 0, 0);
    
    return camera;
}

export function createLighting(scene) {
    // Remove existing lights
    const lightsToRemove = [];
    scene.traverse(child => {
        if (child.isLight) lightsToRemove.push(child);
    });
    lightsToRemove.forEach(light => scene.remove(light));

    // Ambient light for global illumination
    const ambientLight = new THREE.AmbientLight(0x87CEEB, 0.6);
    ambientLight.name = 'ambient';
    scene.add(ambientLight);

    // Directional light (sun) with proper shadow setup
    const sunLight = new THREE.DirectionalLight(0xFFFFDD, 1.2);
    sunLight.position.set(50, 80, 30);
    sunLight.name = 'sun';
    
    // Shadow camera setup for directional light
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 200;
    sunLight.shadow.camera.left = -50;
    sunLight.shadow.camera.right = 50;
    sunLight.shadow.camera.top = 50;
    sunLight.shadow.camera.bottom = -50;
    sunLight.shadow.bias = -0.0005;
    
    scene.add(sunLight);

    // Fill light for softer shadows
    const fillLight = new THREE.DirectionalLight(0xFFE4B5, 0.4);
    fillLight.position.set(-30, 40, -30);
    fillLight.name = 'fill';
    scene.add(fillLight);

    // Dynamic time-based lighting
    scene.userData.updateLighting = (timeOfDay) => {
        let sunIntensity = 1.2;
        let skyColor = 0x87CEEB;
        let sunColor = 0xFFFFDD;
        
        if (timeOfDay < 0.25 || timeOfDay > 0.75) {
            // Night (0-6am, 6pm-12am)
            sunIntensity = 0.3;
            skyColor = 0x191970; // Midnight blue
            sunColor = 0x9999FF; // Cool moonlight
        } else if (timeOfDay < 0.35 || timeOfDay > 0.65) {
            // Dawn/dusk (6-8am, 4-6pm)
            sunIntensity = 0.8;
            skyColor = 0xFFA500; // Orange
            sunColor = 0xFFAA55; // Warm sunrise/sunset
        }
        
        // Update lighting
        sunLight.intensity = sunIntensity;
        sunLight.color.setHex(sunColor);
        scene.background.setHex(skyColor);
        scene.fog.color.setHex(skyColor);
        
        // Update sun position based on time
        const angle = timeOfDay * Math.PI * 2;
        sunLight.position.set(
            Math.sin(angle) * 50,
            Math.cos(angle) * 80 + 20, // Keep above horizon
            30
        );
    };

    console.log('[Lighting] Professional 3-point lighting setup complete');
    return { ambientLight, sunLight, fillLight };
}

export function handleResize(renderer, camera, composer = null) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    renderer.setSize(width, height);
    
    if (composer) {
        composer.setSize(width, height);
    }
    
    console.log(`[Renderer] Resized to ${width}x${height}`);
}

// Utility for checking WebGL capabilities
export function checkWebGLSupport() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        
        const info = {
            supported: !!gl,
            version: gl ? gl.getParameter(gl.VERSION) : null,
            renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : null,
            maxTextureSize: gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) : 0
        };
        
        console.log('[WebGL] Support check:', info);
        return info;
        
    } catch (error) {
        console.error('[WebGL] Support check failed:', error);
        return { supported: false, error: error.message };
    }
}