// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps, and the renderer paints what is there. The game moves between
// title, play, paused, busted and wasted. Save lives in localStorage.
//
// ?seed=N fixes the city. ?shot=title|chase|drive|foot (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady.
import { BUSTED_PENALTY, LANDMARKS, PLAYER, SAVE_KEY, SPRAY_PRICE, START_CASH, STEP } from './config.js';
import { createRandom } from './random.js';
import { createCity } from './city.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer } from './render.js';
import { createWanted } from './wanted.js';
import { createMissionState, failMission, startMission, updateMission, updateSideJob } from './missions.js';
import {
  makeCar, nearestCar, resolveBumps, spawnParkedCars, spawnPedestrians, spawnTraffic,
  updateParticles, updatePedestrians, updatePlayerCar, updatePlayerOnFoot, updatePolice, updateTraffic,
} from './entities.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const input = createInput(canvas);
const audio = createAudio();
const renderer = createRenderer(canvas);

function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.cash !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

function createGame(gameSeed) {
  const rng = createRandom(gameSeed);
  const G = {
    rng, time: 0, mode: 'title', seed: gameSeed,
    audio,
    city: createCity(rng),
    cars: [], peds: [], particles: [], skids: [],
    player: {
      x: LANDMARKS.bar.x, y: LANDMARKS.bar.y + 190, angle: 0, aim: 0,
      onFoot: true, car: null, health: PLAYER.health, ammo: PLAYER.ammo,
      reloadTimer: 0, shootCooldown: 0, speed: 0,
    },
    cam: { x: LANDMARKS.bar.x, y: LANDMARKS.bar.y + 190, zoom: 1, mouseWorldX: 0, mouseWorldY: 0 },
    cash: START_CASH, banner: null, phone: null,
    stats: { jobsDone: 0, carsStolen: 0 },
    mission: createMissionState(),
    wanted: null,
    save: loadSave(),
    storyComplete: false, storyBannerT: 0,
    busted: false, menuIndex: 0, menuItems: [], helpOpen: false,
    viewW: 1280, viewH: 720, shake: 0,
    saveGame() {
      try {
        window.localStorage.setItem(SAVE_KEY, JSON.stringify({
          cash: G.cash,
          missionIndex: G.mission.index,
          jobsDone: G.stats.jobsDone,
          storyComplete: G.storyComplete,
        }));
        G.save = loadSave();
      } catch { /* storage can be off; the game still plays */ }
    },
  };
  G.wanted = createWanted(G);
  spawnParkedCars(G);
  spawnTraffic(G, 30);
  spawnPedestrians(G, 55);
  // A Comet GT parked near the bar so the first job is a short walk away.
  const starter = makeCar('sports', LANDMARKS.bar.x + 60, LANDMARKS.bar.y + 210, -Math.PI / 2, { driver: false, parked: true });
  starter.color = '#d21f3c';
  G.cars.push(starter);
  G.menuItems = titleMenuItems(G);
  return G;
}

function titleMenuItems(G) {
  const items = [];
  if (G.save) items.push({ label: 'CONTINUE', action: 'continue' });
  items.push({ label: 'NEW GAME', action: 'new' });
  items.push({ label: 'HOW TO PLAY', action: 'help' });
  return items;
}

function pauseMenuItems() {
  return [
    { label: 'RESUME', action: 'resume' },
    { label: 'RESTART JOB', action: 'restart' },
    { label: 'SOUND: ON', action: 'sound' },
    { label: 'SAVE & QUIT TO TITLE', action: 'quit' },
  ];
}

const G0 = createGame(seed);
let G = G0;
window.__G = G;

function startNewGame() {
  G = createGame(Math.floor(Math.random() * 4294967296));
  window.__G = G;
  G.mode = 'play';
  G.helpOpen = false;
  startMission(G, 0);
  updateStatus();
}

function continueGame() {
  const save = G.save;
  if (!save) return;
  G.cash = save.cash;
  G.stats.jobsDone = save.jobsDone || 0;
  G.storyComplete = !!save.storyComplete;
  G.mission.index = Math.min(save.missionIndex || 0, 5);
  G.mission.completedAll = G.storyComplete;
  G.mode = 'play';
  G.helpOpen = false;
  if (!G.storyComplete) startMission(G, G.mission.index);
  updateStatus();
}

function updateStatus() {
  if (status) status.textContent = `Solmar Heat. Cash $${G.cash}. ${G.mission.active ? `Job: ${G.mission.label}` : 'Free roam.'}`;
}

function enterCar() {
  const p = G.player;
  const car = nearestCar(G, p.x, p.y, 62);
  if (!car) return;
  if (car.driver) {
    // Jack it: the driver flees on foot, and witnesses call the cops.
    const driver = {
      kind: 'ped', x: car.x + 30, y: car.y + 30, angle: 0, speed: 150,
      target: null, state: 'flee', stateTimer: 2.5, fleeX: p.x, fleeY: p.y,
      color: '#e67e22', police: false, arrest: 0, down: 0,
    };
    G.peds.push(driver);
    car.driver = false;
    G.stats.carsStolen += 1;
    if (G.wanted.witnessed(car.x, car.y)) G.wanted.add(1, 'car jacked');
  }
  p.car = car;
  p.onFoot = false;
  car.parked = false;
  car.driver = true;
  p.x = car.x;
  p.y = car.y;
  p.angle = car.angle;
  audio.blip();
}

function exitCar() {
  const p = G.player;
  const car = p.car;
  if (!car) return;
  car.speed = 0;
  car.driver = false;
  p.car = null;
  p.onFoot = true;
  p.x = car.x - Math.sin(car.angle) * 34;
  p.y = car.y + Math.cos(car.angle) * 34;
  const pos = { x: p.x, y: p.y };
  G.city.collideCircle(pos, PLAYER.radius);
  p.x = pos.x;
  p.y = pos.y;
  p.angle = car.angle;
}

function respray() {
  const p = G.player;
  const car = p.car;
  if (!car || G.wanted.level === 0 || G.cash < SPRAY_PRICE) return;
  if (Math.abs(car.x - LANDMARKS.spray.x) > 170 || Math.abs(car.y - LANDMARKS.spray.y) > 140) return;
  G.cash -= SPRAY_PRICE;
  G.wanted.clear();
  car.health = 100;
  car.color = ['#d21f3c', '#1f6fd2', '#f5f5f5', '#2e6da4'][G.rng.int(0, 3)];
  G.audio.jingle();
  G.banner = { text: `RESPRAYED: HEAT CLEARED ($${SPRAY_PRICE})`, t: 2.5, color: '#c084fc' };
  G.saveGame();
}

function respawn() {
  const p = G.player;
  G.cash = Math.max(0, G.cash - BUSTED_PENALTY);
  G.wanted.clear();
  G.cars = G.cars.filter((c) => !c.police);
  G.peds = G.peds.filter((ped) => !ped.police);
  p.car = null;
  p.onFoot = true;
  p.health = PLAYER.health;
  p.ammo = PLAYER.ammo;
  p.x = LANDMARKS.hospital.x;
  p.y = LANDMARKS.hospital.y + 170;
  p.angle = -Math.PI / 2;
  G.cam.x = p.x;
  G.cam.y = p.y;
  G.busted = false;
  G.mode = 'play';
  G.banner = { text: 'BACK ON THE STREET', t: 2.5, color: '#7ddc8a' };
  G.saveGame();
  updateStatus();
}

function activateMenu() {
  const item = G.menuItems[G.menuIndex];
  if (!item) return;
  if (G.mode === 'title') {
    if (item.action === 'continue') continueGame();
    else if (item.action === 'new') startNewGame();
    else if (item.action === 'help') G.helpOpen = !G.helpOpen;
  } else if (G.mode === 'paused') {
    if (item.action === 'resume') G.mode = 'play';
    else if (item.action === 'restart') {
      startMission(G, G.mission.index);
      G.mode = 'play';
    } else if (item.action === 'sound') {
      audio.setMuted(!audio.isMuted());
      item.label = audio.isMuted() ? 'SOUND: OFF' : 'SOUND: ON';
    } else if (item.action === 'quit') {
      G.saveGame();
      G.mode = 'title';
      G.menuItems = titleMenuItems(G);
      G.menuIndex = 0;
    }
  }
}

function menuStep(dir) {
  const n = G.menuItems.length;
  if (n === 0) return;
  G.menuIndex = (G.menuIndex + dir + n) % n;
}

function updateCamera(dt) {
  const p = G.player;
  const look = p.car ? Math.abs(p.car.speed) * 0.22 : 0;
  const tx = p.x + Math.cos(p.angle) * look;
  const ty = p.y + Math.sin(p.angle) * look;
  const targetZoom = p.car ? 0.92 - Math.min(0.14, Math.abs(p.car.speed) * 0.00012) : 1.0;
  G.cam.x += (tx - G.cam.x) * Math.min(1, dt * 5);
  G.cam.y += (ty - G.cam.y) * Math.min(1, dt * 5);
  G.cam.zoom += (targetZoom - G.cam.zoom) * Math.min(1, dt * 3);
  G.cam.mouseWorldX = G.cam.x + (input.mouse.x - G.viewW / 2) / G.cam.zoom;
  G.cam.mouseWorldY = G.cam.y + (input.mouse.y - G.viewH / 2) / G.cam.zoom;
}

function update(dt) {
  G.time += dt;
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 22);
  if (G.banner) {
    G.banner.t -= dt;
    if (G.banner.t <= 0) G.banner = null;
  }
  if (G.phone) {
    G.phone.t -= dt;
    if (G.phone.t <= 0) G.phone = null;
  }
  if (G.storyBannerT > 0) G.storyBannerT -= dt;

  if (G.mode === 'title') {
    // A slow pan over the living city behind the menu.
    G.cam.x = 2600 + Math.sin(G.time * 0.05) * 900;
    G.cam.y = 1900 + Math.cos(G.time * 0.04) * 500;
    G.cam.zoom = 0.8;
    updateTraffic(G, dt);
    updatePedestrians(G, dt);
    updateParticles(G, dt);
    if (input.pressed('KeyW') || input.pressed('ArrowUp')) menuStep(-1);
    if (input.pressed('KeyS') || input.pressed('ArrowDown')) menuStep(1);
    if (input.pressed('Enter') || input.mouse.clicked) activateMenu();
    return;
  }

  if (G.mode === 'paused') {
    if (input.pressed('KeyW') || input.pressed('ArrowUp')) menuStep(-1);
    if (input.pressed('KeyS') || input.pressed('ArrowDown')) menuStep(1);
    if (input.pressed('Enter')) activateMenu();
    if (input.pressed('Escape') || input.pressed('KeyP')) G.mode = 'play';
    return;
  }

  if (G.mode === 'busted' || G.mode === 'wasted') {
    if (input.pressed('Enter')) respawn();
    return;
  }

  // Play mode.
  if (input.keys.size > 0 || input.mouse.down) audio.ensure();
  if (input.pressed('KeyM')) audio.setMuted(!audio.isMuted());
  if (input.pressed('Escape') || input.pressed('KeyP')) {
    G.mode = 'paused';
    G.menuItems = pauseMenuItems();
    G.menuIndex = 0;
    return;
  }
  if (G.phone && input.pressed('Enter')) {
    G.phone = null;
  } else if (!G.phone && G.mission.failed && input.pressed('Enter')) {
    G.mission.failed = false;
    startMission(G, G.mission.index);
  }
  if (input.pressed('KeyE')) {
    if (G.player.onFoot) enterCar();
    else exitCar();
  }
  if (input.pressed('KeyQ')) respray();

  if (G.player.onFoot) updatePlayerOnFoot(G, dt, input);
  else updatePlayerCar(G, dt, input);
  updateTraffic(G, dt);
  updatePedestrians(G, dt);
  updatePolice(G, dt);
  G.wanted.update(dt);
  updateMission(G, dt);
  updateSideJob(G, dt);
  updateParticles(G, dt);
  resolveBumps(G, dt);
  updateCamera(dt);

  const car = G.player.car;
  const speedRatio = car ? Math.min(1, Math.abs(car.speed) / 640) : 0;
  audio.engine(speedRatio, !!car);
  audio.siren(G.wanted.level > 0, dt);
  audio.update(dt, true);

  if (G.busted) {
    G.busted = false;
    if (G.mission.active) failMission(G, 'BUSTED');
    G.mode = 'busted';
    updateStatus();
    return;
  }
  if (G.player.health <= 0) {
    if (G.mission.active) failMission(G, 'WASTED');
    G.mode = 'wasted';
    updateStatus();
  }
}

let last = performance.now();
function frame(now) {
  const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
  last = now;
  let acc = elapsed;
  let consumed = false;
  while (acc >= STEP) {
    update(STEP);
    // Edges are consumed by the first step of the frame only, so a press that
    // lands while the frame is rendering is seen by the next frame, never lost.
    if (!consumed) { input.endFrame(); consumed = true; }
    acc -= STEP;
  }
  renderer.render(G);
  requestAnimationFrame(frame);
}

if (shot) {
  stageShot(G, shot, renderer);
} else {
  updateStatus();
  requestAnimationFrame(frame);
}
