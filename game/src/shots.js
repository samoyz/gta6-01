// The screenshot scenes behind ?shot=title|chase|drive|foot. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered by
// a simple autopilot that follows the road ahead, so the frame is what a short
// game really looks like and the same seed always gives the same frame.
import { LANDMARKS, STEP } from './config.js';
import { makeCar, resolveBumps, updateParticles, updatePedestrians, updatePlayerCar, updatePlayerOnFoot, updatePolice, updateTraffic } from './entities.js';
import { startMission } from './missions.js';

// A virtual input that drives forward and steers toward the road ahead.
function autopilotInput(G) {
  return {
    axis() {
      const car = G.player.car;
      if (!car) return { x: 0, y: 0 };
      const ahead = { x: car.x + Math.cos(car.angle) * 220, y: car.y + Math.sin(car.angle) * 220 };
      const road = G.city.nearestRoadPoint(ahead.x, ahead.y);
      const desired = Math.atan2(road.y - car.y, road.x - car.x);
      let diff = desired - car.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      return { x: Math.max(-1, Math.min(1, diff * 2.2)), y: -1 };
    },
    down() { return false; },
    pressed() { return false; },
    mouse: { x: 640, y: 360, down: false, clicked: false },
    endFrame() {},
  };
}

function idleInput() {
  return {
    axis() { return { x: 0, y: 0 }; },
    down() { return false; },
    pressed() { return false; },
    mouse: { x: 640, y: 360, down: false, clicked: false },
    endFrame() {},
  };
}

function stepWorld(G, dt, vinput) {
  if (G.player.onFoot) updatePlayerOnFoot(G, dt, vinput);
  else updatePlayerCar(G, dt, vinput);
  updateTraffic(G, dt);
  updatePedestrians(G, dt);
  updatePolice(G, dt);
  G.wanted.update(dt);
  updateParticles(G, dt);
  resolveBumps(G, dt);
  const p = G.player;
  const look = p.car ? Math.abs(p.car.speed) * 0.15 : 0;
  G.cam.x = p.x + Math.cos(p.angle) * look;
  G.cam.y = p.y + Math.sin(p.angle) * look;
  G.time += dt;
}

function finish(G, renderer) {
  renderer.render(G);
  renderer.render(G);
  window.__shotReady = true;
}

export function stageShot(G, kind, renderer) {
  G.time = 30; // past the early controls reminder
  if (kind === 'title') {
    G.mode = 'title';
    G.cam.x = 2600;
    G.cam.y = 1900;
    G.cam.zoom = 0.8;
    for (let i = 0; i < 120; i += 1) {
      updateTraffic(G, STEP);
      updatePedestrians(G, STEP);
      updateParticles(G, STEP);
      G.time += STEP;
    }
    finish(G, renderer);
    return;
  }

  if (kind === 'chase') {
    // The cover: a Comet GT mid-getaway, three stars, interceptors closing in.
    G.mode = 'play';
    const car = makeCar('sports', 1800, 1800, 0, { driver: true });
    car.color = '#d21f3c';
    car.speed = 480;
    G.cars.push(car);
    G.player.car = car;
    G.player.onFoot = false;
    G.player.x = car.x;
    G.player.y = car.y;
    G.player.angle = 0;
    G.cam.zoom = 0.92;
    startMission(G, 3);
    G.mission.stage = 1;
    G.mission.crew = 3;
    G.mission.target = null;
    G.mission.label = 'Lose the heat. Break line of sight until the stars fall';
    G.wanted.set(3);
    G.phone = null;
    G.banner = { text: 'LOSE THE HEAT!', t: 99, color: '#ff5a5a' };
    const cop1 = makeCar('police', 1520, 1824, 0, { police: true });
    cop1.speed = 420;
    const cop2 = makeCar('police', 1460, 1776, 0, { police: true });
    cop2.speed = 400;
    G.cars.push(cop1, cop2);
    const vinput = autopilotInput(G);
    for (let i = 0; i < 150; i += 1) stepWorld(G, STEP, vinput);
    // Re-stage the frame: three stars, the banner, the player's car undamaged,
    // and both interceptors right behind it where the camera can see them.
    G.wanted.set(3);
    G.banner = { text: 'LOSE THE HEAT!', t: 99, color: '#ff5a5a' };
    car.health = 100;
    const fx = Math.cos(car.angle);
    const fy = Math.sin(car.angle);
    cop1.x = car.x - fx * 175 - fy * 40; cop1.y = car.y - fy * 175 + fx * 40;
    cop1.angle = car.angle; cop1.speed = 380;
    cop2.x = car.x - fx * 235 + fy * 44; cop2.y = car.y - fy * 235 - fx * 44;
    cop2.angle = car.angle; cop2.speed = 360;
    G.cam.x = car.x + fx * 60;
    G.cam.y = car.y + fy * 60;
    finish(G, renderer);
    return;
  }

  if (kind === 'drive') {
    // Daytime cruise down Palma Ave in a cab, traffic and pedestrians around.
    G.mode = 'play';
    const car = makeCar('taxi', 2300, 1300, Math.PI / 2, { driver: true });
    car.speed = 320;
    G.cars.push(car);
    G.player.car = car;
    G.player.onFoot = false;
    G.player.x = car.x;
    G.player.y = car.y;
    G.player.angle = Math.PI / 2;
    G.cam.zoom = 0.95;
    startMission(G, 1);
    G.phone = null;
    const vinput = autopilotInput(G);
    for (let i = 0; i < 120; i += 1) stepWorld(G, STEP, vinput);
    car.health = 100;
    finish(G, renderer);
    return;
  }

  if (kind === 'foot') {
    // On foot outside Solmar Bank with the cash, four stars closing in.
    G.mode = 'play';
    G.player.x = LANDMARKS.bank.x;
    G.player.y = LANDMARKS.bank.y + 190;
    G.player.angle = Math.PI / 2;
    G.player.onFoot = true;
    G.cam.zoom = 1.0;
    startMission(G, 5);
    G.mission.stage = 2;
    G.mission.hasCash = true;
    G.mission.target = { x: LANDMARKS.safehouse.x, y: LANDMARKS.safehouse.y + 110, label: 'Safehouse' };
    G.mission.label = 'Escape to the Safehouse with the cash. 4 stars of heat';
    G.wanted.set(4);
    G.phone = null;
    G.banner = { text: 'ALARM TRIPPED: 4 STARS, RUN', t: 99, color: '#ff5a5a' };
    for (const [dx, dy] of [[-250, -130], [260, -110]]) {
      G.peds.push({
        kind: 'ped', x: G.player.x + dx, y: G.player.y + dy,
        angle: 0, speed: 215, target: null, state: 'walk', stateTimer: 0,
        color: '#1c2f6e', police: true, arrest: 0, down: 0,
      });
    }
    const cop1 = makeCar('police', 2050, 1350, Math.PI, { police: true });
    cop1.speed = 300;
    const cop2 = makeCar('police', 1150, 800, 0, { police: true });
    cop2.speed = 300;
    G.cars.push(cop1, cop2);
    const vinput = idleInput();
    for (let i = 0; i < 50; i += 1) stepWorld(G, STEP, vinput);
    // Re-stage the frame: four stars, the alarm banner, the player unhurt.
    G.wanted.set(4);
    G.banner = { text: 'ALARM TRIPPED: 4 STARS, RUN', t: 99, color: '#ff5a5a' };
    G.player.health = 100;
    G.cam.x = G.player.x;
    G.cam.y = G.player.y;
    finish(G, renderer);
    return;
  }

  // Unknown scene: paint the title.
  G.mode = 'title';
  finish(G, renderer);
}
