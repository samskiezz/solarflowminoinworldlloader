/**
 * Real 3D assets for Solarhaven: CC0 model kits by Kenney (www.kenney.nl) –
 * suburban and commercial buildings, cars, rigged mini characters and nature –
 * shipped under docs/realm/assets/models with their licences. This module
 * loads them once (GLTF), hands out clones (SkeletonUtils for rigged ones),
 * and fits them to the town's lots. Everything in the world keeps a
 * procedural fallback, so the town appears instantly and upgrades as the
 * models arrive, and still renders when they cannot load at all.
 */
import * as THREE from 'three';
import { GLTFLoader } from '../../../vendor/three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from '../../../vendor/three/examples/jsm/utils/SkeletonUtils.js';

export const BASE = new URL('../../assets/models/', import.meta.url).href;

/** Everything the town uses. Keys are `<kit>/<file>`. */
export const MANIFEST = {
    suburban: ['building-type-a', 'building-type-b', 'building-type-c', 'building-type-d', 'building-type-e', 'building-type-f', 'building-type-g', 'building-type-h', 'building-type-i', 'building-type-j', 'building-type-k', 'building-type-l', 'building-type-m', 'building-type-n', 'building-type-o', 'building-type-p', 'building-type-q', 'building-type-r', 'building-type-s', 'building-type-t', 'building-type-u', 'fence', 'fence-low', 'driveway-short', 'path-short', 'planter', 'tree-large', 'tree-small'],
    commercial: ['building-a', 'building-b', 'building-c', 'building-d', 'building-e', 'building-f', 'building-g', 'building-h', 'building-i', 'building-j', 'building-k', 'building-l', 'building-m', 'building-n', 'building-skyscraper-a', 'building-skyscraper-b', 'detail-awning', 'detail-overhang'],
    cars: ['van', 'delivery', 'truck', 'sedan', 'suv', 'taxi', 'hatchback-sports', 'cone'],
    characters: ['character-male-a', 'character-male-b', 'character-male-c', 'character-male-d', 'character-male-e', 'character-male-f', 'character-female-a', 'character-female-b', 'character-female-c', 'character-female-d', 'character-female-e', 'character-female-f'],
    nature: ['tree_oak', 'tree_detailed', 'tree_simple', 'tree_default', 'tree_pineTallA', 'tree_pineRoundA', 'tree_pineSmallA', 'tree_palm', 'tree_thin', 'plant_bush', 'plant_bushLarge', 'plant_flatTall', 'flower_yellowA', 'flower_purpleA', 'flower_redA', 'rock_smallA', 'rock_smallB', 'rock_largeA', 'grass', 'grass_large', 'stump_old', 'log']
};
export const HOUSE_TYPES = MANIFEST.suburban.filter((k) => k.startsWith('building-type-'));
export const TREE_TYPES = ['nature/tree_oak', 'nature/tree_detailed', 'nature/tree_simple', 'nature/tree_default', 'nature/tree_pineTallA', 'nature/tree_pineRoundA', 'suburban/tree-large', 'suburban/tree-small'];
/** Which commercial building stands in for each landmark kind. */
export const LANDMARK_MODELS = { guild: 'commercial/building-h', library: 'commercial/building-c', workshop: 'commercial/building-k', market: 'commercial/building-a', cafe: 'commercial/building-d', depot: 'commercial/building-m', office: 'commercial/building-skyscraper-a' };

const cache = new Map(); // key → { scene, animations }
const state = { ready: false, loading: null, loaded: 0, failed: [], total: Object.values(MANIFEST).reduce((n, l) => n + l.length, 0) };
let loader = null;

export function assetsReady() { return state.ready; }
export function assetStatus() { return { ready: state.ready, loaded: state.loaded, failed: state.failed.slice(), total: state.total }; }
export function has(key) { return cache.has(key); }
export function keys() { return [...cache.keys()]; }
/** Models ship as .glb; a host that serves only web media types gets the same models as glTF JSON (.json, buffer embedded). The first failure switches the extension once. */
let ext = 'glb';
export function urlFor(key, e = ext) { return `${BASE}${key}.${e}`; }
export function modelExtension() { return ext; }

/** Load one model into the cache; resolves to the cached entry or null. */
export async function load(key, { timeoutMs = 20000 } = {}) {
    if (cache.has(key)) return cache.get(key);
    if (!loader) loader = new GLTFLoader();
    const attempt = (e) => Promise.race([loader.loadAsync(urlFor(key, e)), new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs))]);
    let gltf;
    try { gltf = await attempt(ext); } catch (error) { if (ext !== 'glb') throw error; try { gltf = await attempt('json'); ext = 'json'; } catch { throw error; } }
    gltf.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.material && o.material.map) o.material.map.colorSpace = THREE.SRGBColorSpace; } });
    const entry = { key, scene: gltf.scene, animations: gltf.animations || [], skinned: Boolean(gltf.scene.getObjectByProperty('isSkinnedMesh', true)) };
    cache.set(key, entry);
    return entry;
}

/** Load the whole manifest (in parallel, failures tolerated). Resolves once, with what loaded. */
export function preload({ onProgress = null, timeoutMs = 20000 } = {}) {
    if (state.loading) return state.loading;
    const all = Object.entries(MANIFEST).flatMap(([kit, names]) => names.map((n) => `${kit}/${n}`));
    state.loading = Promise.allSettled(all.map((key) => load(key, { timeoutMs }).then((e) => { state.loaded++; if (onProgress) onProgress(assetStatus()); return e; }).catch((error) => { state.failed.push({ key, error: error.message }); if (onProgress) onProgress(assetStatus()); return null; })))
        .then(() => { state.ready = state.loaded > 0; return assetStatus(); });
    return state.loading;
}

/** A fresh instance of a cached model (rigged ones are cloned with their skeleton). Null when it is not loaded. */
export function instance(key, { shadows = true } = {}) {
    const e = cache.get(key); if (!e) return null;
    const obj = e.skinned ? cloneSkinned(e.scene) : e.scene.clone(true);
    obj.traverse((o) => { if (o.isMesh) { o.castShadow = shadows; o.receiveShadow = shadows; } });
    obj.userData.asset = key; obj.userData.animations = e.animations;
    return obj;
}
export function animationsOf(key) { const e = cache.get(key); return e ? e.animations : []; }

/** Bounding size of an object (its own local space). */
export function sizeOf(object) { const box = new THREE.Box3().setFromObject(object); const s = new THREE.Vector3(); box.getSize(s); return { w: s.x, h: s.y, d: s.z, box }; }
/** Scale an object uniformly so its footprint fits w × d (and optionally a height), and stand it on y = 0 centred on x/z. */
export function fitTo(object, { w = null, d = null, h = null, maxScale = 50 } = {}) {
    const s = sizeOf(object);
    const candidates = [];
    if (w && s.w > 0) candidates.push(w / s.w); if (d && s.d > 0) candidates.push(d / s.d); if (h && s.h > 0) candidates.push(h / s.h);
    const scale = Math.min(maxScale, candidates.length ? Math.min(...candidates) : 1);
    object.scale.setScalar(scale);
    const box = new THREE.Box3().setFromObject(object); const c = new THREE.Vector3(); box.getCenter(c);
    object.position.x -= c.x; object.position.z -= c.z; object.position.y -= box.min.y;
    return { scale, w: s.w * scale, h: s.h * scale, d: s.d * scale };
}
/** Pick a key from a list by a stable hash of some id. */
export function pickFor(id, list) { let x = 7; for (const c of String(id)) x = (x * 31 + c.charCodeAt(0)) >>> 0; return list[x % list.length]; }

/** Register for tests: the manifest is sound and the loader degrades without the files. */
export const FEATURES = [
    { id: 'game.assets.manifest', title: 'The asset manifest names every CC0 kit model the town uses, with houses, trees and landmark models mapped', test: () => state.total >= 80 && HOUSE_TYPES.length === 21 && TREE_TYPES.length === 8 && Object.keys(LANDMARK_MODELS).length === 7 && MANIFEST.characters.length === 12 && /assets\/models\/$/.test(BASE) },
    { id: 'game.assets.fallback', title: 'Before anything loads, instances are null and the status says so, so the town can fall back to its procedural look', test: () => instance('suburban/nope') === null && assetsReady() === state.ready && typeof assetStatus().total === 'number' && pickFor('ATLAS', ['a', 'b', 'c']) === pickFor('ATLAS', ['a', 'b', 'c']) },
    { id: 'game.assets.fit', title: 'fitTo scales an object to a footprint and stands it on the ground', dom: true, test: () => { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 1)); m.position.y = 7; g.add(m); const r = fitTo(g, { w: 8, d: 8 }); const box = new THREE.Box3().setFromObject(g); return Math.abs(r.scale - 4) < 1e-6 && Math.abs(box.min.y) < 1e-6 && Math.abs(r.w - 8) < 1e-6; } },
    { id: 'game.assets.load', title: 'Models load from the site (GLB), clone with shadows, and rigged characters come with their animations', dom: true, test: async () => { try { const e = await load('characters/character-male-a', { timeoutMs: 15000 }); const inst = instance('characters/character-male-a'); const house = await load('suburban/building-type-a', { timeoutMs: 15000 }); return e.skinned && e.animations.some((a) => a.name === 'walk') && inst && inst !== e.scene && inst.userData.animations.length > 20 && !house.skinned && sizeOf(house.scene).w > 0; } catch (error) { return `assets not reachable here: ${error.message}`; } } }
];
