// The wanted system: stars, police response, and losing the heat.
// The hook of the game lives here: commit a crime, the cops come, and the only
// way out is to break line of sight long enough for the heat to cool off.
import { WANTED_MAX } from './config.js';
import { makeCar } from './entities.js';

const EVADE_SECONDS = 4;
const EVADE_DISTANCE = 520;

export function createWanted(G) {
  const wanted = {
    level: 0,
    evade: 0,
    evading: false,
    add(n, reason) {
      if (wanted.level >= WANTED_MAX) return;
      wanted.level = Math.min(WANTED_MAX, wanted.level + n);
      wanted.evade = 0;
      wanted.evading = false;
      G.banner = { text: reason ? `WANTED LEVEL ${wanted.level} — ${reason.toUpperCase()}` : `WANTED LEVEL ${wanted.level}`, t: 2.2, color: '#ff5a5a' };
    },
    set(n) {
      wanted.level = Math.min(WANTED_MAX, n);
      wanted.evade = 0;
      wanted.evading = false;
    },
    clear() {
      wanted.level = 0;
      wanted.evade = 0;
      wanted.evading = false;
    },
    witnessed(x, y) {
      for (const car of G.cars) {
        if (car.police && !car.dead && Math.hypot(car.x - x, car.y - y) < 650) return true;
      }
      for (const ped of G.peds) {
        if (ped.state !== 'down' && Math.hypot(ped.x - x, ped.y - y) < 320) return true;
      }
      return false;
    },
    nearestPoliceDist() {
      let best = Infinity;
      for (const car of G.cars) {
        if (car.police && !car.dead) best = Math.min(best, Math.hypot(car.x - G.player.x, car.y - G.player.y));
      }
      for (const ped of G.peds) {
        if (ped.police && ped.state !== 'down') best = Math.min(best, Math.hypot(ped.x - G.player.x, ped.y - G.player.y));
      }
      return best;
    },
    update(dt) {
      const p = G.player;
      // Keep the police presence matched to the wanted level.
      const wantCruisers = wanted.level;
      const wantCops = p.onFoot && wanted.level >= 3 ? wanted.level - 2 : 0;
      let cruisers = 0;
      let cops = 0;
      for (const car of G.cars) if (car.police && !car.dead) cruisers += 1;
      for (const ped of G.peds) if (ped.police && ped.state !== 'down') cops += 1;
      if (cruisers < wantCruisers) {
        const spot = G.city.randomRoadPoint(G.rng);
        // Spawn on a road 450-750 px away from the player.
        let tries = 0;
        let sx = spot.x;
        let sy = spot.y;
        while (tries < 8) {
          const s2 = G.city.randomRoadPoint(G.rng);
          const d = Math.hypot(s2.x - p.x, s2.y - p.y);
          if (d > 450 && d < 800) { sx = s2.x; sy = s2.y; break; }
          tries += 1;
        }
        const cruiser = makeCar('police', sx, sy, 0, { police: true });
        cruiser.cruise = 0;
        G.cars.push(cruiser);
      }
      if (cops < wantCops) {
        const ang = G.rng.range(0, Math.PI * 2);
        const d = G.rng.range(320, 480);
        G.peds.push({
          kind: 'ped', x: p.x + Math.cos(ang) * d, y: p.y + Math.sin(ang) * d,
          angle: 0, speed: 215, target: null, state: 'walk', stateTimer: 0,
          color: '#1c2f6e', police: true, arrest: 0, down: 0,
        });
      }
      // Fade the police out once the heat is gone.
      if (wanted.level === 0) {
        for (const car of G.cars) {
          if (car.police && Math.hypot(car.x - p.x, car.y - p.y) > 1100) car.dead = true;
        }
        G.cars = G.cars.filter((c) => !c.dead || c === p.car);
        for (const ped of G.peds) {
          if (ped.police && Math.hypot(ped.x - p.x, ped.y - p.y) > 800) ped.remove = true;
        }
        G.peds = G.peds.filter((ped) => !ped.remove);
        return;
      }
      // Losing the heat: stay out of sight and the stars fall one at a time.
      const nearest = wanted.nearestPoliceDist();
      if (nearest > EVADE_DISTANCE) {
        wanted.evading = true;
        wanted.evade += dt;
        if (wanted.evade >= EVADE_SECONDS) {
          wanted.level -= 1;
          wanted.evade = 0;
          G.banner = { text: `HEAT DROPPED — ${wanted.level} STAR${wanted.level === 1 ? '' : 'S'} LEFT`, t: 2, color: '#7ddc8a' };
          if (wanted.level === 0) G.banner = { text: 'HEAT LOST — YOU ARE CLEAR', t: 2.5, color: '#7ddc8a' };
        }
      } else {
        wanted.evading = false;
        wanted.evade = 0;
      }
    },
  };
  return wanted;
}
