// Everything the player sees: the city from above, the cars and people in it,
// the HUD with its minimap and wanted stars, and the title, pause and end screens.
import { AVENUES, BEACH_X, CAR_TYPES, LANDMARKS, PALETTE, PLAYER, SEA_X, SPRAY_PRICE, STREETS, WORLD } from './config.js';
import { MISSIONS, currentObjective } from './missions.js';

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawPalm(ctx, x, y, r) {
  ctx.fillStyle = PALETTE.trunk;
  ctx.fillRect(x - 2, y - 2, 4, 4);
  ctx.fillStyle = PALETTE.palm;
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, r * 0.75, r * 0.32, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#2f7a3e';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

function drawCar(ctx, car, time) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(3, 4, car.length / 2 + 2, car.width / 2 + 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = car.color;
  rr(ctx, -car.length / 2, -car.width / 2, car.length, car.width, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
  if (car.type === 'police') {
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(-6, -car.width / 2, 12, car.width);
    const flash = Math.floor(time * 4) % 2 === 0;
    ctx.fillStyle = flash ? '#ff2d2d' : '#2d6bff';
    ctx.fillRect(-4, -car.width / 2 - 2, 8, 5);
    ctx.fillStyle = flash ? '#2d6bff' : '#ff2d2d';
    ctx.fillRect(-4, car.width / 2 - 3, 8, 5);
  } else if (car.type === 'taxi') {
    ctx.fillStyle = '#111';
    for (let i = 0; i < 5; i += 1) ctx.fillRect(-12 + i * 5, -car.width / 2 + 2, 3, 3);
    for (let i = 0; i < 5; i += 1) ctx.fillRect(-12 + i * 5, car.width / 2 - 5, 3, 3);
  }
  ctx.fillStyle = 'rgba(20,30,45,0.85)';
  rr(ctx, car.length * 0.08, -car.width / 2 + 3, car.length * 0.22, car.width - 6, 3);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  rr(ctx, -car.length * 0.28, -car.width / 2 + 3, car.length * 0.24, car.width - 6, 3);
  ctx.fill();
  ctx.fillStyle = '#fff8c9';
  ctx.beginPath();
  ctx.arc(car.length / 2 - 2, -car.width / 2 + 4, 2.2, 0, Math.PI * 2);
  ctx.arc(car.length / 2 - 2, car.width / 2 - 4, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff4b4b';
  ctx.beginPath();
  ctx.arc(-car.length / 2 + 2, -car.width / 2 + 4, 1.8, 0, Math.PI * 2);
  ctx.arc(-car.length / 2 + 2, car.width / 2 - 4, 1.8, 0, Math.PI * 2);
  ctx.fill();
  if (car.health < 45) {
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.moveTo(-6, -4); ctx.lineTo(4, 2); ctx.lineTo(-2, 6);
    ctx.stroke();
  }
  if (car.type === 'sports') {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(-car.length / 2 - 2, -car.width / 2 - 1, 3, car.width + 2);
  }
  ctx.restore();
}

function drawPed(ctx, ped) {
  ctx.save();
  ctx.translate(ped.x, ped.y);
  if (ped.state === 'down') {
    ctx.rotate(ped.angle + Math.PI / 2);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(0, 2, 12, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ped.color;
    ctx.beginPath(); ctx.ellipse(0, 0, 11, 5.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    return;
  }
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(1, 2, 9, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = ped.color;
  ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = ped.police ? '#12244d' : '#e8b98a';
  ctx.beginPath(); ctx.arc(0, -1, 4.5, 0, Math.PI * 2); ctx.fill();
  if (ped.police) {
    ctx.fillStyle = '#0c1a3a';
    ctx.fillRect(-5, -7, 10, 3);
  }
  ctx.restore();
}

function drawCity(ctx, G) {
  const city = G.city;
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  // Beach and sea on the east edge.
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(BEACH_X, 0, WORLD.width - BEACH_X, WORLD.height);
  const seaGrad = ctx.createLinearGradient(SEA_X, 0, WORLD.width, 0);
  seaGrad.addColorStop(0, PALETTE.seaShallow);
  seaGrad.addColorStop(1, PALETTE.seaDeep);
  ctx.fillStyle = seaGrad;
  ctx.fillRect(SEA_X, 0, WORLD.width - SEA_X, WORLD.height);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  for (let y = 40; y < WORLD.height; y += 130) {
    ctx.beginPath();
    ctx.moveTo(SEA_X + 12, y);
    ctx.quadraticCurveTo(SEA_X + 40, y + 14, SEA_X + 70, y);
    ctx.stroke();
  }
  // Sidewalks: a sand border around every block.
  ctx.fillStyle = PALETTE.sidewalk;
  for (let i = 0; i < AVENUES.length - 1; i += 1) {
    for (let j = 0; j < STREETS.length - 1; j += 1) {
      ctx.fillRect(AVENUES[i] + 46, STREETS[j] + 46, AVENUES[i + 1] - AVENUES[i] - 92, STREETS[j + 1] - STREETS[j] - 92);
    }
  }
  // Parks.
  for (const park of city.parks) {
    ctx.fillStyle = PALETTE.park;
    ctx.fillRect(park.x0, park.y0, park.x1 - park.x0, park.y1 - park.y0);
    if (park.pond) {
      ctx.fillStyle = PALETTE.pond;
      ctx.beginPath();
      ctx.ellipse(park.pond.x, park.pond.y, park.pond.rx, park.pond.ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const t of park.trees) drawPalm(ctx, t.x, t.y, t.r);
  }
  // Parking lots.
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 2;
  for (const lot of city.parkingLots) {
    ctx.fillStyle = '#55555e';
    ctx.fillRect(lot.x0, lot.y0, lot.x1 - lot.x0, lot.y1 - lot.y0);
    for (let x = lot.x0 + 30; x < lot.x1 - 20; x += 46) {
      ctx.beginPath(); ctx.moveTo(x, lot.y0 + 12); ctx.lineTo(x, lot.y0 + 52); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, lot.y1 - 12); ctx.lineTo(x, lot.y1 - 52); ctx.stroke();
    }
  }
  // Roads.
  ctx.fillStyle = PALETTE.asphalt;
  for (const a of AVENUES) ctx.fillRect(a - 46, 0, 92, WORLD.height);
  for (const s of STREETS) ctx.fillRect(0, s - 46, BEACH_X, 92);
  ctx.strokeStyle = PALETTE.lane;
  ctx.lineWidth = 3;
  ctx.setLineDash([26, 30]);
  for (const a of AVENUES) {
    ctx.beginPath(); ctx.moveTo(a, 0); ctx.lineTo(a, WORLD.height); ctx.stroke();
  }
  for (const s of STREETS) {
    ctx.beginPath(); ctx.moveTo(0, s); ctx.lineTo(BEACH_X, s); ctx.stroke();
  }
  ctx.setLineDash([]);
  // Marina pier.
  ctx.fillStyle = '#8a6d4b';
  ctx.fillRect(5030, 1700, 130, 200);
  ctx.fillStyle = '#6b543a';
  for (let y = 1710; y < 1900; y += 26) ctx.fillRect(5030, y, 130, 3);
  // Buildings, with a sun shadow and roof detail.
  for (const b of city.buildings) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(b.x + 7, b.y + 9, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = PALETTE.roof;
    ctx.fillRect(b.x + 5, b.y + 5, b.w - 10, b.h - 10);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    const cols = Math.max(1, Math.floor(b.w / 34));
    const rows = Math.max(1, Math.floor(b.h / 34));
    for (let cx = 0; cx < cols; cx += 1) {
      for (let cy = 0; cy < rows; cy += 1) {
        ctx.fillRect(b.x + 12 + cx * 34, b.y + 12 + cy * 34, 12, 9);
      }
    }
    if (b.landmark) {
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.font = `bold 15px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(b.name.toUpperCase(), b.x + b.w / 2, b.y + b.h / 2 + 5);
    }
  }
  for (const palm of city.palms) drawPalm(ctx, palm.x, palm.y, palm.r);
}

function drawMarker(ctx, G, target, time) {
  if (!target) return;
  const pulse = 1 + Math.sin(time * 4) * 0.15;
  ctx.save();
  ctx.globalAlpha = 0.25 + Math.sin(time * 4) * 0.08;
  ctx.fillStyle = '#ffd76a';
  ctx.fillRect(target.x - 8, target.y - 220, 16, 220);
  ctx.restore();
  ctx.strokeStyle = '#ffd76a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(target.x, target.y, 26 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffd76a';
  ctx.beginPath();
  ctx.arc(target.x, target.y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.font = `bold 14px ${FONT}`;
  ctx.textAlign = 'center';
  const label = target.label || 'TARGET';
  const w = ctx.measureText(label).width + 18;
  rr(ctx, target.x - w / 2, target.y - 52, w, 24, 6);
  ctx.fill();
  ctx.fillStyle = '#ffd76a';
  ctx.fillText(label.toUpperCase(), target.x, target.y - 35);
}

function drawWorld(ctx, G) {
  drawCity(ctx, G);
  // Skid marks.
  ctx.strokeStyle = 'rgba(20,20,24,0.4)';
  ctx.lineWidth = 4;
  for (const s of G.skids) {
    ctx.globalAlpha = Math.min(1, s.life / 5);
    ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // Mission and side-job markers under the cars.
  if (G.mission.active && G.mission.target) drawMarker(ctx, G, G.mission.target, G.time);
  if (G.mission.sideJob) {
    const job = G.mission.sideJob;
    if (job.stage === 0) {
      ctx.fillStyle = '#7ddc8a';
      ctx.font = `bold 22px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('$', job.x, job.y - 18);
      ctx.strokeStyle = '#7ddc8a';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(job.x, job.y, 18 + Math.sin(G.time * 4) * 3, 0, Math.PI * 2); ctx.stroke();
    } else {
      drawMarker(ctx, G, job.dest, G.time);
    }
  }
  // Respray and safehouse pads.
  ctx.fillStyle = 'rgba(168,85,247,0.9)';
  ctx.font = `bold 13px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('RESPRAY', LANDMARKS.spray.x, LANDMARKS.spray.y - LANDMARKS.spray.h / 2 - 8);
  ctx.fillStyle = 'rgba(125,220,138,0.9)';
  ctx.fillText('SAFEHOUSE', LANDMARKS.safehouse.x, LANDMARKS.safehouse.y - LANDMARKS.safehouse.h / 2 - 8);
  for (const car of G.cars) {
    if (!car.dead) drawCar(ctx, car, G.time);
  }
  for (const ped of G.peds) drawPed(ctx, ped);
  // The player on foot.
  const p = G.player;
  if (p.onFoot) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(1, 3, 11, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(p.angle);
    ctx.fillStyle = '#f5f5f5';
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d21f3c';
    ctx.fillRect(2, -3, 12, 6);
    ctx.fillStyle = '#e8b98a';
    ctx.beginPath(); ctx.arc(2, 0, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d21f3c';
    ctx.fillRect(-3, -6, 8, 4);
    ctx.restore();
    // Aim line, faint.
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(p.x + Math.cos(p.aim) * 18, p.y + Math.sin(p.aim) * 18);
    ctx.lineTo(p.x + Math.cos(p.aim) * 60, p.y + Math.sin(p.aim) * 60);
    ctx.stroke();
  }
  // Particles.
  for (const pt of G.particles) {
    const a = Math.max(0, pt.life / pt.maxLife);
    if (pt.kind === 'tracer') {
      ctx.strokeStyle = pt.color;
      ctx.globalAlpha = a;
      ctx.lineWidth = pt.size;
      ctx.beginPath(); ctx.moveTo(pt.x, pt.y); ctx.lineTo(pt.x2, pt.y2); ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (pt.kind === 'smoke') {
      ctx.globalAlpha = a * 0.5;
      ctx.fillStyle = pt.color;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (pt.kind === 'boom') {
      ctx.globalAlpha = a;
      ctx.fillStyle = pt.color;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * (1.6 - a * 0.6), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff3a0';
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * 0.5 * a, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = a;
      ctx.fillStyle = pt.color;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

function drawStars(ctx, x, y, level) {
  for (let i = 0; i < 5; i += 1) {
    const filled = i < level;
    ctx.fillStyle = filled ? '#ffd76a' : 'rgba(255,255,255,0.25)';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 1.5;
    const cx = x + i * 30;
    const r = filled ? 12 : 10;
    ctx.save();
    ctx.translate(cx, y);
    ctx.beginPath();
    for (let k = 0; k < 5; k += 1) {
      const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5;
      const a2 = a + Math.PI / 5;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      ctx.lineTo(Math.cos(a2) * r * 0.45, Math.sin(a2) * r * 0.45);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function drawMinimap(ctx, G, x, y, w, h) {
  const sx = w / WORLD.width;
  const sy = h / WORLD.height;
  ctx.save();
  ctx.fillStyle = 'rgba(8,10,18,0.78)';
  rr(ctx, x - 6, y - 6, w + 12, h + 12, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = '#8fa36b';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#2ec4b6';
  ctx.fillRect(x + (BEACH_X / WORLD.width) * w, y, w - (BEACH_X / WORLD.width) * w, h);
  ctx.fillStyle = '#eed9a4';
  ctx.fillRect(x + (BEACH_X / WORLD.width) * w, y, ((SEA_X - BEACH_X) / WORLD.width) * w, h);
  ctx.strokeStyle = '#c9c9c9';
  ctx.lineWidth = 1.6;
  for (const a of AVENUES) {
    ctx.beginPath(); ctx.moveTo(x + (a / WORLD.width) * w, y); ctx.lineTo(x + (a / WORLD.width) * w, y + h); ctx.stroke();
  }
  for (const s of STREETS) {
    ctx.beginPath(); ctx.moveTo(x, y + (s / WORLD.height) * h); ctx.lineTo(x + w, y + (s / WORLD.height) * h); ctx.stroke();
  }
  const dot = (wx, wy, color, r) => {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x + wx * sx, y + wy * sy, r, 0, Math.PI * 2); ctx.fill();
  };
  dot(LANDMARKS.safehouse.x, LANDMARKS.safehouse.y, '#7ddc8a', 3);
  dot(LANDMARKS.spray.x, LANDMARKS.spray.y, '#a855f7', 3);
  if (G.mission.active && G.mission.target) {
    const pulse = 3 + Math.sin(G.time * 5) * 1.5;
    dot(G.mission.target.x, G.mission.target.y, '#ffd76a', pulse);
  }
  if (G.mission.sideJob && G.mission.sideJob.stage === 0) dot(G.mission.sideJob.x, G.mission.sideJob.y, '#7ddc8a', 3);
  const flash = Math.floor(G.time * 3) % 2 === 0;
  for (const car of G.cars) {
    if (car.police && !car.dead) dot(car.x, car.y, flash ? '#ff2d2d' : '#2d6bff', 3.5);
  }
  for (const ped of G.peds) {
    if (ped.police && ped.state !== 'down') dot(ped.x, ped.y, '#ff2d2d', 3);
  }
  // Player arrow.
  ctx.save();
  ctx.translate(x + G.player.x * sx, y + G.player.y * sy);
  ctx.rotate(G.player.angle);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(7, 0); ctx.lineTo(-5, -5); ctx.lineTo(-5, 5); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();
  // Viewport rectangle.
  const vw = (G.viewW / G.cam.zoom / WORLD.width) * w;
  const vh = (G.viewH / G.cam.zoom / WORLD.height) * h;
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.strokeRect(x + (G.cam.x - vw / 2 / sx) * sx, y + (G.cam.y - vh / 2 / sy) * sy, vw, vh);
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `bold 11px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('SOLMAR CITY', x - 2, y + h + 18);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(8,10,18,0.72)';
  rr(ctx, x, y, w, h, 8);
  ctx.fill();
}

function drawHUD(ctx, G) {
  const W = G.viewW;
  const H = G.viewH;
  const p = G.player;
  // Cash and health, top left.
  panel(ctx, 14, 12, 220, 64);
  ctx.fillStyle = '#ffd76a';
  ctx.font = `bold 26px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(`$${G.cash.toLocaleString('en-US')}`, 26, 40);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  rr(ctx, 26, 50, 140, 10, 5);
  ctx.fill();
  ctx.fillStyle = p.health > 40 ? '#7ddc8a' : '#ff5a5a';
  rr(ctx, 26, 50, 140 * Math.max(0, p.health / PLAYER.health), 10, 5);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `bold 11px ${FONT}`;
  ctx.fillText('HEALTH', 172, 59);
  // Wanted stars, top right.
  panel(ctx, W - 218, 12, 204, 64);
  ctx.fillStyle = '#fff';
  ctx.font = `bold 12px ${FONT}`;
  ctx.fillText('WANTED', W - 206, 30);
  drawStars(ctx, W - 196, 52, G.wanted.level);
  if (G.wanted.evading && G.wanted.level > 0) {
    ctx.fillStyle = '#7ddc8a';
    ctx.font = `bold 12px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText('LOSING THE HEAT…', W - 26, 92);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    rr(ctx, W - 206, 98, 180, 7, 3);
    ctx.fill();
    ctx.fillStyle = '#7ddc8a';
    rr(ctx, W - 206, 98, 180 * (G.wanted.evade / 4), 7, 3);
    ctx.fill();
    ctx.textAlign = 'left';
  }
  // Mission banner, top centre.
  const objective = currentObjective(G);
  const title = G.mission.active ? MISSIONS[G.mission.index].title : (G.storyComplete ? 'FREE ROAM' : 'SOLMAR HEAT');
  ctx.textAlign = 'center';
  panel(ctx, W / 2 - 260, 12, 520, 54);
  ctx.fillStyle = '#ffd76a';
  ctx.font = `bold 15px ${FONT}`;
  ctx.fillText(title, W / 2, 32);
  ctx.fillStyle = '#fff';
  ctx.font = `13px ${FONT}`;
  ctx.fillText(objective.length > 72 ? `${objective.slice(0, 72)}…` : objective, W / 2, 53);
  if (G.mission.timerMax > 0 && G.mission.active) {
    ctx.fillStyle = G.mission.timer < 20 ? '#ff5a5a' : '#fff';
    ctx.font = `bold 15px ${FONT}`;
    ctx.fillText(`${Math.ceil(G.mission.timer)}s`, W / 2 + 292, 32);
  }
  ctx.textAlign = 'left';
  // Centre banner.
  if (G.banner) {
    ctx.globalAlpha = Math.min(1, G.banner.t);
    ctx.font = `bold 30px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.strokeText(G.banner.text, W / 2, 150);
    ctx.fillStyle = G.banner.color || '#ffd76a';
    ctx.fillText(G.banner.text, W / 2, 150);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }
  // Phone call.
  if (G.phone) {
    panel(ctx, W / 2 - 280, H - 178, 560, 92);
    ctx.fillStyle = '#ffd76a';
    ctx.font = `bold 14px ${FONT}`;
    ctx.fillText(`\u260E ${G.phone.name.toUpperCase()}: INCOMING CALL`, W / 2 - 264, H - 150);
    ctx.fillStyle = '#fff';
    ctx.font = `14px ${FONT}`;
    const words = G.phone.text.split(' ');
    let line = '';
    let ly = H - 128;
    for (const word of words) {
      if (ctx.measureText(`${line} ${word}`).width > 520) {
        ctx.fillText(line, W / 2 - 264, ly);
        ly += 19;
        line = word;
      } else {
        line = line ? `${line} ${word}` : word;
      }
    }
    ctx.fillText(line, W / 2 - 264, ly);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = `11px ${FONT}`;
    ctx.fillText('ENTER: dismiss', W / 2 - 264, H - 96);
  }
  // Minimap, bottom left.
  drawMinimap(ctx, G, 20, H - 168, 186, 136);
  // Speed and car, bottom right.
  const car = p.car;
  panel(ctx, W - 214, H - 84, 200, 70);
  if (car) {
    const mph = Math.round(Math.abs(car.speed) * 0.14);
    ctx.fillStyle = '#ffd76a';
    ctx.font = `bold 13px ${FONT}`;
    ctx.fillText(CAR_TYPES[car.type].name.toUpperCase(), W - 200, H - 58);
    ctx.fillStyle = '#fff';
    ctx.font = `bold 28px ${FONT}`;
    ctx.fillText(`${mph}`, W - 200, H - 28);
    const speedW = ctx.measureText(`${mph}`).width;
    ctx.font = `bold 12px ${FONT}`;
    ctx.fillText('MPH', W - 200 + speedW + 6, H - 28);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = `11px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(`DAMAGE ${Math.max(0, Math.round(car.health))}%`, W - 26, H - 28);
    ctx.textAlign = 'left';
    if (Math.abs(car.x - LANDMARKS.spray.x) < 160 && Math.abs(car.y - LANDMARKS.spray.y) < 130 && G.wanted.level > 0 && G.cash >= SPRAY_PRICE) {
      ctx.fillStyle = '#c084fc';
      ctx.font = `bold 13px ${FONT}`;
      ctx.fillText(`Q: RESPRAY $${SPRAY_PRICE} (clears wanted)`, W - 200, H - 96);
    }
  } else {
    ctx.fillStyle = '#fff';
    ctx.font = `bold 13px ${FONT}`;
    ctx.fillText('ON FOOT', W - 200, H - 52);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = `12px ${FONT}`;
    ctx.fillText(`PISTOL  ${p.ammo} / ${PLAYER.ammo}${p.reloadTimer > 0 ? '  · RELOADING…' : ''}`, W - 200, H - 30);
  }
  // Context hint, bottom centre.
  const hint = contextHint(G);
  if (hint) {
    ctx.font = `bold 14px ${FONT}`;
    ctx.textAlign = 'center';
    const w = ctx.measureText(hint).width + 26;
    panel(ctx, W / 2 - w / 2, H - 46, w, 30);
    ctx.fillStyle = '#fff';
    ctx.fillText(hint, W / 2, H - 25);
    ctx.textAlign = 'left';
  }
  // Early controls reminder.
  if (G.time < 25 && G.mode === 'play') {
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = `12px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('WASD drive / walk · E enter car · F or click shoot · SPACE handbrake · ESC pause · M mute', W / 2, H - 84);
    ctx.textAlign = 'left';
  }
}

function contextHint(G) {
  const p = G.player;
  if (p.onFoot) {
    const car = nearestCarForHint(G);
    if (car) return car.driver ? 'E: JACK THE CAR' : 'E: GET IN THE CAR';
    return null;
  }
  return 'E: GET OUT  ·  SPACE: HANDBRAKE';
}

function nearestCarForHint(G) {
  let best = null;
  let bestD = 60 * 60;
  for (const car of G.cars) {
    if (car.dead) continue;
    const dx = car.x - G.player.x;
    const dy = car.y - G.player.y;
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

function drawTitle(ctx, G) {
  const W = G.viewW;
  const H = G.viewH;
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(10,8,24,0.25)');
  grad.addColorStop(0.55, 'rgba(10,8,24,0.45)');
  grad.addColorStop(1, 'rgba(10,8,24,0.82)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd76a';
  ctx.font = `bold 15px ${FONT}`;
  ctx.fillText('A SOLMAR CITY STORY', W / 2, H * 0.2);
  ctx.fillStyle = '#fff';
  ctx.font = `bold 84px ${FONT}`;
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.strokeText('SOLMAR HEAT', W / 2, H * 0.2 + 78);
  ctx.fillText('SOLMAR HEAT', W / 2, H * 0.2 + 78);
  ctx.fillStyle = '#ffd76a';
  ctx.font = `bold 20px ${FONT}`;
  ctx.fillText('Steal the car. Do the job. Lose the heat. Get paid.', W / 2, H * 0.2 + 116);
  // Menu.
  const items = G.menuItems;
  const y0 = H * 0.42;
  items.forEach((item, i) => {
    const y = y0 + i * 44;
    const selected = i === G.menuIndex;
    if (selected) {
      ctx.fillStyle = 'rgba(255,215,106,0.9)';
      rr(ctx, W / 2 - 190, y - 26, 380, 36, 8);
      ctx.fill();
      ctx.fillStyle = '#111';
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
    }
    ctx.font = `bold 19px ${FONT}`;
    ctx.fillText(item.label, W / 2, y);
  });
  // Job checklist.
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `15px ${FONT}`;
  let list = 'JOBS: ';
  MISSIONS.forEach((m, i) => {
    list += `${i < (G.save ? G.save.missionIndex : 0) ? '✓' : '○'} ${m.title}   `;
  });
  ctx.fillText(list, W / 2, H * 0.42 + items.length * 44 + 18);
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = `13px ${FONT}`;
  ctx.fillText('WASD / arrows move · E enter or steal a car · F or click shoot · SPACE handbrake · ESC pause · M mute', W / 2, H - 52);
  ctx.fillText('An original game. Solmar City, its people and its story are invented here. No affiliation with any commercial series.', W / 2, H - 28);
  if (G.helpOpen) {
    ctx.fillStyle = 'rgba(8,10,18,0.88)';
    rr(ctx, W / 2 - 320, H * 0.3, 640, 260, 12);
    ctx.fill();
    ctx.fillStyle = '#ffd76a';
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillText('HOW TO PLAY', W / 2, H * 0.3 + 36);
    ctx.fillStyle = '#fff';
    ctx.font = `15px ${FONT}`;
    const lines = [
      'You are Danny Voss, a getaway driver in Solmar City.',
      'Lena calls with jobs: steal a car, do the job, lose the heat, get paid.',
      'WASD / arrows: drive or walk · SHIFT: run on foot',
      'E: get in or steal a car (jacking one in view raises your wanted level)',
      'F or click: shoot (mouse aims) · R: reload · SPACE: handbrake',
      'Stars rise when the cops see a crime. Break line of sight to cool off,',
      'or pay $150 at Ray\'s Respray to clear them. Get arrested and you lose $200.',
      'Finish all six jobs to complete the story, then keep earning fares.',
    ];
    lines.forEach((line, i) => ctx.fillText(line, W / 2, H * 0.3 + 66 + i * 24));
    ctx.fillStyle = '#ffd76a';
    ctx.font = `bold 14px ${FONT}`;
    ctx.fillText('ENTER: back', W / 2, H * 0.3 + 236);
  }
  ctx.textAlign = 'left';
}

function drawPause(ctx, G) {
  const W = G.viewW;
  const H = G.viewH;
  ctx.fillStyle = 'rgba(8,10,18,0.72)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = `bold 46px ${FONT}`;
  ctx.fillText('PAUSED', W / 2, H * 0.3);
  const items = G.menuItems;
  items.forEach((item, i) => {
    const y = H * 0.42 + i * 44;
    const selected = i === G.menuIndex;
    if (selected) {
      ctx.fillStyle = 'rgba(255,215,106,0.9)';
      rr(ctx, W / 2 - 190, y - 26, 380, 36, 8);
      ctx.fill();
      ctx.fillStyle = '#111';
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
    }
    ctx.font = `bold 19px ${FONT}`;
    ctx.fillText(item.label, W / 2, y);
  });
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = `14px ${FONT}`;
  ctx.fillText(`Cash $${G.cash.toLocaleString('en-US')} · Jobs done ${G.stats.jobsDone} · ${G.mission.completedAll ? 'Story complete' : `Next job: ${MISSIONS[G.mission.index].title}`}`, W / 2, H * 0.42 + items.length * 44 + 20);
  ctx.textAlign = 'left';
}

function drawEnd(ctx, G, kind) {
  const W = G.viewW;
  const H = G.viewH;
  ctx.fillStyle = kind === 'busted' ? 'rgba(20,8,40,0.78)' : 'rgba(40,8,8,0.78)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = kind === 'busted' ? '#c084fc' : '#ff5a5a';
  ctx.font = `bold 64px ${FONT}`;
  ctx.fillText(kind === 'busted' ? 'BUSTED' : 'WASTED', W / 2, H * 0.36);
  ctx.fillStyle = '#fff';
  ctx.font = `18px ${FONT}`;
  ctx.fillText(
    kind === 'busted'
      ? 'The SCPD caught up with you. You lose $200 and the job is blown.'
      : 'That one hurt. You wake up at Solmar General, $200 lighter.',
    W / 2, H * 0.36 + 40,
  );
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = `15px ${FONT}`;
  ctx.fillText(`Cash $${G.cash.toLocaleString('en-US')} · Jobs done ${G.stats.jobsDone}`, W / 2, H * 0.36 + 78);
  ctx.fillStyle = '#ffd76a';
  ctx.font = `bold 18px ${FONT}`;
  ctx.fillText('Press ENTER to get back on the street', W / 2, H * 0.36 + 128);
  ctx.textAlign = 'left';
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  function render(G) {
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    G.viewW = W;
    G.viewH = H;
    ctx.clearRect(0, 0, W, H);
    // World view.
    const shakeX = G.shake ? (Math.random() * 2 - 1) * G.shake : 0;
    const shakeY = G.shake ? (Math.random() * 2 - 1) * G.shake : 0;
    ctx.save();
    ctx.translate(W / 2 + shakeX, H / 2 + shakeY);
    ctx.scale(G.cam.zoom, G.cam.zoom);
    ctx.translate(-G.cam.x, -G.cam.y);
    drawWorld(ctx, G);
    ctx.restore();
    if (G.mode === 'title') drawTitle(ctx, G);
    else if (G.mode === 'paused') { drawHUD(ctx, G); drawPause(ctx, G); }
    else if (G.mode === 'busted') drawEnd(ctx, G, 'busted');
    else if (G.mode === 'wasted') drawEnd(ctx, G, 'wasted');
    else {
      drawHUD(ctx, G);
      if (G.storyComplete && G.storyBannerT > 0) {
        ctx.textAlign = 'center';
        ctx.font = `bold 26px ${FONT}`;
        ctx.fillStyle = '#ffd76a';
        ctx.lineWidth = 5;
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.strokeText('STORY COMPLETE: SOLMAR IS YOURS', W / 2, 200);
        ctx.fillText('STORY COMPLETE: SOLMAR IS YOURS', W / 2, 200);
        ctx.textAlign = 'left';
      }
    }
  }
  return { render, resize };
}
