import * as THREE from './vendor/three/build/three.module.js';
import { EffectComposer } from './vendor/three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from './vendor/three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './vendor/three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OrbitControls } from './vendor/three/examples/jsm/controls/OrbitControls.js';

const canvas = document.getElementById('c');
const statusEl = document.getElementById('status');
const panel = document.getElementById('panel');
const pTitle = document.getElementById('pTitle');
const pMeta = document.getElementById('pMeta');
const pTags = document.getElementById('pTags');
const pHappy = document.getElementById('pHappy');
const pHappyVal = document.getElementById('pHappyVal');

const btnMap = document.getElementById('btnMap');
const btnCloseMap = document.getElementById('btnCloseMap');
const btnFocusAtlas = document.getElementById('btnFocusAtlas');
const btnSound = document.getElementById('btnSound');
const mapEl = document.getElementById('map');
const mapList = document.getElementById('mapList');
const searchEl = document.getElementById('search');

// Robust base path for GitHub Pages project sites:
// Always use the first path segment as the repo name.
const ROOT = (()=>{
  const parts = window.location.pathname.split('/').filter(Boolean);
  const repo = parts[0] || 'solarflow-status';
  return '/' + repo + '/';
})();
const BASE = window.location.origin + ROOT;

const MINIONS_URL = BASE + 'minions.json';
const AGORA_URL = BASE + 'agora.json';

// --- Sound FX (WebAudio synth, no external assets) ---
let audioOn = false;
let audioCtx = null;
let master = null;

function ensureAudio(){
  if(audioCtx) return true;
  try{
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    master = audioCtx.createGain();
    master.gain.value = 0.35;
    master.connect(audioCtx.destination);
    return true;
  }catch(e){
    return false;
  }
}

function blip({f=440, dur=0.08, type='sine', gain=0.12, glide=0, endF=null}={}){
  if(!audioOn) return;
  if(!ensureAudio()) return;
  const t0 = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  if(glide && endF){
    o.frequency.exponentialRampToValueAtTime(endF, t0 + glide);
  }
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function clickFx(){ blip({f:620, endF:820, glide:0.05, dur:0.09, type:'triangle', gain:0.14}); }
function hoverFx(){ blip({f:520, dur:0.05, type:'sine', gain:0.07}); }
function openFx(){ blip({f:320, endF:640, glide:0.09, dur:0.14, type:'sawtooth', gain:0.10}); }
function closeFx(){ blip({f:640, endF:280, glide:0.09, dur:0.12, type:'sawtooth', gain:0.09}); }
function teleportFx(){ blip({f:220, endF:1320, glide:0.12, dur:0.18, type:'square', gain:0.10}); blip({f:1320, endF:520, glide:0.10, dur:0.16, type:'triangle', gain:0.08}); }
function packetFx(){ blip({f:880, dur:0.04, type:'triangle', gain:0.06}); }

btnSound?.addEventListener('click', async ()=>{
  // Audio must start on a user gesture on mobile.
  audioOn = !audioOn;
  if(audioOn){
    ensureAudio();
    if(audioCtx?.state === 'suspended'){
      try{ await audioCtx.resume(); }catch(e){}
    }
    btnSound.textContent = 'Sound: ON';
    openFx();
  }else{
    btnSound.textContent = 'Sound: OFF';
  }
});

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x030615, 0.06);

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
camera.position.set(0, 10, 18);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
// Chrome Android (S25 Ultra): prefer higher fidelity but keep a cap to avoid thermal throttling.
const dpr = window.devicePixelRatio || 1;
renderer.setPixelRatio(Math.min(2.25, dpr));
renderer.setClearColor(0x02030a, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.28;
renderer.physicallyCorrectLights = true;

let composer;
let bloomPass;

function resize(){
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w/h;
  camera.updateProjectionMatrix();
  if(composer) composer.setSize(w, h);
  if(bloomPass) bloomPass.setSize(w, h);
  // SMAA removed (vendoring minimized dependencies)
}
window.addEventListener('resize', resize);
resize();

// Controls (game navigation)
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.target.set(0, 0.8, 0);
controls.minDistance = 4;
controls.maxDistance = 40;
controls.maxPolarAngle = Math.PI * 0.49;

// WASD navigation (pan the whole rig)
const keys = new Set();
window.addEventListener('keydown', (e)=>{
  const k = (e.key||'').toLowerCase();
  if(['w','a','s','d','q','e','shift'].includes(k)) keys.add(k);
});
window.addEventListener('keyup', (e)=>{
  const k = (e.key||'').toLowerCase();
  keys.delete(k);
});

// Lights (neon)
scene.add(new THREE.AmbientLight(0x8aa2ff, 0.35));
const key = new THREE.DirectionalLight(0x9dffff, 2.0);
key.position.set(12, 18, 8);
scene.add(key);
const mag = new THREE.PointLight(0xb400ff, 80, 120);
mag.position.set(-12, 10, -10);
scene.add(mag);
const cya = new THREE.PointLight(0x00ffff, 70, 120);
cya.position.set(12, 8, 12);
scene.add(cya);

// Floor grid
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(140, 140, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0x05081a, metalness: 0.2, roughness: 0.9 })
);
floor.rotation.x = -Math.PI/2;
floor.position.y = -2;
scene.add(floor);

const grid = new THREE.GridHelper(120, 120, 0x00f5ff, 0x2a2f52);
grid.position.y = -1.99;
grid.material.opacity = 0.35;
grid.material.transparent = true;
scene.add(grid);

// Pod geometry (real capsule geometry, smoother)
const capsuleGeo = new THREE.CapsuleGeometry(0.60, 1.35, 8, 22);

const pods = []; // { id, meshGroup, data }
const podById = new Map();
let minionList = [];

// Avatar textures (for hologram characters)
const texLoader = new THREE.TextureLoader();
const avatarTexCache = new Map();
function resolveAvatarUrl(url){
  if(!url) return null;
  // make relative avatar paths work under any base
  if(url.startsWith('http')) return url;
  const clean = url.replace(/^\.\//,'');
  return BASE + clean;
}
async function loadAvatarTexture(url){
  const u = resolveAvatarUrl(url);
  if(!u) return null;
  if(avatarTexCache.has(u)) return avatarTexCache.get(u);
  const t = await new Promise((resolve, reject)=>{
    texLoader.load(u, resolve, undefined, reject);
  }).catch(()=>null);
  if(t){
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    avatarTexCache.set(u, t);
  }
  return t;
}

function focusPodById(id){
  const p = podById.get((id||'').toUpperCase());
  if(!p) return;
  const pos = p.meshGroup.position.clone();
  teleportFx();
  // move target to pod and bring camera in closer
  controls.target.lerp(pos, 0.45);
  const dir = camera.position.clone().sub(controls.target).normalize();
  camera.position.copy(pos.clone().add(dir.multiplyScalar(14)));
  setPanel(p);
}

async function addHologram(group, data){
  const tex = await loadAvatarTexture(data.avatar_url);
  if(!tex) return;

  // Character billboard (inside pod)
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    opacity: 0.85,
    depthWrite: false
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.35, 1.35, 1);
  sprite.position.set(0, 0.15, 0);

  // Neon rim glow hologram
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex,
    color: 0x00ffff,
    transparent: true,
    opacity: 0.20,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  }));
  glow.scale.set(1.55, 1.55, 1);
  glow.position.copy(sprite.position);

  // Scanline plane (fake hologram shimmer)
  const scan = new THREE.Mesh(
    new THREE.PlaneGeometry(1.55, 1.55),
    new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  scan.position.copy(sprite.position);

  group.add(glow);
  group.add(sprite);
  group.add(scan);

  group.userData.holo = { sprite, glow, scan };
}

async function makePod(data, i, total){
  const group = new THREE.Group();

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0b1030,
    roughness: 0.12,
    metalness: 0.15,
    transmission: 0.85,
    thickness: 0.7,
    ior: 1.4,
    clearcoat: 1.0,
    clearcoatRoughness: 0.12,
    emissive: new THREE.Color(0x000000)
  });

  const edgeMat = new THREE.MeshStandardMaterial({
    color: 0x0b1030,
    metalness: 0.6,
    roughness: 0.25,
    emissive: new THREE.Color(0x00f5ff),
    emissiveIntensity: 1.2
  });

  const capsule = new THREE.Mesh(capsuleGeo, glassMat);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.80, 0.06, 16, 64), edgeMat);
  ring.rotation.x = Math.PI/2;

  group.add(capsule, ring);

  // subtle halo (kept small; bloom does the heavy lifting)
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    color: 0x00f5ff,
    transparent: true,
    opacity: 0.10
  }));
  glow.scale.set(3.8,3.8,1);
  group.add(glow);

  // layout: hub-spoke with gentle spiral
  const angle = (i/Math.max(1,total-1)) * Math.PI * 2;
  const radius = 6.5 + (i%5)*0.6;
  group.position.set(Math.cos(angle)*radius, 0.6 + (i%3)*0.12, Math.sin(angle)*radius);

  // make ATLAS center if present
  if((data.id||'').toUpperCase()==='ATLAS') group.position.set(0, 0.9, 0);

  group.userData = { type:'pod', id: data.id, data };

  // hologram character
  await addHologram(group, data);

  scene.add(group);
  return group;
}

// Links + packets
const linkGroup = new THREE.Group();
scene.add(linkGroup);
const packetGroup = new THREE.Group();
scene.add(packetGroup);
const packets = []; // { mesh, a:Vector3, b:Vector3, t, speed }

function rebuildLinks(messages){
  linkGroup.clear();
  packetGroup.clear();
  packets.length = 0;

  const pairSet = new Set();
  for(const m of (messages||[])){
    const a = (m.sender_id||'').toUpperCase();
    // try infer receiver from payload.to or payload.owner-ish
    const b = (m.payload?.to || m.payload?.owner || m.payload?.target || '').toString().toUpperCase();
    // if unknown, just pulse outward from sender to ATLAS
    const to = b || 'ATLAS';
    const key = `${a}->${to}`;
    pairSet.add(key);

    const pa = podById.get(a)?.meshGroup?.position;
    const pb = podById.get(to)?.meshGroup?.position;
    if(!pa || !pb) continue;

    // line
    const pts = [pa.clone(), pb.clone()];
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color: 0x00f5ff, transparent:true, opacity:0.25 });
    const line = new THREE.Line(geom, mat);
    linkGroup.add(line);

    // packet
    const pm = new THREE.Mesh(
      new THREE.SphereGeometry(0.10, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xb400ff })
    );
    packetGroup.add(pm);
    packets.push({ mesh: pm, a: pa.clone(), b: pb.clone(), t: Math.random(), speed: 0.15 + Math.random()*0.25, nextBeep: 0.15 + Math.random()*0.25 });
  }
}

// Raycasting
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hovered = null;

function setPanel(minion){
  if(!minion){ panel.style.display='none'; return; }
  panel.style.display='block';
  pTitle.textContent = minion.id;
  const d = minion.data || {};
  pMeta.textContent = `Tier ${d.tier} • ${d.role} • ${d.mode} • credits ${d.energy_credits} • rep ${d.reputation}`;
  pTags.innerHTML = '';
  for(const s of (d.specialties||[]).slice(0,6)){
    const t = document.createElement('span');
    t.className='tag';
    t.textContent = s;
    pTags.appendChild(t);
  }
  const h = Math.max(0, Math.min(100, Math.round(d.happiness_sim ?? 50)));
  pHappy.style.width = h + '%';
  pHappyVal.textContent = String(h);
}

function onPointerMove(e){
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
}

function onClick(){
  if(hovered){
    clickFx();
    setPanel(hovered);
    // also focus camera a bit
    const pos = hovered.meshGroup.position.clone();
    controls.target.lerp(pos, 0.35);
  }
}
window.addEventListener('pointermove', onPointerMove);
window.addEventListener('click', onClick);

function buildEnv(){
  // Procedural HDR-ish environment (canvas gradient) to make glass feel 3D.
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0,0,0,c.height);
  g.addColorStop(0,'#0b1030');
  g.addColorStop(0.35,'#060a1e');
  g.addColorStop(0.7,'#040612');
  g.addColorStop(1,'#02030a');
  ctx.fillStyle = g; ctx.fillRect(0,0,c.width,c.height);
  // neon band
  ctx.globalAlpha = 0.35;
  const g2 = ctx.createRadialGradient(380, 70, 10, 380, 70, 240);
  g2.addColorStop(0,'#00ffff');
  g2.addColorStop(1,'transparent');
  ctx.fillStyle = g2; ctx.fillRect(0,0,c.width,c.height);
  ctx.globalAlpha = 0.28;
  const g3 = ctx.createRadialGradient(120, 120, 10, 120, 120, 260);
  g3.addColorStop(0,'#b400ff');
  g3.addColorStop(1,'transparent');
  ctx.fillStyle = g3; ctx.fillRect(0,0,c.width,c.height);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.mapping = THREE.EquirectangularReflectionMapping;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(tex).texture;
  scene.environment = env;
  scene.background = null;
  pmrem.dispose();
}

function buildPost(){
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.05, 0.55, 0.14);
  composer.addPass(bloomPass);
  // SMAA removed (vendoring minimized dependencies)
}

function renderMap(){
  const q = (searchEl?.value || '').trim().toLowerCase();
  mapList.innerHTML = '';
  const filtered = minionList.filter(m => !q || (m.id||'').toLowerCase().includes(q) || (m.role||'').toLowerCase().includes(q));
  filtered.slice(0,80).forEach(m=>{
    const row = document.createElement('div');
    row.style.display='flex';
    row.style.gap='10px';
    row.style.alignItems='center';
    row.style.justifyContent='space-between';
    row.style.padding='10px';
    row.style.border='1px solid rgba(255,255,255,.14)';
    row.style.background='rgba(255,255,255,.06)';
    row.style.borderRadius='12px';

    const left = document.createElement('div');
    left.innerHTML = `<div style="font-weight:800">${m.id}</div><div style="color:rgba(255,255,255,.72);font-size:12px">Tier ${m.tier} • ${m.role} • ${(m.specialties||[]).slice(0,2).join(' • ')}</div>`;

    const btn = document.createElement('button');
    btn.className='btn';
    btn.textContent='Teleport';
    btn.onclick = ()=>{ teleportFx(); focusPodById(m.id); mapEl.style.display='none'; };

    row.appendChild(left);
    row.appendChild(btn);
    mapList.appendChild(row);
  });
}

btnMap?.addEventListener('click', ()=>{ mapEl.style.display = 'block'; openFx(); renderMap(); });
btnCloseMap?.addEventListener('click', ()=>{ mapEl.style.display = 'none'; closeFx(); });
btnFocusAtlas?.addEventListener('click', ()=>{ clickFx(); focusPodById('ATLAS'); });
searchEl?.addEventListener('input', renderMap);

async function loadData(){
  statusEl.textContent = 'loading minions…';
  buildEnv();
  buildPost();
  const [minionsRes, agoraRes] = await Promise.all([
    fetch(MINIONS_URL + '?ts=' + Date.now(), {cache:'no-store'}),
    fetch(AGORA_URL + '?ts=' + Date.now(), {cache:'no-store'})
  ]);
  const minions = minionsRes.ok ? await minionsRes.json() : {minions:[]};
  const agora = agoraRes.ok ? await agoraRes.json() : {messages:[]};

  const list = (minions.minions||[]);
  minionList = list;
  statusEl.textContent = `realm online • pods ${list.length} • comms ${(agora.messages||[]).length}`;

  // build pods (await so hologram textures load)
  for(let i=0;i<list.length;i++){
    const m = list[i];
    const meshGroup = await makePod(m, i, list.length);
    const obj = { id: (m.id||'').toUpperCase(), meshGroup, data: m };
    pods.push(obj);
    podById.set(obj.id, obj);
  }

  // links/packets from agora
  rebuildLinks(agora.messages||[]);
  renderMap();
}

function animate(tms){
  requestAnimationFrame(animate);
  const t = tms*0.001;

  // keyboard navigation: move target + camera together (feels like flying the rig)
  const dt = 1/60;
  // tuned for mobile touch + WASD on Chrome Android
  const speed = (keys.has('shift') ? 16 : 8) * dt;
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0,1,0)).normalize();

  const move = new THREE.Vector3();
  if(keys.has('w')) move.add(forward);
  if(keys.has('s')) move.sub(forward);
  if(keys.has('d')) move.add(right);
  if(keys.has('a')) move.sub(right);
  if(keys.has('q')) move.y -= 1;
  if(keys.has('e')) move.y += 1;

  if(move.lengthSq() > 0){
    move.normalize().multiplyScalar(speed);
    controls.target.add(move);
    camera.position.add(move);
  }

  controls.update();

  // subtle pod bob + hologram shimmer
  for(const p of pods){
    const g = p.meshGroup;
    g.position.y = (g.userData?.id==='ATLAS'?0.9:g.position.y);
    g.position.y += Math.sin(t*1.2 + g.position.x*0.2 + g.position.z*0.2) * 0.002;
    g.rotation.y = Math.sin(t*0.6 + g.position.x*0.1) * 0.12;

    const holo = g.userData?.holo;
    if(holo){
      const wob = 0.03*Math.sin(t*2.2 + g.position.x*0.15);
      holo.sprite.material.opacity = 0.78 + 0.10*Math.sin(t*1.7 + g.position.z*0.2);
      holo.glow.material.opacity = 0.16 + 0.07*Math.sin(t*2.6 + g.position.x*0.2);
      holo.scan.rotation.z = t*0.25;
      holo.scan.material.opacity = 0.05 + 0.05*Math.max(0, Math.sin(t*3.2 + g.position.x*0.2));
      holo.sprite.position.y = 0.15 + wob;
      holo.glow.position.y = holo.sprite.position.y;
      holo.scan.position.y = holo.sprite.position.y;
    }
  }

  // raycast hover
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(scene.children, true);
  let found = null;
  for(const it of intersects){
    const root = it.object?.parent;
    if(root?.userData?.type==='pod'){
      const id = (root.userData.id||'').toUpperCase();
      found = podById.get(id) || null;
      break;
    }
  }
  hovered = found;
  canvas.style.cursor = hovered ? 'pointer' : 'default';

  // move packets (with subtle beeps when they arrive)
  for(const p of packets){
    p.t = (p.t + p.speed*0.01) % 1;
    p.mesh.position.lerpVectors(p.a, p.b, p.t);
    // tiny arc
    p.mesh.position.y += Math.sin(p.t*Math.PI) * 0.4;
    if(p.t > p.nextBeep){
      packetFx();
      p.nextBeep = p.t + 0.25 + Math.random()*0.35;
    }
  }

  composer.render();
}

loadData().then(()=>animate(0)).catch(err=>{
  statusEl.textContent = 'failed to load realm data';
  console.error(err);
});
