import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';

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

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setClearColor(0x02030a, 1);

function resize(){
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w/h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// Lights (neon)
scene.add(new THREE.AmbientLight(0x6b7cff, 0.35));
const key = new THREE.DirectionalLight(0x88ffff, 0.8);
key.position.set(10, 20, 8);
scene.add(key);
const mag = new THREE.PointLight(0xb400ff, 2.2, 80);
mag.position.set(-10, 8, -8);
scene.add(mag);
const cya = new THREE.PointLight(0x00ffff, 2.0, 80);
cya.position.set(10, 6, 10);
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

// Pod geometry (capsule-ish)
function capsuleGeometry(radius=0.55, length=1.25, segments=16){
  // Approx: cylinder + two spheres
  const g = new THREE.Group();
  const cyl = new THREE.CylinderGeometry(radius, radius, length, segments, 1, true);
  const sph = new THREE.SphereGeometry(radius, segments, segments);
  const m = new THREE.MeshBasicMaterial();
  const a = new THREE.Mesh(cyl, m);
  const b = new THREE.Mesh(sph, m);
  const c = new THREE.Mesh(sph, m);
  b.position.y = length/2;
  c.position.y = -length/2;
  g.add(a,b,c);
  // merge not needed; we’ll clone meshes per pod
  return { cyl, sph };
}
const baseGeo = capsuleGeometry();

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

  const cyl = new THREE.Mesh(baseGeo.cyl, glassMat);
  const top = new THREE.Mesh(baseGeo.sph, glassMat);
  const bot = new THREE.Mesh(baseGeo.sph, glassMat);
  top.position.y = 1.25/2;
  bot.position.y = -1.25/2;

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.05, 12, 40), edgeMat);
  ring.rotation.x = Math.PI/2;

  group.add(cyl, top, bot, ring);

  // glow sprite
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    color: 0x00f5ff,
    transparent: true,
    opacity: 0.22
  }));
  glow.scale.set(6,6,1);
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

async function loadData(){
  statusEl.textContent = 'loading minions…';
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

  // auto camera orbit
  const r = 18;
  camera.position.x = Math.cos(t*0.18) * r;
  camera.position.z = Math.sin(t*0.18) * r;
  camera.position.y = 9 + Math.sin(t*0.10)*0.5;
  camera.lookAt(0, 0.8, 0);

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

  renderer.render(scene, camera);
}

loadData().then(()=>animate(0)).catch(err=>{
  statusEl.textContent = 'failed to load realm data';
  console.error(err);
});
