import './style.css';
import {
  COLS, CELL_W, CELL_H, MODULE_SCALE, DIG_PRICE_GROWTH, BUILD_TIME, WORK_TIME,
  ROWS,
  ACTOR_SCALE,
  SURFACE_Y,
  START,
  DIG_BASE_PRICE,
  DIG_TIME,
  WAR_TICK_MS,
  cellX,
  cellY,
  centerX,
  floorY,
  shaftX,
  moduleX,
  workX,
  key,
  MODULES,
  FINDS,
} from './config.js';
import { ICON, moduleArtMarkup } from './art.js';

// ---------- state ----------
const state = {
  money: 1000000, shownMoney: 1000000, days: 0, war: 365,
  dug: new Set([key(START.r, START.c)]),
  reserved: new Set(),
  digs: 0, built: 0, collected: 0,
  modules: [], locked: true, gfArrived: false,
};

// ---------- dom helpers ----------
const NS = 'http://www.w3.org/2000/svg';
const $ = id => document.getElementById(id);
const svgEl = (tag, attrs = {}, parent) => {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
};
const layer = {
  deco: $('deco'), rooms: $('rooms'), links: $('links'), cells: $('cells'),
  modules: $('modules'), actors: $('actors'), fx: $('fx'), bubbles: $('bubbles'),
};
const phone = $('phone');
const wait = ms => new Promise(r => setTimeout(r, ms));
const fmt = n => '$' + Math.round(n).toLocaleString('ru-RU').replace(/ | /g, ' ');

function fit() {
  const s = Math.min(innerWidth / 390, innerHeight / 844);
  phone.style.transform = `scale(${s})`;
}
addEventListener('resize', fit);
fit();

function tween(ms, fn, ease = k => k) {
  return new Promise(res => {
    const t0 = performance.now();
    const step = t => {
      const k = Math.min(1, (t - t0) / ms);
      fn(ease(k));
      if (k < 1) requestAnimationFrame(step); else res();
    };
    requestAnimationFrame(step);
  });
}
const easeInOut = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;

// ---------- sound ----------
let ac = null;
function audio() {
  if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } }
  return ac;
}
function blip(freq, dur, type = 'sine', vol = .06, slide = 1) {
  const a = audio(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide !== 1) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + .02);
}
const sfx = {
  dig: () => blip(140, .14, 'triangle', .12, .45),
  coin: () => { blip(988, .07, 'square', .03); setTimeout(() => blip(1480, .12, 'square', .03), 60); },
  build: () => blip(330, .06, 'square', .04, .7),
  pop: () => blip(520, .12, 'sine', .07, 1.7),
  done: () => { blip(523, .1, 'triangle', .07); setTimeout(() => blip(784, .16, 'triangle', .07), 90); },
  no: () => blip(180, .18, 'sawtooth', .03, .8),
};

// ---------- ui ----------
let hintTimer = null;
function hint(text) {
  const p = $('hint');
  if (p.textContent === text) return;
  p.classList.add('fade');
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => { p.textContent = text; p.classList.remove('fade'); }, 180);
}
let toastTimer = null;
function toast(text, icon) {
  $('toastText').textContent = text;
  $('toastIco').innerHTML = icon || ICON.star;
  $('toast').classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('on'), 3200);
}
function setMoney(v) {
  const from = state.shownMoney;
  state.money = v;
  tween(500, k => { state.shownMoney = from + (v - from) * k; $('money').textContent = fmt(state.shownMoney); });
  bump('moneyPill');
  refreshCells();
}
function addDays(n) {
  state.days += n;
  $('days').textContent = state.days;
  bump('reservePill');
}
function bump(id) {
  const n = $(id); n.classList.remove('bump'); void n.offsetWidth; n.classList.add('bump');
}
function shortMoney() {
  const n = $('moneyPill'); n.classList.remove('short'); void n.offsetWidth; n.classList.add('short');
  sfx.no();
}

// ---------- ground decoration ----------
function drawDeco() {
  const d = layer.deco;
  const roots = ['M30 240 Q34 252 28 266', 'M150 240 Q146 256 154 270 Q158 276 154 284', 'M300 240 Q306 250 300 262', 'M360 240 Q356 258 364 268'];
  roots.forEach(p => svgEl('path', { d: p, stroke: '#5A3A24', 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round' }, d));
  const stones = [[72, 300, 9, 5], [330, 312, 7, 4], [120, 420, 11, 6], [210, 452, 6, 4], [300, 510, 12, 7], [56, 560, 8, 5], [180, 640, 14, 8], [350, 690, 9, 6], [90, 700, 12, 7], [240, 720, 10, 6]];
  stones.forEach(([x, y, rx, ry], i) => {
    svgEl('ellipse', { cx: x, cy: y, rx, ry, fill: i % 2 ? '#8A7563' : '#7A6656' }, d);
    svgEl('ellipse', { cx: x - rx * .25, cy: y - ry * .3, rx: rx * .45, ry: ry * .35, fill: 'rgba(255,255,255,.12)' }, d);
  });
  // buried chest in cell 1,0
  const cx = centerX(0) + 8, cy = cellY(1) + 66;
  const chest = svgEl('g', { id: 'find-1,0', opacity: .9 }, d);
  svgEl('rect', { x: cx - 15, y: cy - 8, width: 30, height: 18, rx: 3, fill: '#6E452E' }, chest);
  svgEl('path', { d: `M${cx - 15} ${cy - 6} Q${cx - 15} ${cy - 17} ${cx} ${cy - 17} Q${cx + 15} ${cy - 17} ${cx + 15} ${cy - 6} Z`, fill: '#7E5236' }, chest);
  svgEl('rect', { x: cx - 2.5, y: cy - 7, width: 5, height: 7, rx: 1.5, fill: '#D9A928' }, chest);
  svgEl('path', { d: `M${cx + 22} ${cy - 24} l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z`, fill: '#FFE59A', class: 'sparkle' }, chest);
  // bone in cell 0,2
  const bx = centerX(2) + 20, by = cellY(0) + 84;
  const bone = svgEl('g', { id: 'find-0,2', fill: '#E9E1CF', transform: `rotate(-18 ${bx} ${by})` }, d);
  svgEl('circle', { cx: bx - 10, cy: by - 3, r: 3.2 }, bone); svgEl('circle', { cx: bx - 10, cy: by + 3, r: 3.2 }, bone);
  svgEl('circle', { cx: bx + 10, cy: by - 3, r: 3.2 }, bone); svgEl('circle', { cx: bx + 10, cy: by + 3, r: 3.2 }, bone);
  svgEl('rect', { x: bx - 10, y: by - 2.5, width: 20, height: 5 }, bone);
}

// ---------- rooms ----------
function drawRoom(r, c) {
  const x = cellX(c), y = cellY(r), w = CELL_W, h = CELL_H;
  const g = svgEl('g', { id: `room-${r}-${c}` }, layer.rooms);
  svgEl('rect', { x: x - 4, y: y - 4, width: w + 8, height: h + 8, rx: 10, fill: '#2E1E14' }, g);
  svgEl('rect', { x, y, width: w, height: h, rx: 7, fill: '#D9D2C5' }, g);
  for (let i = 1; i < 4; i++) svgEl('rect', { x: x + i * w / 4 - 1, y: y + 8, width: 2, height: h - 20, fill: '#CBC3B5' }, g);
  svgEl('rect', { x, y: y + h * .46, width: w, height: 2, fill: '#CBC3B5' }, g);
  svgEl('rect', { x, y, width: w, height: 8, rx: 4, fill: '#8B8478' }, g);
  svgEl('rect', { x, y: y + h - 12, width: w, height: 12, rx: 4, fill: '#9C9182' }, g);
  svgEl('rect', { x, y: y + h - 12, width: w, height: 2.5, fill: '#857A6B' }, g);
  // lamp
  const lx = x + w * .42;
  const lamp = svgEl('g', { class: 'lamp' }, g);
  svgEl('polygon', { points: `${lx - 6},${y + 26} ${lx + 6},${y + 26} ${lx + 34},${y + h - 12} ${lx - 34},${y + h - 12}`, fill: 'url(#cone)' }, lamp);
  svgEl('circle', { cx: lx, cy: y + 25, r: 40, fill: 'url(#lampGlow)' }, lamp);
  svgEl('rect', { x: lx - .75, y: y + 8, width: 1.5, height: 12, fill: '#5E584F' }, g);
  svgEl('path', { d: `M${lx - 7} ${y + 22} Q${lx} ${y + 16} ${lx + 7} ${y + 22} Z`, fill: '#3F4650' }, g);
  svgEl('circle', { cx: lx, cy: y + 24, r: 3.6, fill: '#FFE7A0' }, g);
  return g;
}

function drawLinks() {
  layer.links.innerHTML = '';
  const L = layer.links;
  // ladder from the surface hatch into the first room
  drawShaft(shaftX(START.c), SURFACE_Y - 2, cellY(START.r) + 8, floorY(START.r));
  for (const k of state.dug) {
    const [r, c] = k.split(',').map(Number);
    if (state.dug.has(key(r, c + 1))) {
      const x1 = cellX(c) + CELL_W - 4, x2 = cellX(c + 1) + 4, fy = floorY(r);
      svgEl('rect', { x: x1, y: fy - 52, width: x2 - x1, height: 52, fill: '#D3CCBE' }, L);
      svgEl('rect', { x: x1, y: fy - 56, width: x2 - x1, height: 6, fill: '#8B8478' }, L);
      svgEl('rect', { x: x1, y: fy, width: x2 - x1, height: 12, fill: '#9C9182' }, L);
      svgEl('rect', { x: x1, y: fy, width: x2 - x1, height: 2.5, fill: '#857A6B' }, L);
    }
    if (state.dug.has(key(r + 1, c))) {
      drawShaft(shaftX(c), floorY(r) - 2, cellY(r + 1) + 8, floorY(r + 1));
    }
  }
}
function drawShaft(x, top, holeBottom, ladderBottom) {
  const L = layer.links;
  svgEl('rect', { x: x - 10, y: top, width: 20, height: holeBottom - top, fill: '#2B211B' }, L);
  svgEl('rect', { x: x - 7, y: top - 4, width: 2.4, height: ladderBottom - top + 4, rx: 1, fill: '#B9BFC6' }, L);
  svgEl('rect', { x: x + 4.6, y: top - 4, width: 2.4, height: ladderBottom - top + 4, rx: 1, fill: '#B9BFC6' }, L);
  for (let y = top + 2; y < ladderBottom - 4; y += 8) svgEl('rect', { x: x - 6, y, width: 12, height: 2, fill: '#9AA1A9' }, L);
}

// ---------- start room furniture ----------
function drawStartRoom() {
  const x = cellX(START.c), fy = floorY(START.r);
  const g = svgEl('g', { transform: `translate(${x} ${fy}) scale(${MODULE_SCALE}) translate(${-x} ${-fy})` }, layer.modules);
  // camp bed
  svgEl('rect', { x: x + 7, y: fy - 7, width: 2.5, height: 7, fill: '#5E584F' }, g);
  svgEl('rect', { x: x + 37, y: fy - 7, width: 2.5, height: 7, fill: '#5E584F' }, g);
  svgEl('rect', { x: x + 5, y: fy - 12, width: 37, height: 6, rx: 3, fill: '#6F8F5E' }, g);
  svgEl('rect', { x: x + 6, y: fy - 17, width: 11, height: 6, rx: 3, fill: '#F4F0E6' }, g);
  svgEl('rect', { x: x + 16, y: fy - 16, width: 26, height: 5, rx: 2.5, fill: '#2F6F6A' }, g);
  // water canister and a box of cans
  svgEl('rect', { x: x + 6, y: fy - 37, width: 22, height: 3, rx: 1, fill: '#8B8478' }, g);
  svgEl('rect', { x: x + 9, y: fy - 48, width: 7, height: 11, rx: 1.5, fill: '#4BA3D9' }, g);
  svgEl('rect', { x: x + 18, y: fy - 45, width: 8, height: 8, rx: 1.5, fill: '#C9874B' }, g);
}

// ---------- dog ----------
function drawDog(x, fy) {
  const g = svgEl('g', { id: 'dog', transform: `translate(${x} ${fy}) scale(${ACTOR_SCALE})` }, layer.actors);
  svgEl('ellipse', { cx: 0, cy: 0, rx: 10, ry: 2.2, fill: 'rgba(0,0,0,.25)' }, g);
  svgEl('path', { d: 'M-8 -6 q-5 -2 -6 -8', stroke: '#B97A3F', 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round', class: 'wag', id: 'tail' }, g);
  svgEl('ellipse', { cx: -1, cy: -7, rx: 9, ry: 7, fill: '#C98A4B' }, g);
  svgEl('rect', { x: 2, y: -8, width: 3.5, height: 8, rx: 1.5, fill: '#B97A3F' }, g);
  svgEl('rect', { x: -6, y: -5, width: 4, height: 5, rx: 1.5, fill: '#B97A3F' }, g);
  svgEl('circle', { cx: 6, cy: -17, r: 6.5, fill: '#C98A4B' }, g);
  svgEl('ellipse', { cx: 11, cy: -15, rx: 4, ry: 3, fill: '#E9C49A' }, g);
  svgEl('circle', { cx: 14.4, cy: -16, r: 1.5, fill: '#22252B' }, g);
  svgEl('path', { d: 'M2 -22 q-4 4 -2 10 q3 -2 4 -8 z', fill: '#8E5A2E' }, g);
  svgEl('circle', { cx: 7.5, cy: -18.5, r: 1.2, fill: '#22252B', class: 'blink' }, g);
  svgEl('rect', { x: 0, y: -12, width: 9, height: 2, rx: 1, fill: '#E04B3A' }, g);
  return g;
}

// ---------- people ----------
const people = [];
function makePerson(look) {
  const g = svgEl('g', { class: 'person' }, layer.actors);
  const inner = svgEl('g', {}, g);
  svgEl('ellipse', { cx: 0, cy: 0, rx: 11, ry: 2.6, fill: 'rgba(0,0,0,.28)' }, inner);
  const body = svgEl('g', {}, inner);
  const leg = (x) => {
    const lg = svgEl('g', {}, body);
    svgEl('rect', { x, y: -15, width: 5, height: 14, rx: 2, fill: look.pants }, lg);
    svgEl('rect', { x: x - .5, y: -3.2, width: 7, height: 3.4, rx: 1.6, fill: '#1E2533' }, lg);
    return lg;
  };
  const legL = leg(-6), legR = leg(1);
  if (look.longHair) svgEl('path', { d: 'M-9 -42 Q-11 -26 -6 -24 L4 -24 Q2 -34 4 -42 Z', fill: look.hair }, body);
  svgEl('rect', { x: -8.5, y: -30, width: 4.5, height: 12, rx: 2, fill: look.jacketDark }, body);
  svgEl('rect', { x: -9, y: -31, width: 18, height: 18, rx: 6, fill: look.jacket }, body);
  svgEl('rect', { x: -9, y: -22.5, width: 18, height: 2.4, fill: look.stripe, opacity: .9 }, body);
  // head
  svgEl('circle', { cx: 0, cy: -39, r: 8.5, fill: '#F4C9A3' }, body);
  if (look.hat) {
    svgEl('path', { d: 'M-8.6 -40 Q-8 -49.5 0 -49.5 Q8 -49.5 8.6 -40 Z', fill: look.hat }, body);
    svgEl('rect', { x: -9, y: -42.5, width: 18, height: 4, rx: 2, fill: look.hatBand }, body);
  } else {
    svgEl('path', { d: 'M-8.8 -38 Q-9 -49 1 -48.5 Q9 -48 8.6 -41 Q3 -44 -3 -42 Q-6 -40 -8.8 -38 Z', fill: look.hair }, body);
    svgEl('rect', { x: -6, y: -48.5, width: 10, height: 2.2, rx: 1.1, fill: look.hatBand }, body);
  }
  svgEl('circle', { cx: 3.8, cy: -38.5, r: 1.3, fill: '#22252B', class: 'blink' }, body);
  svgEl('circle', { cx: 5.6, cy: -35.5, r: 1.7, fill: '#F29C84', opacity: .55 }, body);
  // front arm with tools
  const arm = svgEl('g', {}, body);
  const shovel = svgEl('g', { opacity: 0 }, arm);
  svgEl('rect', { x: 6.3, y: -22, width: 2.2, height: 22, rx: 1, fill: '#9C6A45' }, shovel);
  svgEl('path', { d: 'M3.4 -1 h8 v5 q-4 5 -8 0 z', fill: '#AEB5BC' }, shovel);
  const hammer = svgEl('g', { opacity: 0 }, arm);
  svgEl('rect', { x: 6.3, y: -19, width: 2.2, height: 12, rx: 1, fill: '#9C6A45' }, hammer);
  svgEl('rect', { x: 3, y: -9, width: 9, height: 4.5, rx: 1.2, fill: '#5E656E' }, hammer);
  svgEl('rect', { x: 5, y: -30, width: 4.5, height: 13, rx: 2, fill: look.jacketDark }, arm);
  svgEl('circle', { cx: 7.25, cy: -17, r: 2.4, fill: '#F4C9A3' }, arm);

  const p = {
    g, inner, body, legL, legR, arm, shovel, hammer,
    x: 0, y: 0, face: 1, mode: 'idle', cell: { ...START },
    queue: [], running: false, phase: Math.random() * 10,
    place(x, y) { this.x = x; this.y = y; g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${ACTOR_SCALE})`); },
    faceTo(f) { if (f && f !== this.face) { this.face = f; inner.setAttribute('transform', `scale(${f} 1)`); } },
    tool(name) { shovel.setAttribute('opacity', name === 'shovel' ? 1 : 0); hammer.setAttribute('opacity', name === 'hammer' ? 1 : 0); },
  };
  people.push(p);
  return p;
}

function animatePeople(t) {
  for (const p of people) {
    const s = t / 1000 + p.phase;
    let l = 0, r = 0, arm = 0, bob = 0;
    if (p.mode === 'walk') { const w = Math.sin(s * 15); l = w * 30; r = -w * 30; arm = -w * 24; bob = -Math.abs(Math.cos(s * 15)) * 1.6; }
    else if (p.mode === 'climb') { const w = Math.sin(s * 11); l = w * 22; r = -w * 22; arm = -150 + w * 22; }
    else if (p.mode === 'dig') { const w = (Math.sin(s * 9) + 1) / 2; arm = -95 + w * 120; bob = w * 1.8; l = -6; r = 10; }
    else if (p.mode === 'build') { const w = Math.abs(Math.sin(s * 10)); arm = -110 + w * 95; }
    else if (p.mode === 'work') { const w = Math.sin(s * 14); arm = -55 + w * 18; bob = Math.abs(w) * .6; }
    else { bob = Math.sin(s * 2.2) * .7; arm = Math.sin(s * 2.2) * 3; }
    p.legL.setAttribute('transform', `rotate(${l.toFixed(1)} -3.5 -15)`);
    p.legR.setAttribute('transform', `rotate(${r.toFixed(1)} 3.5 -15)`);
    p.arm.setAttribute('transform', `rotate(${arm.toFixed(1)} 7 -28)`);
    p.body.setAttribute('transform', `translate(0 ${bob.toFixed(2)})`);
  }
  requestAnimationFrame(animatePeople);
}

async function moveTo(p, x, y) {
  const dx = x - p.x, dy = y - p.y, dist = Math.hypot(dx, dy);
  if (dist < 1) return;
  if (Math.abs(dx) > 1) p.faceTo(dx > 0 ? 1 : -1);
  p.mode = Math.abs(dy) > 1 ? 'climb' : 'walk';
  const sx = p.x, sy = p.y, speed = p.mode === 'climb' ? 80 : 105;
  await tween(dist / speed * 1000, k => p.place(sx + dx * k, sy + dy * k));
  p.mode = 'idle';
}

function findPath(from, to) {
  const start = key(from.r, from.c), goal = key(to.r, to.c);
  if (start === goal) return [];
  const prev = new Map([[start, null]]), queue = [start];
  while (queue.length) {
    const cur = queue.shift();
    if (cur === goal) break;
    const [r, c] = cur.split(',').map(Number);
    for (const [nr, nc] of [[r, c - 1], [r, c + 1], [r - 1, c], [r + 1, c]]) {
      const k = key(nr, nc);
      if (state.dug.has(k) && !prev.has(k)) { prev.set(k, cur); queue.push(k); }
    }
  }
  if (!prev.has(goal)) return [];
  const path = [];
  for (let k = goal; k !== start; k = prev.get(k)) path.unshift(k.split(',').map(Number));
  return path;
}

async function goToCell(p, r, c) {
  for (const [nr, nc] of findPath(p.cell, { r, c })) {
    if (nr !== p.cell.r) {
      await moveTo(p, shaftX(nc), floorY(p.cell.r));
      await moveTo(p, shaftX(nc), floorY(nr));
    } else {
      await moveTo(p, centerX(nc), floorY(nr));
    }
    p.cell = { r: nr, c: nc };
  }
}

function enqueue(p, job) {
  p.queue.push(job);
  if (!p.running) runQueue(p);
}
async function runQueue(p) {
  p.running = true;
  while (p.queue.length) { await p.queue.shift()(); }
  p.running = false;
  if (p === hero) heroIdleHint();
}

// ---------- particles ----------
function dirtBurst(x, y, dir) {
  const colors = ['#7D5337', '#5E3C27', '#94694A', '#4A2F20'];
  for (let i = 0; i < 9; i++) {
    const n = svgEl('circle', { cx: x, cy: y, r: 1.5 + Math.random() * 2.2, fill: colors[i % 4] }, layer.fx);
    let vx = (dir.x * -1 * (40 + Math.random() * 60)) + (Math.random() - .5) * 60;
    let vy = -60 - Math.random() * 90;
    let px = x, py = y, life = 0;
    const step = () => {
      life += 1 / 60; vy += 420 / 60; px += vx / 60; py += vy / 60;
      n.setAttribute('cx', px); n.setAttribute('cy', py); n.setAttribute('opacity', Math.max(0, 1 - life * 1.6));
      if (life < .65) requestAnimationFrame(step); else n.remove();
    };
    requestAnimationFrame(step);
  }
}
function sparks(x, y) {
  for (let i = 0; i < 6; i++) {
    const a = Math.random() * Math.PI * 2, d = 10 + Math.random() * 12;
    const n = svgEl('path', { d: 'M0 -3 L1 -1 L3 0 L1 1 L0 3 L-1 1 L-3 0 L-1 -1 Z', fill: '#FFE07A', transform: `translate(${x} ${y})` }, layer.fx);
    tween(420, k => {
      n.setAttribute('transform', `translate(${x + Math.cos(a) * d * k} ${y + Math.sin(a) * d * k}) scale(${1 - k * .6})`);
      n.setAttribute('opacity', 1 - k);
    }).then(() => n.remove());
  }
}
function floatText(x, y, text, color = '#FFFFFF') {
  const t = svgEl('text', { x, y, 'text-anchor': 'middle', 'font-family': 'Unbounded', 'font-weight': 700, 'font-size': 13, fill: color, stroke: '#22252B', 'stroke-width': 3, 'paint-order': 'stroke' }, layer.fx);
  t.textContent = text;
  tween(1100, k => { t.setAttribute('y', y - k * 30); t.setAttribute('opacity', k < .7 ? 1 : 1 - (k - .7) / .3); }).then(() => t.remove());
}
function flyCoins(x, y, count = 5) {
  const target = { x: 34, y: 34 };
  for (let i = 0; i < count; i++) {
    const c = document.createElement('div');
    c.className = 'fly';
    c.innerHTML = '<svg viewBox="0 0 22 22"><circle cx="11" cy="11" r="10" fill="#FFC531"/><circle cx="11" cy="11" r="7" fill="#FFD866"/></svg>';
    phone.appendChild(c);
    const ox = x + (Math.random() - .5) * 26, oy = y + (Math.random() - .5) * 16;
    const anim = c.animate([
      { transform: `translate(${x}px, ${y}px) scale(.4)` },
      { transform: `translate(${ox}px, ${oy - 26}px) scale(1)`, offset: .25 },
      { transform: `translate(${target.x}px, ${target.y}px) scale(.7)` },
    ], { duration: 720 + i * 70, easing: 'cubic-bezier(.5,0,.6,1)' });
    anim.onfinish = () => { c.remove(); if (i === 0) sfx.coin(); };
  }
}

// ---------- available cells ----------
function digPrice() { return Math.round(DIG_BASE_PRICE * Math.pow(DIG_PRICE_GROWTH, state.digs) / 1000) * 1000; }
function availableCells() {
  const out = [];
  for (const k of state.dug) {
    const [r, c] = k.split(',').map(Number);
    for (const [nr, nc] of [[r, c - 1], [r, c + 1], [r + 1, c]]) {
      if (nr < 0 || nr >= ROWS.length || nc < 0 || nc >= COLS.length) continue;
      const nk = key(nr, nc);
      if (!state.dug.has(nk) && !state.reserved.has(nk) && !out.some(o => o.k === nk)) out.push({ r: nr, c: nc, k: nk });
    }
  }
  return out;
}
let cellsEnabled = false;
function refreshCells() {
  layer.cells.innerHTML = '';
  if (!cellsEnabled) return;
  const price = digPrice(), poor = state.money < price;
  for (const a of availableCells()) {
    const x = cellX(a.c), y = cellY(a.r);
    const g = svgEl('g', { class: 'avail' + (poor ? ' poor' : ''), role: 'button', 'aria-label': `Вырыть комнату за ${fmt(price)}`, tabindex: 0 }, layer.cells);
    svgEl('rect', { x: x + 2, y: y + 2, width: CELL_W - 4, height: CELL_H - 4, rx: 9, fill: '#FFC531', opacity: .14, class: 'glow' }, g);
    svgEl('rect', { x: x + 2, y: y + 2, width: CELL_W - 4, height: CELL_H - 4, rx: 9, fill: 'none', stroke: '#FFC531', 'stroke-width': 2.5, class: 'frame' }, g);
    const tag = svgEl('g', { class: 'tagwrap' }, g);
    const tx = x + CELL_W / 2, ty = y + CELL_H / 2;
    svgEl('circle', { cx: tx, cy: ty - 12, r: 15, fill: poor ? '#E9D9C0' : '#FFC531' }, tag);
    svgEl('path', { d: `M${tx - 6} ${ty - 5} L${tx + 3} ${ty - 14}`, stroke: '#22252B', 'stroke-width': 2.6, 'stroke-linecap': 'round' }, tag);
    svgEl('path', { d: `M${tx + 1} ${ty - 19} Q${tx + 8} ${ty - 21} ${tx + 9} ${ty - 13} L${tx + 5} ${ty - 10} Z`, fill: '#22252B' }, tag);
    svgEl('rect', { x: tx - 34, y: ty + 9, width: 68, height: 22, rx: 11, fill: '#FFFFFF' }, tag);
    const t = svgEl('text', { x: tx, y: ty + 24.5, 'text-anchor': 'middle', 'font-family': 'Unbounded', 'font-weight': 700, 'font-size': 11, fill: poor ? '#A04030' : '#22252B' }, tag);
    t.textContent = fmt(price);
    const go = () => onCellTap(a.r, a.c);
    g.addEventListener('click', go);
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  }
}

function onCellTap(r, c) {
  audio();
  const price = digPrice();
  if (state.money < price) {
    shortMoney();
    hint('Не хватает денег. Забирай заказы с рабочего места, и копай дальше.');
    return;
  }
  state.reserved.add(key(r, c));
  state.digs++;
  setMoney(state.money - price);
  markPending(r, c);
  enqueue(hero, () => digJob(r, c));
}

function markPending(r, c) {
  const x = cellX(c), y = cellY(r);
  const g = svgEl('g', { id: `pending-${r}-${c}` }, layer.fx);
  svgEl('rect', { x: x + 2, y: y + 2, width: CELL_W - 4, height: CELL_H - 4, rx: 9, fill: 'none', stroke: '#FFFFFF', 'stroke-width': 2, 'stroke-dasharray': '3 6', opacity: .7 }, g);
}

// ---------- digging ----------
async function digJob(r, c) {
  hint('Копаем…');
  // find a dug neighbour to dig from
  const from = [[r, c - 1, 'right'], [r, c + 1, 'left'], [r - 1, c, 'down']].find(([nr, nc]) => state.dug.has(key(nr, nc)));
  const [fr, fc, dirName] = from;
  await goToCell(hero, fr, fc);
  let standX, dir;
  if (dirName === 'right') { standX = cellX(fc) + CELL_W - 10; dir = { x: 1, y: 0 }; }
  else if (dirName === 'left') { standX = cellX(fc) + 10; dir = { x: -1, y: 0 }; }
  else { standX = shaftX(fc) - 12; dir = { x: 0, y: 1 }; }
  await moveTo(hero, standX, floorY(fr));
  if (dir.x) hero.faceTo(dir.x); else hero.faceTo(1);

  // room behind a shrinking wall of soil
  $(`pending-${r}-${c}`)?.remove();
  drawRoom(r, c);
  const x = cellX(c), y = cellY(r);
  const mask = svgEl('g', {}, layer.rooms);
  const m1 = svgEl('rect', { x: x - 5, y: y - 5, width: CELL_W + 10, height: CELL_H + 10, fill: 'url(#soil)' }, mask);
  const m2 = svgEl('rect', { x: x - 5, y: y - 5, width: CELL_W + 10, height: CELL_H + 10, fill: 'url(#speck)' }, mask);
  const bar = svgEl('g', {}, layer.fx);
  svgEl('rect', { x: x + 20, y: y - 14, width: CELL_W - 40, height: 9, rx: 4.5, fill: '#22252B' }, bar);
  const fill = svgEl('rect', { x: x + 22, y: y - 12, width: 0, height: 5, rx: 2.5, fill: '#FFC531' }, bar);

  hero.tool('shovel'); hero.mode = 'dig';
  let lastThunk = 0;
  const W = CELL_W + 10, H = CELL_H + 10;
  await tween(DIG_TIME, k => {
    let fx, fy;
    if (dir.x > 0) { const w = W * (1 - k); [m1, m2].forEach(m => { m.setAttribute('x', x - 5 + W - w); m.setAttribute('width', w); }); fx = x - 5 + W - w; fy = floorY(r) - 18; }
    else if (dir.x < 0) { const w = W * (1 - k); [m1, m2].forEach(m => m.setAttribute('width', w)); fx = x - 5 + w; fy = floorY(r) - 18; }
    else { const h = H * (1 - k); [m1, m2].forEach(m => { m.setAttribute('y', y - 5 + H - h); m.setAttribute('height', h); }); fx = x + CELL_W * .6; fy = y - 5 + H - h; }
    fill.setAttribute('width', (CELL_W - 44) * k);
    const now = performance.now();
    if (now - lastThunk > 330) { lastThunk = now; sfx.dig(); dirtBurst(fx, fy, dir); }
  });
  mask.remove(); bar.remove();
  hero.mode = 'idle'; hero.tool(null);

  state.reserved.delete(key(r, c));
  state.dug.add(key(r, c));
  drawLinks();
  refreshCells();
  sfx.done();

  // step into the new room
  await goToCell(hero, r, c);
  await moveTo(hero, centerX(c) + 18, floorY(r));
  hero.faceTo(-1);

  const find = FINDS[key(r, c)];
  if (find) {
    $(`find-${key(r, c)}`)?.remove();
    if (find.money) { flyCoins(centerX(c), floorY(r) - 30, 8); setMoney(state.money + find.money); floatText(centerX(c), floorY(r) - 50, '+' + fmt(find.money), '#FFE07A'); }
    if (find.kind === 'bone') $('tail').classList.add('happy');
    toast(find.text, find.kind === 'bone' ? ICON.bone : ICON.chest);
  }

  const choice = await chooseModule(r);
  await buildJob(r, c, choice);
}

// ---------- module picker ----------
function chooseModule(row) {
  return new Promise(resolve => {
    const cards = $('cards');
    cards.innerHTML = '';
    const anyRow1 = [...state.dug].some(k => Number(k.split(',')[0]) >= 1);
    for (const [id, m] of Object.entries(MODULES)) {
      const locked = m.needsDepth && !anyRow1;
      const poor = state.money < m.price;
      const b = document.createElement('button');
      b.className = 'card'; b.type = 'button';
      if (locked || poor) b.disabled = true;
      b.innerHTML = `
        <svg class="art" viewBox="0 0 120 70">${moduleArtMarkup(id, 60, 64)}</svg>
        <span class="name">${m.name}</span>
        <span class="what">${m.what}</span>
        ${locked
          ? '<span class="lock"><svg width="14" height="14" viewBox="0 0 14 14"><rect x="2" y="6" width="10" height="7" rx="2" fill="#6B6760"/><path d="M4.5 6 V4.5 a2.5 2.5 0 0 1 5 0 V6" stroke="#6B6760" stroke-width="1.6" fill="none"/></svg>Откроется на втором ярусе</span>'
          : `<span class="price"><svg viewBox="0 0 18 18"><circle cx="9" cy="9" r="8" fill="#fff"/><text x="9" y="12.6" text-anchor="middle" font-family="Unbounded" font-weight="800" font-size="9.5" fill="#9A6A00">$</text></svg>${fmt(m.price)}</span>`}
      `;
      b.addEventListener('click', () => {
        close();
        resolve(id);
      });
      cards.appendChild(b);
    }
    const affordable = Object.values(MODULES).some(m => state.money >= m.price && !(m.needsDepth && !anyRow1));
    if (!affordable) {
      // never get stuck: the cheapest option is always on the house
      const first = cards.querySelector('.card');
      first.disabled = false;
    }
    $('scrim').classList.add('on');
    $('sheet').classList.add('on');
    hint('Выбери, что поставить в новую комнату.');
    setTimeout(() => cards.querySelector('.card:not([disabled])')?.focus({ preventScroll: true }), 350);
    function close() { $('scrim').classList.remove('on'); $('sheet').classList.remove('on'); }
  });
}

// ---------- building ----------
async function buildJob(r, c, id) {
  const m = MODULES[id];
  const free = state.money < m.price;
  if (!free) setMoney(state.money - m.price);
  hint(`Собираем: ${m.name.toLowerCase()}.`);
  await moveTo(hero, workX(c), floorY(r));
  hero.faceTo(-1);
  hero.tool('hammer'); hero.mode = 'build';
  const end = performance.now() + BUILD_TIME;
  while (performance.now() < end) { sfx.build(); sparks(moduleX(c) + 8 + Math.random() * 10, floorY(r) - 12 - Math.random() * 14); await wait(260); }
  hero.mode = 'idle'; hero.tool(null);

  const g = svgEl('g', { class: 'pop' }, layer.modules);
  g.innerHTML = `<g transform="translate(${moduleX(c)} ${floorY(r)}) scale(${MODULE_SCALE}) translate(${-moduleX(c)} ${-floorY(r)})">${moduleArtMarkup(id, moduleX(c), floorY(r))}</g>`;
  sfx.pop();
  if (m.days) { addDays(m.days); floatText(moduleX(c), floorY(r) - 84, `+${m.days} дн.`, '#B8F2C8'); }
  state.built++;
  const mod = { id, r, c, ready: false, taken: false, bubble: null };
  state.modules.push(mod);
  scheduleTask(mod, 1600);

  if (state.built === 1) hint(id === 'laptop' ? 'Работа пошла. Скоро придёт первый заказ.' : 'Готово. Скоро тут появится первая задача.');
  else if (state.built === 2) setTimeout(girlfriendArrives, 1200);
  else hint('Бункер растёт. Копай дальше, глубже лежат находки.');
}

// ---------- tasks ----------
function scheduleTask(mod, delay) {
  setTimeout(() => showTask(mod), delay ?? MODULES[mod.id].every);
}
function showTask(mod) {
  const m = MODULES[mod.id];
  mod.ready = true; mod.taken = false;
  const x = moduleX(mod.c), y = cellY(mod.r) + 6;
  const g = svgEl('g', { class: 'bubble', role: 'button', tabindex: 0, 'aria-label': m.task.label }, layer.bubbles);
  const pop = svgEl('g', { class: 'pop' }, g);
  const bob = svgEl('g', { class: 'bob' }, pop);
  const w = 22 + m.task.label.length * 6.6;
  svgEl('rect', { x: x - w / 2, y: y, width: w, height: 26, rx: 13, fill: '#FFFFFF' }, bob);
  svgEl('path', { d: `M${x - 5} ${y + 25} L${x} ${y + 32} L${x + 5} ${y + 25} Z`, fill: '#FFFFFF' }, bob);
  svgEl('circle', { cx: x - w / 2 + 13, cy: y + 13, r: 8, fill: m.task.money ? '#FFC531' : '#7FD08E' }, bob);
  const ic = svgEl('text', { x: x - w / 2 + 13, y: y + 17, 'text-anchor': 'middle', 'font-family': 'Unbounded', 'font-weight': 800, 'font-size': 10, fill: '#22252B' }, bob);
  ic.textContent = m.task.money ? '$' : '+';
  const t = svgEl('text', { x: x - w / 2 + 25, y: y + 17.5, 'font-family': 'Unbounded', 'font-weight': 700, 'font-size': 10.5, fill: '#22252B' }, bob);
  t.textContent = m.task.label;
  mod.bubble = g;
  sfx.pop();
  const take = () => { audio(); claimTask(mod, hero); };
  g.addEventListener('click', take);
  g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); take(); } });
  if (state.collected === 0 && !state.gfArrived) hint(mod.id === 'laptop' ? 'Заказ готов! Тапни по облачку, чтобы забрать деньги.' : 'Задача готова. Тапни по облачку.');
}
function claimTask(mod, who) {
  if (!mod.ready || mod.taken) return;
  mod.taken = true;
  mod.bubble.setAttribute('opacity', .55);
  enqueue(who, () => collectJob(who, mod));
}
async function collectJob(p, mod) {
  const m = MODULES[mod.id];
  await goToCell(p, mod.r, mod.c);
  await moveTo(p, workX(mod.c), floorY(mod.r));
  p.faceTo(-1);
  p.mode = 'work';
  await wait(WORK_TIME);
  p.mode = 'idle';
  mod.bubble.remove(); mod.bubble = null; mod.ready = false; mod.taken = false;
  const x = moduleX(mod.c), y = floorY(mod.r) - 76;
  if (m.task.money) { flyCoins(x, y + 20, 5); setMoney(state.money + m.task.money); floatText(x, y, '+' + fmt(m.task.money), '#FFE07A'); }
  if (m.task.days) { addDays(m.task.days); floatText(x, y, `+${m.task.days} дн.`, '#B8F2C8'); sfx.done(); }
  state.collected++;
  if (state.collected === 1) hint('Вот так и растёт бункер: копай, ставь, забирай. Вырой ещё комнату.');
  scheduleTask(mod);
}

function heroIdleHint() {
  if (state.collected === 0) return;
  if (!state.gfArrived) hint('Вырой ещё одну комнату. Скоро к тебе переедет девушка.');
}

// ---------- girlfriend ----------
let girl = null;
async function girlfriendArrives() {
  state.gfArrived = true;
  girl = makePerson({ jacket: '#2F9C8F', jacketDark: '#23796F', pants: '#40375A', stripe: '#FFE08A', hair: '#6B3B2A', longHair: true, hatBand: '#FFC531' });
  girl.place(shaftX(START.c), SURFACE_Y - 4);
  girl.cell = { ...START };
  $('people').textContent = '2';
  toast('В бункер спустилась девушка. Теперь задачи закрываются сами.', ICON.heart);
  hint('Пока девушка собирает задачи, ты копаешь глубже. Внизу что-то блестит.');
  await moveTo(girl, shaftX(START.c), floorY(START.r));
  await moveTo(girl, centerX(START.c) + 4, floorY(START.r));
  girlLoop();
}
async function girlLoop() {
  for (;;) {
    const task = state.modules.find(m => m.ready && !m.taken);
    if (task) { claimTask(task, girl); while (girl.running || girl.queue.length) await wait(150); }
    else await wait(400);
  }
}

// ---------- war clock ----------
setInterval(() => {
  if (state.war <= 1) return;
  state.war--;
  $('war').textContent = state.war;
}, WAR_TICK_MS);

// ---------- coming soon tabs ----------
document.querySelectorAll('[data-soon]').forEach(b => b.addEventListener('click', () => toast('Этот раздел появится в демке.', ICON.star)));

// ---------- boot ----------
let hero = null;
async function intro() {
  drawDeco();
  drawRoom(START.r, START.c);
  drawLinks();
  drawStartRoom();
  drawDog(cellX(START.c) + 60, floorY(START.r));
  hero = makePerson({ jacket: '#F26B3A', jacketDark: '#D9572A', pants: '#2E3B55', stripe: '#FFE08A', hat: '#2F6F6A', hatBand: '#23544F' });
  hero.place(shaftX(START.c), SURFACE_Y - 4);
  requestAnimationFrame(animatePeople);
  await wait(700);
  await moveTo(hero, shaftX(START.c), floorY(START.r));
  await moveTo(hero, cellX(START.c) + 80, floorY(START.r));
  hero.faceTo(-1);
  await wait(500);
  hero.faceTo(1);
  cellsEnabled = true;
  refreshCells();
  hint('Тапни по жёлтой клетке, и герой выкопает новую комнату.');
}
intro();
