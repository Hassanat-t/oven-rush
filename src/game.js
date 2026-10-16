// One shift at tt's pink oven: 90 seconds, 3 hearts. Customers queue at the counter with an
// order; the baker walks to the shelves to fill the tray (up to 3 items), then serves them.
import * as THREE from 'three';
import { buildHuman } from './human.js';
import { CUSTOMERS, say } from './characters.js';
import { ITEMS } from './items.js';
import { STATIONS, SLOT_Z, CUSTOMER_X, SERVE_X, DOOR, PLAYER_START, BOUNDS, makeItem } from './world.js';

export const SHIFT_SECONDS = 90;
export const HEARTS = 3;
export const TRAY_SIZE = 3;
const WALK_SPEED = 3.6; // m/s, the baker
const CUSTOMER_SPEED = 1.9;
const POINTS_PER_ITEM = 40;
const POINTS_PER_ORDER = 60;

const lerp = (a, b, t) => a + (b - a) * t;
const pick = (list) => list[Math.floor(Math.random() * list.length)];

export class Shift {
  /**
   * scene: where customers and the tray are added. baker: the player's human (from buildHuman),
   * already in the scene. onEvent(type, data): the UI listens here.
   */
  constructor({ scene, baker, tray, onEvent }) {
    this.scene = scene;
    this.baker = baker;
    this.trayGroup = tray;
    this.onEvent = onEvent;
    this.reset();
  }

  reset() {
    this.clearCustomers();
    this.time = SHIFT_SECONDS;
    this.hearts = HEARTS;
    this.score = 0;
    this.orders = 0;
    this.perfect = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.tray = [];
    this.slots = SLOT_Z.map(() => null);
    this.leaving = [];
    this.spawnIn = 0.8;
    this.running = false;
    this.paused = false;
    this.over = false;
    this.pos = PLAYER_START.clone();
    this.target = null;
    this.action = null;
    this.facingGoal = 0; // face the camera
    this.walk = 0;
    this.phase = 0;
    this.carry = 0;
    this.baker.root.position.copy(this.pos);
    this.baker.root.rotation.y = 0;
    this.renderTray();
  }

  start() {
    this.reset();
    this.running = true;
    this.emit('start');
    this.emit('stats');
  }

  emit(type, data) {
    this.onEvent?.(type, data);
  }

  get elapsed() {
    return SHIFT_SECONDS - this.time;
  }

  /** The player tapped or pressed a key: { kind: 'station', id } or { kind: 'customer', slot }. */
  command(cmd) {
    if (!this.running || this.paused) return;
    if (cmd.kind === 'station') {
      const st = STATIONS.find((s) => s.id === cmd.id);
      if (!st) return;
      if (st.item && this.tray.length >= TRAY_SIZE) {
        this.emit('toast', { text: 'Tray full! Serve someone or use the bin (X).', at: this.pos.clone() });
        return;
      }
      this.goTo(st.stand, st.face, { kind: 'station', st });
    } else if (cmd.kind === 'customer') {
      const c = this.slots[cmd.slot];
      if (!c || c.state !== 'waiting') return;
      this.goTo(new THREE.Vector3(SERVE_X, 0, SLOT_Z[cmd.slot]), -Math.PI / 2, { kind: 'serve', slot: cmd.slot });
    }
  }

  goTo(point, face, action) {
    this.target = new THREE.Vector3(
      THREE.MathUtils.clamp(point.x, BOUNDS.minX, BOUNDS.maxX),
      0,
      THREE.MathUtils.clamp(point.z, BOUNDS.minZ, BOUNDS.maxZ),
    );
    this.targetFace = face;
    this.action = action;
    this.emit('target', { point: this.target.clone() });
  }

  // ---- arriving at a station or the counter
  arrive() {
    const a = this.action;
    this.action = null;
    if (!a) return;
    if (a.kind === 'station') {
      if (!a.st.item) {
        if (this.tray.length) this.emit('toast', { text: 'Tray cleared', at: this.pos.clone() });
        this.tray = [];
        this.renderTray();
        this.emit('tray');
        return;
      }
      if (this.tray.length >= TRAY_SIZE) {
        this.emit('toast', { text: 'Tray full!', at: this.pos.clone() });
        return;
      }
      this.tray.push(a.st.item);
      this.renderTray();
      this.emit('tray');
      this.emit('pickup', { item: a.st.item });
    } else if (a.kind === 'serve') {
      this.serve(a.slot);
    }
  }

  serve(slot) {
    const c = this.slots[slot];
    if (!c || c.state !== 'waiting') return;
    const given = [];
    for (let i = this.tray.length - 1; i >= 0; i--) {
      const at = c.remaining.indexOf(this.tray[i]);
      if (at !== -1) {
        given.push(this.tray[i]);
        c.remaining.splice(at, 1);
        this.tray.splice(i, 1);
      }
    }
    this.renderTray();
    this.emit('tray');
    const head = c.human.root.position.clone().setY(2.1);
    if (!given.length) {
      // nothing on the tray they want
      c.patience = Math.max(0, c.patience - c.patienceMax * 0.15);
      this.combo = 0;
      this.speak(c, say(c.def.lines.wrong));
      this.emit('wrong', { slot });
      this.emit('stats');
      return;
    }
    const itemPoints = given.length * POINTS_PER_ITEM;
    this.score += itemPoints;
    if (c.remaining.length) {
      this.emit('popup', { text: `+${itemPoints}`, at: head });
      this.emit('order', { slot });
      this.emit('stats');
      return;
    }
    // order complete
    const frac = c.patience / c.patienceMax;
    let tip = Math.round(frac * 80 * c.def.tip);
    const perfect = frac > 0.6;
    if (perfect && c.def.fastTip) tip = Math.round(tip * c.def.fastTip);
    this.combo = frac > 0.45 ? this.combo + 1 : 0;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    const comboBonus = this.combo > 1 ? Math.min(200, (this.combo - 1) * 20) : 0;
    const total = itemPoints + POINTS_PER_ORDER + tip + comboBonus;
    this.score += POINTS_PER_ORDER + tip + comboBonus;
    this.orders += 1;
    if (perfect) this.perfect += 1;
    const lovedIt = perfect && c.order.includes(c.def.favourite);
    this.speak(c, lovedIt ? c.def.lines.surprise : say(c.def.lines.happy), lovedIt ? 'surprise' : 'happy');
    this.emit('served', { slot, total, tip, combo: this.combo, perfect, surprise: lovedIt, name: c.def.name });
    this.emit('popup', { text: `+${total}${this.combo > 1 ? `  ×${this.combo} combo` : ''}`, at: head, big: true });
    this.emit('stats');
    this.leave(slot, 'happy');
  }

  // ---- customers
  spawn() {
    const free = this.slots.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0);
    if (!free.length) return;
    const present = new Set([...this.slots, ...this.leaving].filter(Boolean).map((c) => c.def.id));
    const choices = CUSTOMERS.filter((d) => !present.has(d.id));
    const def = pick(choices.length ? choices : CUSTOMERS);
    const slot = pick(free);
    const f = Math.min(1, this.elapsed / SHIFT_SECONDS);

    // order: 1 item early on, up to 3 later; favourites come up often
    const r = Math.random();
    const size = f < 0.2 ? 1 : r < 0.5 - f * 0.25 ? 1 : r < 0.88 ? 2 : 3;
    const order = [];
    for (let i = 0; i < size; i++) order.push(i === 0 && Math.random() < 0.6 ? def.favourite : pick(ITEMS).id);

    const human = buildHuman(def.style);
    human.root.position.copy(DOOR);
    this.scene.add(human.root);
    const patienceMax = lerp(25, 16, f) * def.patience + (size - 1) * 5;
    const c = {
      def, human, slot, order, remaining: [...order],
      state: 'walkingIn', patience: patienceMax, patienceMax,
      line: null, lineUntil: 0, mood: 'neutral', phase: Math.random() * 6,
      t0: Math.random() * 10,
    };
    this.slots[slot] = c;
    this.emit('arrive', { slot });
  }

  speak(c, text, mood = 'neutral') {
    c.line = text;
    c.mood = mood;
    c.lineUntil = this.elapsed + (mood === 'surprise' ? 4 : 2.6);
    this.emit('line', { slot: c.slot, text, mood });
  }

  leave(slot, mood) {
    const c = this.slots[slot];
    if (!c) return;
    c.state = 'leaving';
    c.leftAs = mood;
    this.slots[slot] = null;
    this.leaving.push(c);
    this.emit('leave', { slot, mood, name: c.def.name });
  }

  clearCustomers() {
    for (const c of [...(this.slots ?? []), ...(this.leaving ?? [])]) {
      if (!c) continue;
      this.scene.remove(c.human.root);
      c.human.dispose();
    }
    this.slots = SLOT_Z.map(() => null);
    this.leaving = [];
  }

  /** Moves a human towards a point. Returns true once it's there. */
  stepHuman(c, goal, speed, dt) {
    const p = c.human.root.position;
    const d = new THREE.Vector3(goal.x - p.x, 0, goal.z - p.z);
    const dist = d.length();
    if (dist < 0.04) {
      c.walking = 0;
      return true;
    }
    const step = Math.min(dist, speed * dt);
    p.addScaledVector(d.normalize(), step);
    c.human.root.rotation.y = turnTowards(c.human.root.rotation.y, Math.atan2(d.x, d.z), dt * 10);
    c.walking = 1;
    c.phase += dt * speed * 4.2;
    return false;
  }

  renderTray() {
    const g = this.trayGroup;
    if (!g) return;
    for (const child of [...g.children]) if (child.userData.item) g.remove(child);
    this.tray.forEach((id, i) => {
      const m = makeItem(id);
      m.userData.item = true;
      m.position.set((i - (this.tray.length - 1) / 2) * 0.14, 0.012, 0);
      m.scale.setScalar(0.85);
      g.add(m);
    });
  }

  end(reason) {
    if (this.over) return;
    this.over = true;
    this.running = false;
    this.target = null;
    this.action = null;
    this.emit('end', { reason, score: this.score, orders: this.orders, perfect: this.perfect, bestCombo: this.bestCombo });
  }

  // ---- every frame
  update(dt, t) {
    dt = Math.min(dt, 0.05);
    const live = this.running && !this.paused;

    if (live) {
      this.time = Math.max(0, this.time - dt);
      this.spawnIn -= dt;
      if (this.spawnIn <= 0) {
        this.spawn();
        const f = Math.min(1, this.elapsed / SHIFT_SECONDS);
        this.spawnIn = lerp(5.2, 2.4, f) + Math.random() * 1.4;
      }
    }

    // the baker
    if (live && this.target) {
      const d = new THREE.Vector3(this.target.x - this.pos.x, 0, this.target.z - this.pos.z);
      const dist = d.length();
      if (dist < 0.05) {
        this.pos.copy(this.target);
        this.target = null;
        this.facingGoal = this.targetFace;
        this.arrive();
      } else {
        this.pos.addScaledVector(d.normalize(), Math.min(dist, WALK_SPEED * dt));
        this.facingGoal = Math.atan2(d.x, d.z);
        this.phase += dt * WALK_SPEED * 3.4;
      }
    }
    const moving = live && !!this.target;
    this.walk = THREE.MathUtils.damp(this.walk, moving ? 1 : 0, 12, dt);
    this.carry = THREE.MathUtils.damp(this.carry, this.tray.length ? 1 : 0, 10, dt);
    if (this.facingGoal !== undefined) this.baker.root.rotation.y = turnTowards(this.baker.root.rotation.y, this.facingGoal, dt * 12);
    this.baker.root.position.copy(this.pos);
    this.baker.update(t, { walk: this.walk, phase: this.phase, carry: this.carry });
    if (this.trayGroup) this.trayGroup.visible = this.carry > 0.35;

    // customers at the counter
    this.slots.forEach((c, slot) => {
      if (!c) return;
      if (c.state === 'walkingIn') {
        const spot = new THREE.Vector3(CUSTOMER_X, 0, SLOT_Z[slot]);
        if (this.stepHuman(c, spot, CUSTOMER_SPEED * (live ? 1 : 0), dt)) {
          c.state = 'waiting';
          this.speak(c, say(c.def.lines.arrive));
          this.emit('order', { slot });
        }
      } else if (c.state === 'waiting') {
        c.walking = 0;
        c.human.root.rotation.y = turnTowards(c.human.root.rotation.y, Math.PI / 2, dt * 8);
        if (live) {
          c.patience -= dt;
          if (c.patience / c.patienceMax < 0.3 && c.mood === 'neutral' && !c.warned) {
            c.warned = true;
            this.emit('hurry', { slot });
          }
          if (c.patience <= 0) {
            this.speak(c, say(c.def.lines.angry), 'angry');
            this.hearts -= 1;
            this.combo = 0;
            this.emit('popup', { text: '−♥', at: c.human.root.position.clone().setY(2.1), bad: true });
            this.leave(slot, 'angry');
            this.emit('stats');
            if (this.hearts <= 0) this.end('hearts');
          }
        }
      }
      if (c && c.line && this.elapsed > c.lineUntil && c.state === 'waiting') {
        c.line = null;
        c.mood = 'neutral';
        this.emit('line', { slot, text: null });
      }
      c.human.update(t + c.t0, { walk: c.walking ?? 0, phase: c.phase });
    });

    // customers walking out
    for (const c of [...this.leaving]) {
      if (this.stepHuman(c, DOOR, CUSTOMER_SPEED * 1.15, dt)) {
        this.scene.remove(c.human.root);
        c.human.dispose();
        this.leaving.splice(this.leaving.indexOf(c), 1);
      } else {
        c.human.update(t + c.t0, { walk: c.walking ?? 0, phase: c.phase });
      }
    }

    if (live && this.time <= 0) this.end('time');
  }
}

/** Rotates angle a towards b by at most `max` radians, the short way round. */
function turnTowards(a, b, max) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + THREE.MathUtils.clamp(d, -max, max);
}
