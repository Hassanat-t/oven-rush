// Pink Oven Rush: the page. Sets up the 3D bakery, the player's start.ng character as the baker,
// the menu, the HUD and the start.ng sign-in and leaderboard.
import * as THREE from 'three';
import { buildHuman, normalizeStyle } from './human.js';
import { buildBakery, addLights, STATIONS, SLOT_Z, CUSTOMER_X, PLAYER_START, PALETTE } from './world.js';
import { Shift, TRAY_SIZE, HEARTS } from './game.js';
import { ITEM, itemColor } from './items.js';
import * as startng from './platform.js';

const $ = (id) => document.getElementById(id);
const DEBUG = new URLSearchParams(location.search).has('debug');

// Used only when start.ng can't be reached (a local file or localhost). On start.ng, guests get
// start.ng's own shared guest look instead.
const LOCAL_GUEST = {
  name: 'Guest',
  style: { body: 'female', primaryColor: '#fff3e6', secondaryColor: '#3a0d27', skinColor: '#a0662f', hairColor: '#17120f', hair: 'bun', hat: 'none', accessory: 'none' },
  face: null,
};

// Game-only extra: the apron colour (everything else comes from start.ng)
const APRONS = [
  { id: 'pink', colour: PALETTE.hot, name: 'Hot pink' },
  { id: 'cream', colour: '#fff3e6', name: 'Cream' },
  { id: 'mint', colour: '#9fe8c7', name: 'Mint' },
  { id: 'plum', colour: '#3a0d27', name: 'Plum' },
];

const state = {
  screen: 'menu', // menu | play | end
  user: null, // the signed-in start.ng user, or null
  guest: null, // start.ng's guest look, once known
  checked: false, // has start.ng answered at least once?
  apron: APRONS[0],
  pendingLook: false,
};

/** The look the baker should have: the signed-in player's, or the guest's. */
function currentPlayer() {
  if (state.user) return { name: state.user.name, account: state.user.account, style: state.user.style, face: state.user.face };
  const g = state.guest ?? LOCAL_GUEST;
  return { name: g.name ?? 'Guest', account: null, style: g.style, face: g.face };
}

// ---------------------------------------------------------------- 3D
const canvas = $('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: DEBUG });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#ffd8e7');
addLights(scene);
const bakery = buildBakery();
scene.add(bakery.group);

const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 80);
const VIEWS = {
  menu: { pos: new THREE.Vector3(1.55, 1.6, 3.5), look: new THREE.Vector3(0.25, 1.0, 0.3), hfov: 0 },
  play: { pos: new THREE.Vector3(0.75, 8.8, 7.6), look: new THREE.Vector3(0.35, 0.1, -0.2), hfov: 63 },
  // phones held upright: look in from the boba bar side, so customers face the camera at the top
  playTall: { pos: new THREE.Vector3(9.4, 11.2, -0.25), look: new THREE.Vector3(-1.35, 0.2, -0.25), hfov: 0, vfov: 60 },
};
const tall = () => camera.aspect < 0.8;
/** The view to use for a screen, picking the phone version when the screen is tall. */
const resolveView = (name) => (name === 'play' && tall() ? VIEWS.playTall : VIEWS[name]);
const cam = { from: VIEWS.menu, name: 'menu', t: 1 };
function setView(name) {
  cam.from = { pos: camera.position.clone(), look: cam.look?.clone() ?? VIEWS.menu.look.clone(), fov: camera.fov };
  cam.name = name;
  cam.t = 0;
}
function viewFov(v) {
  const aspect = camera.aspect;
  if (v.vfov) return v.vfov;
  if (!v.hfov) return aspect < 1 ? 58 : 40; // menu
  const vf = (2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(v.hfov) / 2) / aspect) * 180) / Math.PI;
  return THREE.MathUtils.clamp(vf, 34, 88);
}
function updateCamera(dt) {
  cam.t = Math.min(1, cam.t + dt / 0.9);
  const k = cam.t < 1 ? 1 - Math.pow(1 - cam.t, 3) : 1;
  const to = resolveView(cam.name ?? 'menu');
  for (const w of bakery.rightWall) w.visible = to !== VIEWS.playTall;
  const toFov = viewFov(to);
  const from = cam.from;
  const fromLook = from.look ?? to.look;
  // phones in portrait: pull the menu camera back a bit so the baker fits beside the card
  const menuShift = to === VIEWS.menu && camera.aspect < 1 ? new THREE.Vector3(0.6, 0.35, 1.6) : new THREE.Vector3();
  camera.position.lerpVectors(from.pos, to.pos.clone().add(menuShift), k);
  cam.look = new THREE.Vector3().lerpVectors(fromLook, to.look, k);
  camera.fov = THREE.MathUtils.lerp(from.fov ?? toFov, toFov, k);
  camera.updateProjectionMatrix();
  camera.lookAt(cam.look);
}
camera.position.copy(VIEWS.menu.pos);
cam.look = VIEWS.menu.look.clone();

// ---- the baker: the player's start.ng character with a game-only apron and a tray
let baker;
const tray = new THREE.Group();
{
  const trayM = new THREE.MeshStandardMaterial({ color: PALETTE.hot, roughness: 0.55 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.022, 0.28), trayM);
  base.castShadow = true;
  tray.add(base);
  for (const [w, d, x, z] of [[0.46, 0.012, 0, 0.14], [0.46, 0.012, 0, -0.14], [0.012, 0.28, 0.23, 0], [0.012, 0.28, -0.23, 0]]) {
    const rim = new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, d), trayM);
    rim.position.set(x, 0.02, z);
    tray.add(rim);
  }
}

function makeApron(colour, female) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: colour, roughness: 0.8 });
  const strapM = new THREE.MeshStandardMaterial({ color: colour === '#3a0d27' ? '#ff8fc7' : '#3a0d27', roughness: 0.7 });
  const s = new THREE.Shape();
  const top = 0.1, bot = 0.17, h = 0.56;
  s.moveTo(-bot, 0);
  s.lineTo(bot, 0);
  s.quadraticCurveTo(bot + 0.01, h * 0.45, top + 0.02, h * 0.62);
  s.lineTo(top, h);
  s.lineTo(-top, h);
  s.lineTo(-top - 0.02, h * 0.62);
  s.quadraticCurveTo(-bot - 0.01, h * 0.45, -bot, 0);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.004, bevelSegments: 2 });
  const apron = new THREE.Mesh(geo, m);
  apron.castShadow = true;
  apron.position.set(0, -0.15, female ? 0.104 : 0.122);
  apron.rotation.x = -0.06;
  g.add(apron);
  // pocket with a little cookie badge
  const pocketM = new THREE.MeshStandardMaterial({ color: new THREE.Color(colour).offsetHSL(0, 0, colour === '#3a0d27' ? 0.12 : -0.1), roughness: 0.8 });
  const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.008), pocketM);
  pocket.position.set(0, 0.0, female ? 0.122 : 0.14);
  g.add(pocket);
  // waist ties and neck strap
  const tie = new THREE.Mesh(new THREE.TorusGeometry(female ? 0.135 : 0.15, 0.008, 6, 24, Math.PI), strapM);
  tie.rotation.set(Math.PI / 2, 0, Math.PI);
  tie.position.set(0, 0.06, 0.0);
  tie.scale.set(1, female ? 0.72 : 0.78, 1);
  g.add(tie);
  const neck = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.008, 6, 20, Math.PI), m);
  neck.position.set(0, female ? 0.43 : 0.47, 0.03);
  neck.rotation.x = -0.5;
  g.add(neck);
  return g;
}

function rebuildBaker() {
  const p = currentPlayer();
  const keep = baker ? { pos: baker.root.position.clone(), rot: baker.root.rotation.y } : null;
  if (baker) {
    scene.remove(baker.root);
    baker.dispose();
  }
  baker = buildHuman(p.style);
  baker.spine.add(makeApron(state.apron.colour, baker.female));
  tray.position.set(0, 1.02, 0.36);
  baker.root.add(tray);
  baker.root.userData = { kind: 'baker' };
  if (keep) {
    baker.root.position.copy(keep.pos);
    baker.root.rotation.y = keep.rot;
  } else baker.root.position.copy(PLAYER_START);
  scene.add(baker.root);
  if (shift) shift.baker = baker;
  state.pendingLook = false;
}

// ---------------------------------------------------------------- the shift
let shift;
rebuildBaker();
shift = new Shift({ scene, baker, tray, onEvent });

// ---------------------------------------------------------------- overlay labels
const labels = $('labels');
const v3 = new THREE.Vector3();
function project(p) {
  v3.copy(p).project(camera);
  return { x: (v3.x * 0.5 + 0.5) * innerWidth, y: (-v3.y * 0.5 + 0.5) * innerHeight, behind: v3.z > 1 };
}
function place(el, p, dx = 0, dy = 0) {
  const s = project(p);
  el.style.transform = `translate(${s.x + dx}px, ${s.y + dy}px) translate(-50%, -100%)`;
  el.style.visibility = s.behind ? 'hidden' : 'visible';
}

const stationLabels = STATIONS.map((st) => {
  const b = document.createElement('button');
  b.className = 'label station';
  const colour = st.item ? itemColor(st.item) : '#3a0d27';
  b.innerHTML = `<kbd>${st.key}</kbd><i style="background:${colour}"></i><span class="nm">${st.label}</span>`;
  b.title = st.item ? `Pick up ${st.label} (${st.key})` : 'Empty the tray (X)';
  b.addEventListener('click', () => shift.command({ kind: 'station', id: st.id }));
  labels.append(b);
  return { st, el: b, anchor: bakery.labelAnchors[st.id] };
});

const SLOT_KEYS = ['Q', 'W', 'E'];
const tickets = SLOT_Z.map((z, slot) => {
  const ticket = document.createElement('button');
  ticket.className = 'label ticket';
  ticket.hidden = true;
  ticket.addEventListener('click', () => shift.command({ kind: 'customer', slot }));
  const bubble = document.createElement('div');
  bubble.className = 'label bubble';
  bubble.hidden = true;
  labels.append(ticket, bubble);
  return { ticket, bubble, anchor: new THREE.Vector3(CUSTOMER_X, 2.08, z) };
});

function renderTicket(slot) {
  const c = shift.slots[slot];
  const t = tickets[slot].ticket;
  if (!c || c.state !== 'waiting') {
    t.hidden = true;
    return;
  }
  const left = [...c.remaining];
  const rows = c.order.map((id) => {
    const at = left.indexOf(id);
    const done = at === -1;
    if (!done) left.splice(at, 1);
    return `<li class="${done ? 'done' : ''}"><i style="background:${itemColor(id)}"></i>${ITEM[id].icon} ${ITEM[id].name}</li>`;
  });
  t.innerHTML = `<div class="who"><span>${escapeHtml(c.def.name)}</span><kbd>${SLOT_KEYS[slot]}</kbd></div><ul>${rows.join('')}</ul><div class="patience"><b></b></div>`;
  t.title = `Serve ${c.def.name} (${SLOT_KEYS[slot]})`;
  t.hidden = state.screen !== 'play';
}

function updateLabels() {
  const playing = state.screen === 'play';
  labels.hidden = !playing && state.screen !== 'end';
  for (const s of stationLabels) {
    s.el.hidden = !playing;
    if (playing) place(s.el, s.anchor);
  }
  tickets.forEach(({ ticket, bubble, anchor }, slot) => {
    const c = shift.slots[slot];
    const pos = c ? c.human.root.position.clone().setY(2.08) : anchor;
    if (!ticket.hidden) {
      place(ticket, pos, 0, tall() && slot === 1 ? -58 : 0); // stagger the middle ticket on phones
      ticket.style.zIndex = slot === 1 ? 2 : 1;
      const frac = Math.max(0, c.patience / c.patienceMax);
      const bar = ticket.querySelector('.patience');
      bar.firstChild.style.transform = `scaleX(${frac})`;
      bar.className = `patience${frac < 0.3 ? ' low' : frac < 0.6 ? ' mid' : ''}`;
      ticket.classList.toggle('hurry', frac < 0.25);
    }
    if (!bubble.hidden) {
      const anyC = c ?? shift.leaving.find((l) => l.slot === slot && l.line);
      if (anyC) place(bubble, anyC.human.root.position.clone().setY(tall() ? -0.2 : 1.25), 0, 0);
      else bubble.hidden = true;
    }
  });
}

function popup(text, at, cls = '') {
  const s = project(at);
  const el = document.createElement('div');
  el.className = `popup ${cls}`;
  el.textContent = text;
  el.style.left = `${s.x}px`;
  el.style.top = `${s.y}px`;
  labels.append(el);
  setTimeout(() => el.remove(), 1200);
}

function marker(at) {
  const s = project(at);
  const el = document.createElement('div');
  el.className = 'marker';
  el.style.left = `${s.x}px`;
  el.style.top = `${s.y}px`;
  labels.append(el);
  setTimeout(() => el.remove(), 650);
}

function toast(text) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  $('toasts').append(el);
  setTimeout(() => el.remove(), 2300);
}

// ---------------------------------------------------------------- HUD
let shownSecond = -1;
function renderHud() {
  const s = Math.ceil(shift.time);
  if (s !== shownSecond) {
    shownSecond = s;
    $('hud-time').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    $('hud-time').parentElement.classList.toggle('low', s <= 10 && shift.running);
  }
}
function renderStats() {
  $('hud-score').textContent = shift.score.toLocaleString();
  $('hud-hearts').innerHTML = '♥'.repeat(Math.max(0, shift.hearts)) + `<span class="lost">${'♥'.repeat(HEARTS - Math.max(0, shift.hearts))}</span>`;
  const combo = $('hud-combo');
  combo.hidden = shift.combo < 2;
  combo.textContent = `×${shift.combo} combo`;
}
function renderTray() {
  const slots = [];
  for (let i = 0; i < TRAY_SIZE; i++) {
    const id = shift.tray[i];
    slots.push(id
      ? `<div class="tray-slot full"><i style="background:${itemColor(id)}"></i><span class="nm">${ITEM[id].name}</span></div>`
      : '<div class="tray-slot"></div>');
  }
  $('tray-slots').innerHTML = slots.join('');
}

function onEvent(type, d) {
  switch (type) {
    case 'start':
      renderStats();
      renderTray();
      tickets.forEach((t) => { t.ticket.hidden = true; t.bubble.hidden = true; });
      break;
    case 'stats':
      renderStats();
      break;
    case 'tray':
      renderTray();
      break;
    case 'arrive':
      shift.slots[d.slot].human.root.userData = { kind: 'customer', slot: d.slot };
      break;
    case 'order':
      renderTicket(d.slot);
      break;
    case 'line': {
      const b = tickets[d.slot].bubble;
      if (!d.text) {
        b.hidden = true;
        break;
      }
      b.textContent = d.text;
      b.className = `label bubble ${d.mood ?? ''}`;
      b.hidden = false;
      break;
    }
    case 'leave': {
      tickets[d.slot].ticket.hidden = true;
      const c = shift.leaving.find((l) => l.slot === d.slot);
      if (c) c.human.root.userData = {};
      setTimeout(() => {
        if (!shift.slots[d.slot] || shift.slots[d.slot].state !== 'waiting') tickets[d.slot].bubble.hidden = true;
      }, d.mood === 'happy' ? 3200 : 2200);
      if (d.mood === 'angry') toast(`${d.name} gave up waiting. −1 ♥`);
      break;
    }
    case 'served':
      if (d.surprise) toast(`${d.name} loved it! 💖`);
      break;
    case 'wrong':
      toast("That's not on their ticket");
      break;
    case 'hurry':
      tickets[d.slot].ticket.classList.add('hurry');
      break;
    case 'popup':
      popup(d.text, d.at, `${d.big ? 'big' : ''} ${d.bad ? 'bad' : ''}`);
      break;
    case 'toast':
      toast(d.text);
      break;
    case 'target':
      marker(d.point);
      break;
    case 'end':
      setTimeout(() => showEnd(d), 1100);
      break;
  }
}

// ---------------------------------------------------------------- input
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
canvas.addEventListener('pointerdown', (e) => {
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const targets = [...bakery.hitboxes, baker.root, ...shift.slots.filter(Boolean).map((c) => c.human.root)];
  for (const hit of raycaster.intersectObjects(targets, true)) {
    let o = hit.object;
    while (o && !o.userData?.kind) o = o.parent;
    if (!o) continue;
    const u = o.userData;
    if (u.kind === 'baker') {
      if (state.screen === 'menu') baker.wave();
      continue;
    }
    if (state.screen !== 'play') return;
    if (u.kind === 'station') return shift.command({ kind: 'station', id: u.id });
    if (u.kind === 'customer') return shift.command({ kind: 'customer', slot: u.slot });
  }
});

addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (state.screen === 'play') {
    const st = STATIONS.find((s) => s.key.toLowerCase() === k);
    if (st) return shift.command({ kind: 'station', id: st.id });
    const slot = SLOT_KEYS.findIndex((s) => s.toLowerCase() === k);
    if (slot !== -1) return shift.command({ kind: 'customer', slot });
    if (k === 'p' || k === 'escape') return setPaused(!shift.paused);
  } else if ((k === 'enter') && state.screen !== 'play' && !$('menu').hidden && document.activeElement === document.body) {
    startShift();
  }
});
$('tray-bin').addEventListener('click', () => shift.command({ kind: 'station', id: 'bin' }));

function setPaused(p) {
  if (state.screen !== 'play' || !shift.running) return;
  shift.paused = p;
  $('pause').hidden = !p;
  if (p) $('resume').focus();
}
$('pause-btn').addEventListener('click', () => setPaused(true));
$('resume').addEventListener('click', () => setPaused(false));
$('quit').addEventListener('click', () => {
  $('pause').hidden = true;
  shift.paused = false;
  shift.end('quit');
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') setPaused(true);
});

// ---------------------------------------------------------------- screens
function show(screen) {
  state.screen = screen;
  $('menu').hidden = screen !== 'menu';
  $('end').hidden = screen !== 'end';
  $('hud').hidden = screen !== 'play';
  $('tray').hidden = screen !== 'play';
  if (screen !== 'play') $('pause').hidden = true;
  tickets.forEach((t, slot) => {
    if (screen === 'play') renderTicket(slot);
    else t.ticket.hidden = true;
  });
}

function startShift() {
  if (state.pendingLook) rebuildBaker();
  show('play');
  setView('play');
  shift.start();
  renderHud();
}

function toMenu() {
  shift.reset();
  if (state.pendingLook) rebuildBaker();
  tickets.forEach((t) => { t.ticket.hidden = true; t.bubble.hidden = true; });
  show('menu');
  setView('menu');
  renderMenu();
  loadBoard($('menu-board'));
}

async function showEnd(d) {
  if (state.screen !== 'play') return;
  show('end');
  const reasons = { time: "Time's up!", hearts: 'Out of hearts', quit: 'Shift ended early', debug: 'Shift over' };
  $('end-reason').textContent = reasons[d.reason] ?? 'Shift over';
  $('end-score').textContent = d.score.toLocaleString();
  $('end-orders').textContent = d.orders;
  $('end-perfect').textContent = d.perfect;
  $('end-combo').textContent = d.bestCombo;
  $('again').focus();
  const save = $('end-save');
  if (state.user) {
    save.textContent = 'Saving your shift to start.ng…';
    const r = await startng.saveRun({ score: Math.round(d.score), orders: Math.round(d.orders) });
    if (!r) save.textContent = "Couldn't save your score this time.";
    else if (r.improved) save.textContent = `New best! You're #${r.rank} on start.ng. 🎉`;
    else save.textContent = `Saved. Your best is ${r.best.toLocaleString()} (#${r.rank}).`;
  } else if (startng.START_NG) {
    save.innerHTML = 'Sign in with start.ng to save your score.<br><button class="btn primary" id="end-sign-in">Sign in with start.ng</button>';
    $('end-sign-in').addEventListener('click', startng.signIn);
  } else {
    save.textContent = 'Scores save when you play on oven-rush.start.ng.';
  }
  loadBoard($('end-board'));
}
$('again').addEventListener('click', startShift);
$('to-menu').addEventListener('click', toMenu);

// ---- menu: who's playing, and the sign-in choice
function renderMenu() {
  const greet = $('greeting');
  const auth = $('auth');
  const note = $('note');
  auth.replaceChildren();
  note.hidden = true;
  const button = (text, cls, fn) => {
    const b = document.createElement('button');
    b.className = `btn ${cls}`;
    b.textContent = text;
    b.addEventListener('click', fn);
    auth.append(b);
    return b;
  };
  if (state.user) {
    greet.innerHTML = `Hi ${escapeHtml(state.user.name)} <small>@${escapeHtml(state.user.account ?? '')}</small>`;
    button('Start shift', 'primary', startShift);
  } else if (!startng.START_NG) {
    greet.textContent = 'Playing as a guest';
    button('Start shift', 'primary', startShift);
    note.textContent = "Sign-in isn't available here. Play on oven-rush.start.ng to use your character and save scores.";
    note.hidden = false;
  } else if (startng.openedAsGuest) {
    greet.textContent = 'Playing as a guest';
    button('Start shift', 'primary', startShift);
    button('Sign in to save scores', '', startng.signIn);
  } else {
    greet.textContent = state.checked ? '' : 'Checking start.ng…';
    button('Sign in with start.ng', 'primary', startng.signIn);
    button('Play as guest', '', startShift);
  }
  renderPlayerCard();
}

function renderPlayerCard() {
  const p = currentPlayer();
  $('player').hidden = false;
  const face = $('player-face');
  if (p.face) face.src = p.face;
  else face.removeAttribute('src');
  $('player-name').textContent = p.name;
  $('player-account').textContent = state.user?.account ? `@${state.user.account}` : 'Not signed in';
}

// apron swatches (a game-only extra)
const swatches = $('apron-colours');
for (const a of APRONS) {
  const b = document.createElement('button');
  b.className = 'swatch';
  b.style.background = a.colour;
  b.title = a.name;
  b.setAttribute('role', 'radio');
  b.setAttribute('aria-checked', String(a === state.apron));
  b.setAttribute('aria-label', `${a.name} apron`);
  b.addEventListener('click', () => {
    state.apron = a;
    swatches.querySelectorAll('.swatch').forEach((s) => s.setAttribute('aria-checked', String(s === b)));
    rebuildBaker();
    baker.wave();
  });
  swatches.append(b);
}

// ---- leaderboard
async function loadBoard(list) {
  if (!startng.START_NG) {
    list.innerHTML = '<li class="empty">The leaderboard lives on oven-rush.start.ng.</li>';
    return;
  }
  list.innerHTML = '<li class="empty">Loading…</li>';
  const entries = await startng.leaderboard(10);
  if (!entries) {
    list.innerHTML = "<li class=\"empty\">Couldn't load the leaderboard.</li>";
    return;
  }
  if (!entries.length) {
    list.innerHTML = '<li class="empty">No bakers yet. Be the first!</li>';
    return;
  }
  list.replaceChildren(...entries.map((e) => {
    const li = document.createElement('li');
    if (state.user && e.player_id === state.user.id) li.className = 'me';
    const score = e.stats?.score ?? e.score ?? 0;
    const orders = e.stats?.orders;
    li.innerHTML = `<span class="rank">#${e.rank}</span><span class="name"><i style="background:${safeColour(e.color)}"></i>${escapeHtml(e.name)}</span><span class="num">${Number(score).toLocaleString()}</span><span class="sub">${orders != null ? `${orders} 🧾` : ''}</span>`;
    return li;
  }));
}

// ---- start.ng: who's playing
async function checkPlayer() {
  const who = await startng.whoami();
  state.checked = true;
  if (who !== undefined) applyPlayer(who);
  else renderMenu();
}
function applyPlayer(who) {
  const before = JSON.stringify(currentPlayer().style);
  state.user = who.user;
  if (who.guest) state.guest = who.guest;
  const changed = JSON.stringify(currentPlayer().style) !== before;
  if (changed) {
    if (state.screen === 'play') state.pendingLook = true;
    else rebuildBaker();
  }
  if (state.screen === 'menu') renderMenu();
  else renderPlayerCard();
}
startng.onPlayerChange(applyPlayer);

// ---------------------------------------------------------------- helpers
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function safeColour(c) {
  return /^#[0-9a-f]{6}$/i.test(c ?? '') ? c : PALETTE.rose;
}

// ---------------------------------------------------------------- loop
function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

const clock = new THREE.Clock();
let simT = 0; // game clock, in seconds
function frame(dt, draw = true) {
  simT += dt;
  const t = simT;
  updateCamera(dt);
  bakery.update(t);
  shift.update(dt, t);
  if (state.screen === 'play') renderHud();
  if (!draw) return;
  updateLabels();
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(() => frame(clock.getDelta()));

show('menu');
renderMenu();
loadBoard($('menu-board'));
checkPlayer();

// ?debug exposes the game for quick testing in the console
if (DEBUG) {
  window.ovenRush = {
    shift, state, startShift, toMenu, scene, camera,
    get baker() { return baker; },
    setTime: (s) => (shift.time = s),
    end: (reason = 'debug') => shift.end(reason),
    fakePlayer: (user) => applyPlayer({ user, guest: null }),
    /** Runs the game for `seconds` at 60 fps without waiting (for testing in a hidden tab). */
    step: (seconds = 1) => {
      const n = Math.round(seconds * 60);
      for (let i = 0; i < n; i++) frame(1 / 60, i === n - 1);
      return { time: +shift.time.toFixed(1), score: shift.score, hearts: shift.hearts, tray: [...shift.tray], slots: shift.slots.map((c) => c && { name: c.def.name, state: c.state, remaining: c.remaining, patience: +(c.patience / c.patienceMax).toFixed(2) }) };
    },
  };
  console.info('Pink Oven Rush debug: window.ovenRush', window.ovenRush);
}
