// Everything that moves in Solmar City: the player's car and feet, traffic,
// pedestrians, police cruisers and foot cops, bullets and particles.
import { AVENUES, CAR_TYPES, PLAYER, STREETS, WORLD } from './config.js';

export function makeCar(type, x, y, angle, opts = {}) {
  const spec = CAR_TYPES[type];
  return {
    kind: 'car', type, x, y, angle, speed: 0,
    length: spec.length, width: spec.width,
    color: opts.color || spec.colors[0],
    health: 100, driver: opts.driver !== false, police: !!opts.police,
    parked: !!opts.parked, dir: opts.dir ?? 0, cruise: 0,
    turnCooldown: 0, smoking: false, dead: false,
  };
}

export function spawnTraffic(G, count) {
  for (let i = 0; i < count; i += 1) {
    const p = G.city.randomRoadPoint(G.rng);
    const dir = G.rng.int(0, 3);
    const type = G.rng.pick(['sedan', 'sedan', 'sedan', 'taxi', 'van', 'truck', 'sports']);
    const car = makeCar(type, p.x, p.y, (dir * Math.PI) / 2, { dir });
    car.cruise = G.rng.range(140, 240);
    // Snap onto the right-hand lane of its road.
    if (dir === 0) car.y += 22; else if (dir === 2) car.y -= 22;
    else if (dir === 1) car.x -= 22; else car.x += 22;
    G.cars.push(car);
  }
}

export function spawnParkedCars(G) {
  for (const spot of G.city.parkedCars) {
    const car = makeCar(spot.type, spot.x, spot.y, spot.angle, { driver: false, parked: true });
    car.color = CAR_TYPES[spot.type].colors[G.rng.int(0, CAR_TYPES[spot.type].colors.length - 1)];
    G.cars.push(car);
  }
}

export function spawnPedestrians(G, count) {
  const shirts = ['#e74c3c', '#3498db', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22', '#ecf0f1', '#fd79a8'];
  for (let i = 0; i < count; i += 1) {
    const p = G.city.randomRoadPoint(G.rng);
    G.peds.push({
      kind: 'ped', x: p.x + G.rng.range(-60, 60), y: p.y + G.rng.range(-60, 60),
      angle: G.rng.range(0, Math.PI * 2), speed: G.rng.range(45, 70),
      target: null, state: 'walk', stateTimer: 0, color: G.rng.pick(shirts),
      police: false, arrest: 0, down: 0,
    });
  }
}

export function addParticle(G, p) {
  G.particles.push({ life: p.life ?? 0.6, maxLife: p.life ?? 0.6, ...p });
}

export function addSkid(G, x1, y1, x2, y2) {
  G.skids.push({ x1, y1, x2, y2, life: 5 });
  if (G.skids.length > 220) G.skids.splice(0, G.skids.length - 220);
}

function dist2(ax, ay, bx, by) { const dx = ax - bx; const dy = ay - by; return dx * dx + dy * dy; }

export function nearestCar(G, x, y, maxDist) {
  let best = null;
  let bestD = maxDist * maxDist;
  for (const car of G.cars) {
    if (car.dead) continue;
    const d = dist2(x, y, car.x, car.y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

function carFront(car) {
  return { x: car.x + Math.cos(car.angle) * (car.length / 2), y: car.y + Math.sin(car.angle) * (car.length / 2) };
}

function carRear(car) {
  return { x: car.x - Math.cos(car.angle) * (car.length / 2), y: car.y - Math.sin(car.angle) * (car.length / 2) };
}

function collideCarWithCity(G, car) {
  const f = carFront(car);
  const r = carRear(car);
  const radius = car.width / 2 + 2;
  const hitF = G.city.collideCircle(f, radius);
  const hitR = G.city.collideCircle(r, radius);
  if (hitF || hitR) {
    car.x = (f.x + r.x) / 2;
    car.y = (f.y + r.y) / 2;
    if (Math.abs(car.speed) > 120) {
      car.health -= Math.abs(car.speed) * 0.04;
      addParticle(G, { kind: 'spark', x: f.x, y: f.y, vx: 0, vy: 0, life: 0.3, size: 5, color: '#ffd76a' });
      if (car === G.player.car) G.audio.crash();
    }
    car.speed *= 0.4;
    return true;
  }
  return false;
}

function damageCar(G, car, amount) {
  car.health -= amount;
  if (car.health <= 0 && !car.dead) {
    car.dead = true;
    addParticle(G, { kind: 'boom', x: car.x, y: car.y, vx: 0, vy: 0, life: 0.7, size: 46, color: '#ff9f1c' });
    addParticle(G, { kind: 'smoke', x: car.x, y: car.y, vx: 0, vy: -30, life: 1.4, size: 30, color: '#555' });
    G.audio.crash();
    if (car === G.player.car) {
      G.player.car = null;
      G.player.onFoot = true;
      G.player.health = 0;
    }
  }
}

export function updatePlayerCar(G, dt, input) {
  const car = G.player.car;
  if (!car) return;
  const spec = CAR_TYPES[car.type];
  const axis = input.axis();
  const up = axis.y < 0;
  const down = axis.y > 0;
  const steer = axis.x;
  if (up) car.speed += spec.accel * dt;
  if (down) {
    if (car.speed > 20) car.speed -= spec.accel * 1.6 * dt;
    else car.speed -= spec.accel * 0.6 * dt;
  }
  const handbrake = input.down('Space');
  const drag = handbrake ? 2.2 : 0.55;
  car.speed -= car.speed * drag * dt;
  if (!up && !down && Math.abs(car.speed) < 8) car.speed = 0;
  car.speed = Math.max(-190, Math.min(spec.topSpeed, car.speed));
  const grip = handbrake ? 1.7 : 1;
  const speedRatio = Math.min(1, Math.abs(car.speed) / spec.topSpeed);
  car.angle += steer * spec.turn * grip * (0.35 + 0.65 * speedRatio) * dt * Math.sign(car.speed || 1);
  const prevX = car.x;
  const prevY = car.y;
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  if (Math.abs(car.speed) > 260 && handbrake) addSkid(G, prevX, prevY, car.x, car.y);
  const hit = collideCarWithCity(G, car);
  if (hit && Math.abs(car.speed) > 200) G.shake = Math.min(10, Math.abs(car.speed) * 0.02);
  G.player.x = car.x;
  G.player.y = car.y;
  G.player.angle = car.angle;
  if (car.health < 45 && !car.smoking) {
    car.smoking = true;
  }
  if (car.smoking && G.rng.chance(dt * 8)) {
    addParticle(G, { kind: 'smoke', x: car.x, y: car.y - 6, vx: G.rng.range(-10, 10), vy: G.rng.range(-40, -15), life: 0.9, size: 12, color: '#666' });
  }
}

export function updatePlayerOnFoot(G, dt, input) {
  const p = G.player;
  const axis = input.axis();
  const running = input.down('ShiftLeft') || input.down('ShiftRight');
  const speed = running ? PLAYER.runSpeed : PLAYER.walkSpeed;
  let mx = axis.x;
  let my = axis.y;
  const len = Math.hypot(mx, my);
  if (len > 0) { mx /= len; my /= len; p.angle = Math.atan2(my, mx); }
  const prevX = p.x;
  const prevY = p.y;
  p.x += mx * speed * dt;
  p.y += my * speed * dt;
  const pos = { x: p.x, y: p.y };
  G.city.collideCircle(pos, PLAYER.radius);
  p.x = pos.x;
  p.y = pos.y;
  if (p.reloadTimer > 0) {
    p.reloadTimer -= dt;
    if (p.reloadTimer <= 0) { p.reloadTimer = 0; p.ammo = PLAYER.ammo; }
  }
  // Aim with the mouse, shoot with click or F.
  const aimX = G.cam.mouseWorldX - p.x;
  const aimY = G.cam.mouseWorldY - p.y;
  p.aim = Math.atan2(aimY, aimX);
  const wantShoot = input.mouse.clicked || input.down('KeyF');
  if (wantShoot && p.shootCooldown <= 0 && p.reloadTimer <= 0) {
    p.shootCooldown = 0.28;
    if (p.ammo > 0) {
      p.ammo -= 1;
      shoot(G, p);
    } else {
      p.reloadTimer = 1.1;
    }
  }
  if (p.shootCooldown > 0) p.shootCooldown -= dt;
  if (input.pressed('KeyR') && p.ammo < PLAYER.ammo) p.reloadTimer = 1.1;
}

function shoot(G, p) {
  G.audio.shot();
  const range = 430;
  const mx = p.x + Math.cos(p.aim) * 14;
  const my = p.y + Math.sin(p.aim) * 14;
  addParticle(G, { kind: 'muzzle', x: mx, y: my, vx: 0, vy: 0, life: 0.08, size: 10, color: '#ffe27a' });
  let best = null;
  let bestD = range;
  let bestIsCar = false;
  for (const ped of G.peds) {
    if (ped.state === 'down') continue;
    const dx = ped.x - p.x;
    const dy = ped.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d > range) continue;
    const ang = Math.atan2(dy, dx);
    let diff = Math.abs(ang - p.aim);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    if (diff < 0.14 && d < bestD) { bestD = d; best = ped; bestIsCar = false; }
  }
  for (const car of G.cars) {
    if (car.dead || car === G.player.car) continue;
    const dx = car.x - p.x;
    const dy = car.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d > range) continue;
    const ang = Math.atan2(dy, dx);
    let diff = Math.abs(ang - p.aim);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    if (diff < 0.16 && d < bestD) { bestD = d; best = car; bestIsCar = true; }
  }
  const hx = p.x + Math.cos(p.aim) * bestD;
  const hy = p.y + Math.sin(p.aim) * bestD;
  addParticle(G, { kind: 'tracer', x: mx, y: my, x2: hx, y2: hy, vx: 0, vy: 0, life: 0.09, size: 2, color: '#fff3a0' });
  if (best) {
    if (bestIsCar) {
      damageCar(G, best, 22);
      addParticle(G, { kind: 'spark', x: hx, y: hy, vx: 0, vy: 0, life: 0.25, size: 5, color: '#ffd76a' });
      if (best.police) G.wanted.add(1, 'shot at police');
    } else {
      best.state = 'down';
      best.down = 4;
      best.stateTimer = 0;
      if (best.police) {
        G.wanted.add(2, 'shot a cop');
      } else if (G.wanted.witnessed(p.x, p.y)) {
        G.wanted.add(1, 'shot a pedestrian');
      }
      scareNearbyPeds(G, hx, hy, 320);
    }
  }
}

export function scareNearbyPeds(G, x, y, radius) {
  for (const ped of G.peds) {
    if (ped.police || ped.state === 'down') continue;
    if (dist2(ped.x, ped.y, x, y) < radius * radius) {
      ped.state = 'flee';
      ped.stateTimer = 2.2;
      ped.fleeX = x;
      ped.fleeY = y;
    }
  }
}

function trafficBlockedAhead(G, car) {
  const aheadX = car.x + Math.cos(car.angle) * 70;
  const aheadY = car.y + Math.sin(car.angle) * 70;
  for (const other of G.cars) {
    if (other === car || other.dead) continue;
    if (dist2(aheadX, aheadY, other.x, other.y) < 42 * 42) return true;
  }
  const p = G.player;
  if (!p.onFoot && p.car && p.car !== car && dist2(aheadX, aheadY, p.car.x, p.car.y) < 46 * 46) return true;
  return false;
}

export function updateTraffic(G, dt) {
  for (const car of G.cars) {
    if (car.dead || car.police || car === G.player.car || car.parked) continue;
    car.turnCooldown -= dt;
    const speedTarget = trafficBlockedAhead(G, car) ? 0 : car.cruise;
    car.speed += (speedTarget - car.speed) * Math.min(1, dt * 1.6);
    if (Math.abs(car.speed) < 2) car.speed = 0;
    // At an intersection, maybe turn. Lane offset keeps right-hand traffic.
    const nearAvenue = AVENUES.find((a) => Math.abs(car.x - a) < 34);
    const nearStreet = STREETS.find((s) => Math.abs(car.y - s) < 34);
    if (nearAvenue !== undefined && nearStreet !== undefined && car.turnCooldown <= 0) {
      car.turnCooldown = 1.2;
      const roll = G.rng.next();
      let newDir = car.dir;
      if (roll < 0.16) newDir = (car.dir + 1) % 4;
      else if (roll < 0.32) newDir = (car.dir + 3) % 4;
      if (newDir !== car.dir) {
        car.dir = newDir;
        car.x = nearAvenue;
        car.y = nearStreet;
      }
    }
    const targetAngle = (car.dir * Math.PI) / 2;
    let diff = targetAngle - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.angle += diff * Math.min(1, dt * 6);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    // Ease back onto the lane centre.
    if (car.dir === 0) car.y += (nearStreetValue(car) + 22 - car.y) * Math.min(1, dt * 3);
    if (car.dir === 2) car.y += (nearStreetValue(car) - 22 - car.y) * Math.min(1, dt * 3);
    if (car.dir === 1) car.x += (nearAvenueValue(car) - 22 - car.x) * Math.min(1, dt * 3);
    if (car.dir === 3) car.x += (nearAvenueValue(car) + 22 - car.x) * Math.min(1, dt * 3);
    if (car.x < 60) { car.x = 60; car.dir = 0; }
    if (car.x > WORLD.width - 60) { car.x = WORLD.width - 60; car.dir = 2; }
    if (car.y < 60) { car.y = 60; car.dir = 1; }
    if (car.y > WORLD.height - 60) { car.y = WORLD.height - 60; car.dir = 3; }
  }
}

function nearStreetValue(car) {
  let best = STREETS[0];
  let bestD = Infinity;
  for (const s of STREETS) { const d = Math.abs(car.y - s); if (d < bestD) { bestD = d; best = s; } }
  return best;
}

function nearAvenueValue(car) {
  let best = AVENUES[0];
  let bestD = Infinity;
  for (const a of AVENUES) { const d = Math.abs(car.x - a); if (d < bestD) { bestD = d; best = a; } }
  return best;
}

export function updatePedestrians(G, dt) {
  for (const ped of G.peds) {
    if (ped.state === 'down') {
      ped.down -= dt;
      if (ped.down <= 0) { ped.state = 'flee'; ped.stateTimer = 2.5; ped.fleeX = G.player.x; ped.fleeY = G.player.y; }
      continue;
    }
    if (ped.police) continue; // foot cops are updated by updatePolice
    if (ped.state === 'flee') {
      ped.stateTimer -= dt;
      const away = Math.atan2(ped.y - ped.fleeY, ped.x - ped.fleeX);
      ped.angle = away;
      ped.x += Math.cos(away) * 150 * dt;
      ped.y += Math.sin(away) * 150 * dt;
      const pos = { x: ped.x, y: ped.y };
      G.city.collideCircle(pos, 10);
      ped.x = pos.x; ped.y = pos.y;
      if (ped.stateTimer <= 0) ped.state = 'walk';
      continue;
    }
    if (!ped.target || dist2(ped.x, ped.y, ped.target.x, ped.target.y) < 30 * 30) {
      const p = G.city.randomRoadPoint(G.rng);
      ped.target = { x: p.x + G.rng.range(-70, 70), y: p.y + G.rng.range(-70, 70) };
    }
    const ang = Math.atan2(ped.target.y - ped.y, ped.target.x - ped.x);
    ped.angle = ang;
    ped.x += Math.cos(ang) * ped.speed * dt;
    ped.y += Math.sin(ang) * ped.speed * dt;
    const pos = { x: ped.x, y: ped.y };
    G.city.collideCircle(pos, 10);
    ped.x = pos.x; ped.y = pos.y;
  }
}

export function updatePolice(G, dt) {
  const p = G.player;
  for (const car of G.cars) {
    if (!car.police || car.dead) continue;
    const dx = p.x - car.x;
    const dy = p.y - car.y;
    const d = Math.hypot(dx, dy);
    const targetAngle = Math.atan2(dy, dx);
    let diff = targetAngle - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const spec = CAR_TYPES.police;
    car.angle += Math.max(-1, Math.min(1, diff * 2.4)) * spec.turn * dt;
    const want = d > 90 ? spec.topSpeed : spec.topSpeed * 0.45;
    car.speed += (want - car.speed) * Math.min(1, dt * 1.4);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    collideCarWithCity(G, car);
    // Ramming the player's car hurts it; ramming the player on foot hurts the player.
    if (car !== p.car) {
      const both = p.car;
      if (both && dist2(car.x, car.y, both.x, both.y) < 44 * 44) {
        damageCar(G, both, 5 * dt);
        car.speed *= 0.92;
        if (Math.abs(car.speed) > 200 && G.rng.chance(dt * 4)) G.audio.crash();
      }
      if (p.onFoot && d < 30) {
        p.health -= 14 * dt;
        G.shake = 6;
      }
    }
  }
  // Foot cops chase the player on foot and arrest them.
  for (const cop of G.peds) {
    if (!cop.police || cop.state === 'down') continue;
    const dx = p.x - cop.x;
    const dy = p.y - cop.y;
    const d = Math.hypot(dx, dy);
    const ang = Math.atan2(dy, dx);
    cop.angle = ang;
    if (p.onFoot) {
      cop.x += Math.cos(ang) * 215 * dt;
      cop.y += Math.sin(ang) * 215 * dt;
      if (d < 26) {
        cop.arrest += dt;
        if (cop.arrest > 0.9) {
          G.busted = true;
        }
      } else {
        cop.arrest = Math.max(0, cop.arrest - dt);
      }
    } else {
      // Player escaped in a car: the cop gives up and heads for the nearest road.
      const road = G.city.nearestRoadPoint(cop.x, cop.y);
      const a2 = Math.atan2(road.y - cop.y, road.x - cop.x);
      cop.x += Math.cos(a2) * 150 * dt;
      cop.y += Math.sin(a2) * 150 * dt;
      if (d > 700) cop.remove = true;
    }
    const pos = { x: cop.x, y: cop.y };
    G.city.collideCircle(pos, 10);
    cop.x = pos.x; cop.y = pos.y;
  }
  G.peds = G.peds.filter((ped) => !ped.remove);
}

export function updateParticles(G, dt) {
  for (const pt of G.particles) {
    pt.life -= dt;
    pt.x += (pt.vx || 0) * dt;
    pt.y += (pt.vy || 0) * dt;
    if (pt.kind === 'smoke') pt.size += 14 * dt;
  }
  G.particles = G.particles.filter((pt) => pt.life > 0);
  for (const s of G.skids) s.life -= dt;
  G.skids = G.skids.filter((s) => s.life > 0);
}

// Car-vs-car and car-vs-pedestrian bumps, run after every mover has stepped.
export function resolveBumps(G, dt) {
  const p = G.player;
  for (let i = 0; i < G.cars.length; i += 1) {
    const a = G.cars[i];
    if (a.dead) continue;
    for (let j = i + 1; j < G.cars.length; j += 1) {
      const b = G.cars[j];
      if (b.dead) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const min = 34;
      if (d > 0 && d < min) {
        const push = (min - d) / 2;
        const nx = dx / d;
        const ny = dy / d;
        a.x -= nx * push; a.y -= ny * push;
        b.x += nx * push; b.y += ny * push;
        const impact = Math.abs(a.speed - b.speed);
        if (impact > 140) {
          damageCar(G, a, impact * 0.02);
          damageCar(G, b, impact * 0.02);
          if ((a === p.car || b === p.car) && impact > 220) G.audio.crash();
        }
        a.speed *= 0.94;
        b.speed *= 0.94;
      }
    }
    // Cars mowing down pedestrians.
    if (Math.abs(a.speed) > 60) {
      for (const ped of G.peds) {
        if (ped.state === 'down') continue;
        if (dist2(a.x, a.y, ped.x, ped.y) < 30 * 30) {
          ped.state = 'down';
          ped.down = 5;
          a.speed *= 0.7;
          if (ped.police) {
            // Only the player's own car running over a cop is a crime.
            if (a === p.car) G.wanted.add(2, 'ran over a cop');
          } else if (a === p.car && G.wanted.witnessed(ped.x, ped.y)) {
            G.wanted.add(1, 'hit a pedestrian');
          }
          scareNearbyPeds(G, ped.x, ped.y, 300);
        }
      }
    }
    if (p.onFoot && a !== p.car && dist2(a.x, a.y, p.x, p.y) < 30 * 30 && Math.abs(a.speed) > 120) {
      p.health -= 18;
      p.x += (p.x - a.x) * 0.6;
      p.y += (p.y - a.y) * 0.6;
      G.shake = 8;
      G.audio.crash();
    }
  }
}
