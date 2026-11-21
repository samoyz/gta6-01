// Solmar City: a road grid, blocks of buildings, parks and parking lots, a beach
// and sea on the east edge, and the story landmarks. Generation is seeded, so a
// seed always builds the same city. This file also answers the spatial questions
// the rest of the game asks: is this point on a road, what building is here.
import { AVENUES, BEACH_X, LANDMARKS, PALETTE, ROAD_WIDTH, SEA_X, STREETS, WORLD } from './config.js';

const HALF = ROAD_WIDTH / 2;

export function createCity(rng) {
  const buildings = [];
  const parks = [];
  const parkingLots = [];
  const palms = [];
  const parkedCars = [];

  // Landmark blocks are plazas holding one big named building; the rest roll a kind.
  const landmarkBlocks = new Set(['1,3', '2,1', '8,1', '0,6', '5,5', '7,2', '4,4']);
  for (let i = 0; i < AVENUES.length - 1; i += 1) {
    for (let j = 0; j < STREETS.length - 1; j += 1) {
      const x0 = AVENUES[i] + HALF + 8;
      const y0 = STREETS[j] + HALF + 8;
      const x1 = AVENUES[i + 1] - HALF - 8;
      const y1 = STREETS[j + 1] - HALF - 8;
      if (x1 - x0 < 60 || y1 - y0 < 60) continue;
      const key = `${i},${j}`;
      if (landmarkBlocks.has(key)) continue;
      const roll = rng.next();
      if (roll < 0.12) {
        const trees = [];
        const treeCount = rng.int(6, 12);
        for (let t = 0; t < treeCount; t += 1) {
          trees.push({ x: rng.range(x0 + 20, x1 - 20), y: rng.range(y0 + 20, y1 - 20), r: rng.range(9, 15) });
        }
        parks.push({
          x0, y0, x1, y1, trees,
          pond: rng.chance(0.5) ? { x: (x0 + x1) / 2, y: (y0 + y1) / 2, rx: rng.range(40, 70), ry: rng.range(25, 45) } : null,
        });
      } else if (roll < 0.22) {
        parkingLots.push({ x0, y0, x1, y1 });
        const count = rng.int(3, 6);
        for (let c = 0; c < count; c += 1) {
          parkedCars.push({
            x: rng.range(x0 + 30, x1 - 30),
            y: rng.range(y0 + 30, y1 - 30),
            angle: rng.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]),
            type: rng.pick(['sedan', 'sedan', 'van', 'taxi']),
          });
        }
      } else {
        const count = rng.int(2, 4);
        for (let b = 0; b < count; b += 1) {
          const bw = rng.range(90, 170);
          const bh = rng.range(80, 150);
          const bx = rng.range(x0, Math.max(x0 + 1, x1 - bw));
          const by = rng.range(y0, Math.max(y0 + 1, y1 - bh));
          buildings.push({
            x: bx, y: by, w: bw, h: bh,
            color: rng.pick(PALETTE.building),
            height: rng.int(1, 3),
            windows: rng.int(2, 5),
          });
        }
      }
    }
  }

  // Landmark buildings, drawn bigger and labelled on the map.
  for (const [id, lm] of Object.entries(LANDMARKS)) {
    if (id === 'marina') continue; // the marina is a pier, not a building
    buildings.push({
      x: lm.x - lm.w / 2, y: lm.y - lm.h / 2, w: lm.w, h: lm.h,
      color: id === 'bank' ? '#e8d27a' : id === 'hospital' ? '#f5f5f5' : '#c98d5a',
      height: id === 'hotel' ? 3 : 2, windows: 6, landmark: id, name: lm.name,
    });
  }

  // Palms: a row along the beach, a few on plazas and parks.
  for (let y = 120; y < WORLD.height; y += 170) {
    palms.push({ x: BEACH_X + 55 + rng.range(-12, 12), y: y + rng.range(-30, 30), r: rng.range(10, 14) });
  }
  for (let p = 0; p < 26; p += 1) {
    palms.push({
      x: rng.range(150, BEACH_X - 100),
      y: rng.range(150, WORLD.height - 100),
      r: rng.range(9, 13),
    });
  }
  // Curb-parked cars along a few avenues: free to take, no wanted level.
  for (let c = 0; c < 14; c += 1) {
    const avenue = rng.pick(AVENUES);
    const street = rng.pick(STREETS);
    parkedCars.push({
      x: avenue + HALF - 14,
      y: street + rng.range(120, 340),
      angle: Math.PI / 2,
      type: rng.pick(['sedan', 'sedan', 'sports', 'taxi', 'van']),
    });
  }

  function onRoadBand(v, lines) {
    return lines.some((line) => Math.abs(v - line) <= HALF);
  }

  return {
    buildings, parks, parkingLots, palms, parkedCars,
    isRoad(x, y) {
      if (x >= BEACH_X || x < 0 || y < 0 || y >= WORLD.height) return false;
      return onRoadBand(x, AVENUES) || onRoadBand(y, STREETS);
    },
    onSidewalk(x, y) {
      if (x >= BEACH_X) return false;
      const nearAvenue = AVENUES.some((a) => Math.abs(x - a) <= HALF + 26);
      const nearStreet = STREETS.some((s) => Math.abs(y - s) <= HALF + 26);
      return (nearAvenue || nearStreet) && !this.isRoad(x, y);
    },
    buildingAt(x, y, pad = 0) {
      for (const b of buildings) {
        if (x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad) return b;
      }
      return null;
    },
    // Push a circle out of every building it overlaps; returns true when it hit one.
    collideCircle(pos, radius) {
      let hit = false;
      for (const b of buildings) {
        const cx = Math.max(b.x, Math.min(pos.x, b.x + b.w));
        const cy = Math.max(b.y, Math.min(pos.y, b.y + b.h));
        const dx = pos.x - cx;
        const dy = pos.y - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 < radius * radius) {
          hit = true;
          const d = Math.sqrt(d2) || 0.001;
          const push = radius - d;
          pos.x += (dx / d) * push;
          pos.y += (dy / d) * push;
        }
      }
      if (pos.x < 20) { pos.x = 20; hit = true; }
      if (pos.x > WORLD.width - 20) { pos.x = WORLD.width - 20; hit = true; }
      if (pos.y < 20) { pos.y = 20; hit = true; }
      if (pos.y > WORLD.height - 20) { pos.y = WORLD.height - 20; hit = true; }
      return hit;
    },
    randomRoadPoint(rng2) {
      if (rng2.chance(0.5)) {
        return { x: rng2.pick(AVENUES), y: rng2.range(120, WORLD.height - 120) };
      }
      return { x: rng2.range(120, BEACH_X - 120), y: rng2.pick(STREETS) };
    },
    nearestRoadPoint(x, y) {
      let best = null;
      let bestD = Infinity;
      for (const a of AVENUES) {
        const d = Math.abs(x - a);
        if (d < bestD) { bestD = d; best = { x: a, y }; }
      }
      for (const s of STREETS) {
        const d = Math.abs(y - s);
        if (d < bestD) { bestD = d; best = { x, y: s }; }
      }
      return best;
    },
  };
}
