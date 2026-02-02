import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';
import { EffectComposer } from 'https://unpkg.com/three@0.161.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://unpkg.com/three@0.161.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://unpkg.com/three@0.161.0/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'https://unpkg.com/three@0.161.0/examples/jsm/postprocessing/SMAAPass.js';
import { OrbitControls } from 'https://unpkg.com/three@0.161.0/examples/jsm/controls/OrbitControls.js';

const canvas = document.getElementById('c');
const statusEl = document.getElementById('status');
const panel = document.getElementById('panel');
const pTitle = document.getElementById('pTitle');
const pMeta = document.getElementById('pMeta');
const pTags = document.getElementById('pTags');
const pHappy = document.getElementById('pHappy');
const pHappyVal = document.getElementById('pHappyVal');

const MINIONS_URL = './minions.json';
const AGORA_URL = './agora.json';

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x030615, 0.06);

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
camera.position.set(0, 10, 18);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setClearColor(0x02030a, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.physicallyCorrectLights = true;

let composer;
let bloomPass;
let smaaPass;

function resize(){
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w/h;
  camera.updateProjectionMatrix();
  if(composer) composer.setSize(w, h);
  if(bloomPass) bloomPass.setSize(w, h);
  if(smaaPass) smaaPass.setSize(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
}
window.addEventListener('resize', resize);
resize();

// Controls (lets it feel like a game)
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.target.set(0, 0.8, 0);
controls.minDistance = 8;
controls.maxDistance = 28;
controls.maxPolarAngle = Math.PI * 0.49;

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

function makePod(data, i, total){
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
    packets.push({ mesh: pm, a: pa.clone(), b: pb.clone(), t: Math.random(), speed: 0.15 + Math.random()*0.25 });
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
    setPanel(hovered);
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
  bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.9, 0.5, 0.18);
  composer.addPass(bloomPass);
  smaaPass = new SMAAPass(window.innerWidth * renderer.getPixelRatio(), window.innerHeight * renderer.getPixelRatio());
  composer.addPass(smaaPass);
}

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
  statusEl.textContent = `realm online • pods ${list.length} • comms ${(agora.messages||[]).length}`;

  // build pods
  list.forEach((m,i)=>{
    const meshGroup = makePod(m, i, list.length);
    const obj = { id: (m.id||'').toUpperCase(), meshGroup, data: m };
    pods.push(obj);
    podById.set(obj.id, obj);
  });

  // links/packets from agora
  rebuildLinks(agora.messages||[]);
}

function animate(tms){
  requestAnimationFrame(animate);
  const t = tms*0.001;

  // gentle idle drift (controls still allow manual orbit)
  if(!controls.dragging){
    camera.position.x += Math.sin(t*0.25) * 0.002;
    camera.position.z += Math.cos(t*0.25) * 0.002;
  }
  controls.update();

  // subtle pod bob + emissive pulse
  for(const p of pods){
    const g = p.meshGroup;
    g.position.y = (g.userData?.id==='ATLAS'?0.9:g.position.y);
    g.position.y += Math.sin(t*1.2 + g.position.x*0.2 + g.position.z*0.2) * 0.002;
    g.rotation.y = Math.sin(t*0.6 + g.position.x*0.1) * 0.12;
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

  // move packets
  for(const p of packets){
    p.t = (p.t + p.speed*0.01) % 1;
    p.mesh.position.lerpVectors(p.a, p.b, p.t);
    // tiny arc
    p.mesh.position.y += Math.sin(p.t*Math.PI) * 0.4;
  }

  composer.render();
}

loadData().then(()=>animate(0)).catch(err=>{
  statusEl.textContent = 'failed to load realm data';
  console.error(err);
});
