// The tt's pink oven bakery: a low-poly room in metres. The counter is on the left (customers
// queue outside it), cookies are on the back wall and the boba bar is on the right wall.
import * as THREE from 'three';
import { ITEMS, ITEM } from './items.js';

export const PALETTE = {
  hot: '#ff4f9a',
  rose: '#ff8fc7',
  blush: '#ffc2dd',
  cream: '#fff3e6',
  plum: '#3a0d27',
  wood: '#e7b98f',
};

// ---- layout (x right, z towards the camera)
export const SLOT_Z = [-1.7, 0, 1.7]; // customer spots along the counter, back to front
export const CUSTOMER_X = -4.05; // where customers stand, outside the counter
export const SERVE_X = -2.25; // where the baker stands to serve, inside the counter
export const DOOR = new THREE.Vector3(-5.8, 0, 4.2); // customers come in and leave here
export const PLAYER_START = new THREE.Vector3(0.6, 0, 0.4);
export const BOUNDS = { minX: -2.3, maxX: 4.1, minZ: -2.3, maxZ: 2.6 };

const COOKIE_X = [-1.25, 0.15, 1.55];
const BOBA_Z = [-1.75, -0.4, 0.95];

/** Where the baker walks to for each station, and which way they face there. */
export const STATIONS = [
  ...ITEMS.filter((i) => i.kind === 'cookie').map((item, n) => ({
    id: item.id, item: item.id, key: item.key, label: item.name,
    stand: new THREE.Vector3(COOKIE_X[n], 0, -2.2), face: Math.PI,
    hit: new THREE.Vector3(COOKIE_X[n], 0.6, -3.0), hitSize: [1.15, 1.4, 0.9],
  })),
  ...ITEMS.filter((i) => i.kind === 'boba').map((item, n) => ({
    id: item.id, item: item.id, key: item.key, label: item.name,
    stand: new THREE.Vector3(3.95, 0, BOBA_Z[n]), face: Math.PI / 2,
    hit: new THREE.Vector3(4.75, 0.9, BOBA_Z[n]), hitSize: [0.9, 1.8, 1.15],
  })),
  {
    id: 'bin', item: null, key: 'X', label: 'Bin',
    stand: new THREE.Vector3(3.6, 0, 2.25), face: Math.PI / 2,
    hit: new THREE.Vector3(4.3, 0.4, 2.55), hitSize: [0.8, 0.9, 0.8],
  },
];

const mats = new Map();
function mat(color, rough = 0.75, metal = 0, extra = {}) {
  const key = `${color}|${rough}|${metal}|${JSON.stringify(extra)}`;
  if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra }));
  return mats.get(key);
}
function box(w, h, d, m, x, y, z) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  return o;
}
function cyl(rt, rb, h, m, x, y, z, seg = 24) {
  const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  return o;
}
/** A rounded box, for soft low-poly furniture. */
function roundBox(w, h, d, r, m, x, y, z) {
  const shape = new THREE.Shape();
  const hw = w / 2 - r, hh = h / 2 - r;
  shape.moveTo(-hw, -h / 2);
  shape.lineTo(hw, -h / 2);
  shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -hh);
  shape.lineTo(w / 2, hh);
  shape.quadraticCurveTo(w / 2, h / 2, hw, h / 2);
  shape.lineTo(-hw, h / 2);
  shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, hh);
  shape.lineTo(-w / 2, -hh);
  shape.quadraticCurveTo(-w / 2, -h / 2, -hw, -h / 2);
  const g = new THREE.ExtrudeGeometry(shape, { depth: d - 2 * r, bevelEnabled: true, bevelSize: r, bevelThickness: r, bevelSegments: 3, curveSegments: 6 });
  g.translate(0, 0, -(d - 2 * r) / 2);
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  return o;
}

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// ---- menu items as 3D models (about 18 cm cookies, 22 cm cups)
const itemCache = new Map();
export function makeItem(id) {
  const it = ITEM[id];
  const g = new THREE.Group();
  if (it.kind === 'cookie') {
    const cookie = cyl(0.085, 0.09, 0.03, mat(it.dough, 0.85), 0, 0.015, 0, 18);
    cookie.scale.set(1, 1, 1);
    g.add(cookie);
    const bitM = mat(it.bits, 0.6);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.4;
      const r = i % 2 ? 0.045 : 0.025;
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.012, 0), bitM);
      b.position.set(Math.cos(a) * r, 0.033, Math.sin(a) * r);
      b.castShadow = true;
      g.add(b);
    }
  } else {
    const cupM = mat('#fff7fb', 0.2, 0, { transparent: true, opacity: 0.55 });
    const cup = cyl(0.058, 0.045, 0.17, cupM, 0, 0.085, 0, 20);
    g.add(cup);
    g.add(cyl(0.054, 0.043, 0.135, mat(it.tea, 0.5), 0, 0.075, 0, 20));
    const pearlM = mat('#2a1a10', 0.3);
    for (let i = 0; i < 6; i++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), pearlM);
      const a = (i / 6) * Math.PI * 2;
      p.position.set(Math.cos(a) * 0.025, 0.02, Math.sin(a) * 0.025);
      g.add(p);
    }
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), cupM);
    lid.position.y = 0.17;
    lid.scale.y = 0.45;
    g.add(lid);
    const straw = cyl(0.007, 0.007, 0.16, mat(PALETTE.hot, 0.4), 0.015, 0.23, 0, 8);
    straw.rotation.z = -0.15;
    g.add(straw);
  }
  return g;
}

/** Builds the bakery. Returns { group, hitboxes, update(t), labelAnchors }. */
export function buildBakery() {
  const group = new THREE.Group();

  // floor: soft pink and cream checks
  const floorTex = canvasTexture(256, 256, (c, w, h) => {
    c.fillStyle = '#fff4ec';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#ffd8e7';
    c.fillRect(0, 0, w / 2, h / 2);
    c.fillRect(w / 2, h / 2, w / 2, h / 2);
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(9, 7);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(13, 10), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.85 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(-0.5, 0, 0.6);
  floor.receiveShadow = true;
  group.add(floor);

  // street outside the counter: a warm pavement strip
  const street = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 10), mat('#f3d6c4', 0.95));
  street.rotation.x = -Math.PI / 2;
  street.position.set(-5.3, 0.002, 0.6);
  street.receiveShadow = true;
  group.add(street);

  // walls
  const wallM = mat('#ffc6dc', 0.9);
  const wainM = mat('#ff9cc6', 0.85);
  const trimM = mat(PALETTE.cream, 0.6);
  group.add(box(10.6, 3.4, 0.2, wallM, 0.35, 1.7, -3.65));
  group.add(box(10.6, 1.0, 0.24, wainM, 0.35, 0.5, -3.62));
  group.add(box(10.6, 0.06, 0.28, trimM, 0.35, 1.02, -3.6));
  // right wall: hidden on phones in portrait, where the camera looks in from this side
  const rightWall = [
    box(0.2, 3.4, 7.6, mat('#ffd3e4', 0.9), 5.55, 1.7, -0.05),
    box(0.24, 1.0, 7.6, wainM, 5.52, 0.5, -0.05),
    box(0.28, 0.06, 7.6, trimM, 5.5, 1.02, -0.05),
  ];
  group.add(...rightWall);

  // neon-ish sign on the back wall
  const signTex = canvasTexture(1024, 256, (c, w, h) => {
    c.fillStyle = '#3a0d27';
    c.beginPath();
    c.roundRect(8, 8, w - 16, h - 16, 60);
    c.fill();
    c.font = 'italic 800 118px "Segoe UI", system-ui, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.shadowColor = '#ff4f9a';
    c.shadowBlur = 28;
    c.fillStyle = '#ffd1e8';
    c.fillText("tt's pink oven", w / 2, h / 2 + 6);
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.85), new THREE.MeshStandardMaterial({ map: signTex, emissive: '#ff4f9a', emissiveMap: signTex, emissiveIntensity: 0.35, roughness: 0.5 }));
  sign.position.set(0.15, 2.55, -3.53);
  group.add(sign);

  // counter along the left, with a glass cake display
  const counterM = mat(PALETTE.hot, 0.6);
  group.add(roundBox(0.9, 1.0, 5.6, 0.05, counterM, -3.05, 0.5, 0));
  group.add(box(1.08, 0.08, 5.8, mat(PALETTE.cream, 0.4), -3.05, 1.04, 0));
  for (const z of [-2.5, -0.85, 0.85, 2.5]) group.add(box(0.94, 0.06, 0.06, trimM, -3.05, 0.25, z));
  const glass = box(0.7, 0.32, 0.9, mat('#ffffff', 0.05, 0, { transparent: true, opacity: 0.25 }), -3.05, 1.24, -0.85);
  glass.castShadow = false;
  group.add(glass);
  for (let i = 0; i < 3; i++) {
    const cake = cyl(0.11, 0.11, 0.1, mat(['#ff8fc7', '#fff3e6', '#c99a6b'][i], 0.7), -3.05, 1.14, -1.15 + i * 0.3, 16);
    group.add(cake);
    group.add(cyl(0.03, 0.03, 0.04, mat('#e8344f', 0.4), -3.05, 1.21, -1.15 + i * 0.3, 10));
  }
  // till
  group.add(box(0.36, 0.22, 0.3, mat('#3a0d27', 0.5), -3.05, 1.19, 1.2));
  group.add(box(0.3, 0.14, 0.02, mat('#ffd1e8', 0.3, 0, { emissive: '#ff8fc7', emissiveIntensity: 0.4 }), -2.92, 1.33, 1.2));

  // cookie cabinets on the back wall
  const cabM = mat('#ffe7f0', 0.7);
  const trayM = mat(PALETTE.wood, 0.7);
  const labelAnchors = {};
  STATIONS.filter((s) => ITEM[s.item]?.kind === 'cookie').forEach((s) => {
    const x = s.hit.x;
    group.add(roundBox(1.15, 0.95, 0.75, 0.05, cabM, x, 0.475, -3.1));
    group.add(box(1.17, 0.05, 0.77, mat(PALETTE.rose, 0.6), x, 0.97, -3.1));
    group.add(box(0.9, 0.03, 0.5, trayM, x, 1.0, -3.05));
    for (let i = 0; i < 6; i++) {
      const c = makeItem(s.item);
      c.position.set(x - 0.3 + (i % 3) * 0.3, 1.02, -3.18 + Math.floor(i / 3) * 0.24);
      group.add(c);
    }
    // little handle doors
    for (const dx of [-0.27, 0.27]) group.add(box(0.48, 0.7, 0.02, mat('#ffd3e4', 0.7), x + dx, 0.47, -2.715));
    labelAnchors[s.id] = new THREE.Vector3(x, 1.55, -3.0);
  });

  // boba bar on the right wall: a tea tank per flavour
  STATIONS.filter((s) => ITEM[s.item]?.kind === 'boba').forEach((s) => {
    const z = s.hit.z;
    const it = ITEM[s.item];
    group.add(roundBox(0.85, 0.95, 1.15, 0.05, cabM, 4.95, 0.475, z));
    group.add(box(0.87, 0.05, 1.17, mat(PALETTE.rose, 0.6), 4.95, 0.97, z));
    const tank = cyl(0.2, 0.2, 0.55, mat('#ffffff', 0.05, 0, { transparent: true, opacity: 0.35 }), 5.05, 1.3, z);
    tank.castShadow = false;
    group.add(tank);
    group.add(cyl(0.185, 0.185, 0.4, mat(it.tea, 0.4), 5.05, 1.24, z));
    group.add(cyl(0.21, 0.21, 0.05, mat(PALETTE.plum, 0.5), 5.05, 1.6, z));
    group.add(box(0.08, 0.08, 0.1, mat(PALETTE.plum, 0.5), 4.83, 1.08, z));
    for (const dz of [-0.36, 0.36]) {
      const cup = makeItem(s.item);
      cup.position.set(4.75, 0.995, z + dz);
      group.add(cup);
    }
    labelAnchors[s.id] = new THREE.Vector3(4.85, 2.0, z);
  });

  // bin
  group.add(cyl(0.24, 0.2, 0.6, mat('#ff8fc7', 0.6), 4.3, 0.3, 2.55));
  group.add(cyl(0.26, 0.26, 0.05, mat(PALETTE.plum, 0.5), 4.3, 0.62, 2.55));
  labelAnchors.bin = new THREE.Vector3(4.3, 1.05, 2.55);

  // the pink oven itself, in the back right corner, glowing
  const ovenM = mat(PALETTE.hot, 0.45);
  group.add(roundBox(1.2, 1.5, 0.9, 0.08, ovenM, 4.55, 0.75, -2.95));
  const glow = box(0.8, 0.45, 0.02, mat('#ffb067', 0.4, 0, { emissive: '#ff8a3d', emissiveIntensity: 1.2 }), 4.55, 0.85, -2.49);
  group.add(glow);
  group.add(box(0.95, 0.06, 0.06, mat(PALETTE.cream, 0.4, 0.3), 4.55, 1.2, -2.47));
  for (const dx of [-0.35, -0.1, 0.15]) group.add(cyl(0.035, 0.035, 0.03, mat(PALETTE.cream, 0.4), 4.55 + dx, 1.35, -2.49));
  const ovenLight = new THREE.PointLight('#ff9a52', 2.2, 3.5, 2);
  ovenLight.position.set(4.55, 0.9, -2.2);
  group.add(ovenLight);

  // pendant lamps
  const lampM = mat(PALETTE.cream, 0.5);
  const lamps = new THREE.Group(); // hidden on phones in portrait, where they'd block the view
  for (const x of [-1.2, 1.4, 3.6]) {
    lamps.add(cyl(0.006, 0.006, 0.9, mat('#3a0d27'), x, 3.05, 0.2, 6));
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.25, 20, 1, true), lampM);
    shade.position.set(x, 2.5, 0.2);
    lamps.add(shade);
    lamps.add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), mat('#fff3d6', 0.3, 0, { emissive: '#fff0c8', emissiveIntensity: 1.5 })).translateX(x).translateY(2.42).translateZ(0.2));
  }
  group.add(lamps);

  // plants
  for (const [x, z] of [[-2.6, -3.2], [5.15, 2.9]]) {
    group.add(cyl(0.18, 0.14, 0.35, mat('#fff3e6', 0.7), x, 0.175, z));
    for (let i = 0; i < 5; i++) {
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.17, 0), mat('#7bc79a', 0.8));
      leaf.position.set(x + Math.cos(i * 1.3) * 0.12, 0.5 + (i % 2) * 0.15, z + Math.sin(i * 1.3) * 0.12);
      leaf.castShadow = true;
      group.add(leaf);
    }
  }

  // invisible boxes for clicking stations
  const hitM = new THREE.MeshBasicMaterial({ visible: false });
  const hitboxes = STATIONS.map((s) => {
    const h = new THREE.Mesh(new THREE.BoxGeometry(...s.hitSize), hitM);
    h.position.copy(s.hit);
    h.userData = { kind: 'station', id: s.id };
    group.add(h);
    return h;
  });

  function update(t) {
    glow.material.emissiveIntensity = 1.1 + Math.sin(t * 2.3) * 0.25;
    ovenLight.intensity = 2 + Math.sin(t * 2.3) * 0.4;
  }

  return { group, hitboxes, update, labelAnchors, rightWall: [...rightWall, lamps] };
}

/** Bakery lights: warm key light with soft shadows, pink bounce, cream fill. */
export function addLights(scene) {
  scene.add(new THREE.HemisphereLight('#fff6f0', '#ffb7cf', 1.25));
  const key = new THREE.DirectionalLight('#fff1e2', 2.1);
  key.position.set(3.5, 8, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 5;
  key.shadow.normalBias = 0.03;
  Object.assign(key.shadow.camera, { left: -8, right: 8, top: 7, bottom: -7, near: 1, far: 22 });
  key.shadow.camera.updateProjectionMatrix();
  scene.add(key);
  const fill = new THREE.DirectionalLight('#ffd6ea', 0.7);
  fill.position.set(-6, 4, 3);
  scene.add(fill);
}
