// The story: six jobs from Lena Cruz, then free roam with replayable side jobs.
// Every job ends the same way the game's hook promises: do the job, lose the
// heat, get paid.
import { LANDMARKS, MISSION_REWARDS, WORLD } from './config.js';

export const MISSIONS = [
  {
    id: 'wheels', title: 'WHEELS', from: 'Lena',
    text: 'Danny. You need wheels before anything else. Jack a car — any car — and bring it to my bar. Try not to make a scene.',
  },
  {
    id: 'fare', title: 'FARE PLAY', from: 'Lena',
    text: 'A client of mine is waiting at the Palma Royale. Pick them up and drop them at the Marina. Fast, smooth, no cops.',
  },
  {
    id: 'package', title: 'THE PACKAGE', from: 'Lena',
    text: 'There is a package at the Docks with your name on it. Walk in, grab it, and get it to the Safehouse. The cops will be watching.',
  },
  {
    id: 'getaway', title: 'GETAWAY', from: 'Lena',
    text: 'My crew just hit a place near the Bank. Pick them up and drive like the whole city is behind you. Because it will be.',
  },
  {
    id: 'race', title: 'NEON RUSH', from: 'Lena',
    text: 'Midnight street race, five checkpoints across Solmar. Win it and the street talks about you. Lose it and nobody remembers your name.',
  },
  {
    id: 'bigscore', title: 'THE BIG SCORE', from: 'Lena',
    text: 'Solmar Bank. Walk in, grab the cash, walk out. Then run — four stars of heat, Danny. Bring it home to the Safehouse and we are made.',
  },
];

export function createMissionState() {
  return {
    index: 0, stage: 0, active: false, timer: 0, timerMax: 0,
    target: null, label: '', hasPackage: false, hasCash: false,
    passenger: null, crew: 0, checkpoints: [], cpIndex: 0,
    failed: false, failedReason: '', completedAll: false,
    nextCallIn: 0, sideJob: null, sideJobCooldown: 12,
  };
}

export function startMission(G, index) {
  const m = G.mission;
  const def = MISSIONS[index];
  m.index = index;
  m.stage = 0;
  m.active = true;
  m.failed = false;
  m.timer = 0;
  m.timerMax = 0;
  m.hasPackage = false;
  m.hasCash = false;
  m.passenger = null;
  m.crew = 0;
  m.checkpoints = [];
  m.cpIndex = 0;
  G.phone = { name: def.from, text: def.text, t: 6 };
  G.audio.phone();
  if (index === 0) {
    m.target = { x: LANDMARKS.bar.x, y: LANDMARKS.bar.y + 110, label: "Lena's Bar" };
    m.label = 'Get in a car, then drive to Lena\'s Bar';
  } else if (index === 1) {
    m.target = { x: LANDMARKS.hotel.x, y: LANDMARKS.hotel.y + 130, label: 'Palma Royale' };
    m.label = 'Pick up the fare at the Palma Royale';
  } else if (index === 2) {
    m.target = { x: LANDMARKS.docks.x, y: LANDMARKS.docks.y + 100, label: 'Solmar Docks' };
    m.label = 'Pick up the package at the Docks (on foot)';
  } else if (index === 3) {
    m.target = { x: LANDMARKS.bank.x - 220, y: LANDMARKS.bank.y + 120, label: 'Crew pickup' };
    m.label = 'Pick up the crew near Solmar Bank';
  } else if (index === 4) {
    m.checkpoints = [
      { x: 800, y: 300 }, { x: 4300, y: 800 }, { x: 4800, y: 2800 },
      { x: 1300, y: 3300 }, { x: 2300, y: 1800 },
    ];
    m.cpIndex = 0;
    m.target = { ...m.checkpoints[0], label: 'Checkpoint 1/5' };
    m.timerMax = 160;
    m.timer = 160;
    m.label = 'Race: hit checkpoint 1 of 5';
  } else if (index === 5) {
    m.target = { x: LANDMARKS.bank.x, y: LANDMARKS.bank.y + 120, label: 'Solmar Bank' };
    m.label = 'Walk into Solmar Bank';
  }
}

export function completeMission(G) {
  const m = G.mission;
  const reward = MISSION_REWARDS[m.index];
  G.cash += reward;
  G.audio.jingle();
  G.banner = { text: `JOB DONE — +$${reward}`, t: 3, color: '#ffd76a' };
  m.active = false;
  m.target = null;
  m.passenger = null;
  if (m.index >= MISSIONS.length - 1) {
    m.completedAll = true;
    G.storyComplete = true;
    G.banner = { text: `THE BIG SCORE — +$${reward} — STORY COMPLETE`, t: 4, color: '#ffd76a' };
  } else {
    m.index += 1;
    m.nextCallIn = 2.5;
  }
  G.stats.jobsDone += 1;
  G.saveGame();
}

export function failMission(G, reason) {
  const m = G.mission;
  if (!m.active) return;
  m.active = false;
  m.failed = true;
  m.failedReason = reason;
  G.audio.fail();
  G.banner = { text: `JOB FAILED — ${reason}`, t: 3, color: '#ff5a5a' };
}

function near(G, x, y, r) {
  return Math.hypot(G.player.x - x, G.player.y - y) < r;
}

export function updateMission(G, dt) {
  const m = G.mission;
  if (!m.active && m.nextCallIn > 0) {
    m.nextCallIn -= dt;
    if (m.nextCallIn <= 0 && !m.completedAll) startMission(G, m.index);
  }
  if (!m.active) return;
  if (m.timerMax > 0) {
    m.timer -= dt;
    if (m.timer <= 0) { failMission(G, 'OUT OF TIME'); return; }
  }
  const p = G.player;
  if (m.index === 0) {
    if (m.stage === 0) {
      if (!p.onFoot) {
        m.stage = 1;
        m.label = "Drive to Lena's Bar";
      }
    } else if (near(G, m.target.x, m.target.y, 95)) {
      completeMission(G);
    }
  } else if (m.index === 1) {
    if (m.stage === 0) {
      if (!p.onFoot && near(G, m.target.x, m.target.y, 75)) {
        m.stage = 1;
        m.passenger = { inCar: false, t: 0 };
        m.target = { x: LANDMARKS.marina.x - 120, y: LANDMARKS.marina.y, label: 'Marina' };
        m.timerMax = 100;
        m.timer = 100;
        m.label = 'Drop the fare at the Marina';
        G.banner = { text: 'FARE PICKED UP', t: 2, color: '#7ddc8a' };
      }
    } else if (m.passenger && !m.passenger.inCar) {
      m.passenger.t += dt;
      if (m.passenger.t > 1.2) m.passenger.inCar = true;
    } else if (m.passenger && m.passenger.inCar && near(G, m.target.x, m.target.y, 80)) {
      completeMission(G);
    }
  } else if (m.index === 2) {
    if (m.stage === 0) {
      if (p.onFoot && near(G, m.target.x, m.target.y, 65)) {
        m.stage = 1;
        m.hasPackage = true;
        G.wanted.set(2);
        G.audio.pickup();
        m.target = { x: LANDMARKS.safehouse.x, y: LANDMARKS.safehouse.y + 110, label: 'Safehouse' };
        m.label = 'Deliver the package to the Safehouse — 2 stars of heat';
        G.banner = { text: 'PACKAGE TAKEN — THE COPS ARE ON YOU', t: 2.5, color: '#ff5a5a' };
      }
    } else if (near(G, m.target.x, m.target.y, 85)) {
      completeMission(G);
    }
  } else if (m.index === 3) {
    if (m.stage === 0) {
      if (!p.onFoot && near(G, m.target.x, m.target.y, 85)) {
        m.stage = 1;
        m.crew = 3;
        G.wanted.set(3);
        m.target = null;
        m.label = 'Lose the heat — break line of sight until the stars fall';
        G.banner = { text: 'CREW ABOARD — 3 STARS — LOSE THE HEAT', t: 2.5, color: '#ff5a5a' };
        G.audio.phone();
      }
    } else if (G.wanted.level === 0) {
      completeMission(G);
    }
  } else if (m.index === 4) {
    if (near(G, m.target.x, m.target.y, 80)) {
      G.audio.blip();
      m.cpIndex += 1;
      if (m.cpIndex >= m.checkpoints.length) {
        completeMission(G);
      } else {
        m.target = { ...m.checkpoints[m.cpIndex], label: `Checkpoint ${m.cpIndex + 1}/5` };
        m.label = `Race: hit checkpoint ${m.cpIndex + 1} of 5`;
      }
    }
  } else if (m.index === 5) {
    if (m.stage === 0) {
      if (p.onFoot && near(G, m.target.x, m.target.y, 75)) {
        m.stage = 1;
        m.label = 'Grab the cash inside the bank';
        m.target = { x: LANDMARKS.bank.x, y: LANDMARKS.bank.y, label: 'Vault' };
      }
    } else if (m.stage === 1) {
      if (p.onFoot && near(G, m.target.x, m.target.y, 55)) {
        m.stage = 2;
        m.hasCash = true;
        G.wanted.set(4);
        m.target = { x: LANDMARKS.safehouse.x, y: LANDMARKS.safehouse.y + 110, label: 'Safehouse' };
        m.label = 'Escape to the Safehouse with the cash — 4 stars of heat';
        G.banner = { text: 'ALARM TRIPPED — 4 STARS — RUN', t: 2.5, color: '#ff5a5a' };
        G.audio.phone();
      }
    } else if (near(G, m.target.x, m.target.y, 90)) {
      completeMission(G);
    }
  }
}

// Free-roam side job: a fare waves you down, you drive them across town.
export function updateSideJob(G, dt) {
  const m = G.mission;
  if (m.active || m.index < 2) return;
  if (!m.sideJob) {
    m.sideJobCooldown -= dt;
    if (m.sideJobCooldown <= 0) {
      const p = G.city.randomRoadPoint(G.rng);
      const dest = G.rng.pick([LANDMARKS.hotel, LANDMARKS.marina, LANDMARKS.bar, LANDMARKS.hospital, LANDMARKS.docks]);
      m.sideJob = {
        stage: 0, x: p.x, y: p.y,
        dest: { x: dest.x, y: dest.y + 110, label: dest.name },
        fare: G.rng.int(6, 14) * 10,
      };
    }
    return;
  }
  const job = m.sideJob;
  const p = G.player;
  if (job.stage === 0) {
    if (!p.onFoot && Math.hypot(p.x - job.x, p.y - job.y) < 70) {
      job.stage = 1;
      job.timer = 90;
      G.audio.blip();
      G.banner = { text: `FARE ABOARD — $${job.fare} TO ${job.dest.label.toUpperCase()}`, t: 2, color: '#7ddc8a' };
    }
  } else {
    job.timer -= dt;
    if (job.timer <= 0) {
      m.sideJob = null;
      m.sideJobCooldown = 15;
      G.banner = { text: 'FARE GAVE UP AND LEFT', t: 2, color: '#ff5a5a' };
    } else if (Math.hypot(p.x - job.dest.x, p.y - job.dest.y) < 85) {
      G.cash += job.fare;
      G.audio.jingle();
      G.banner = { text: `FARE PAID — +$${job.fare}`, t: 2.5, color: '#ffd76a' };
      G.stats.jobsDone += 1;
      m.sideJob = null;
      m.sideJobCooldown = 18;
      G.saveGame();
    }
  }
}

export function currentObjective(G) {
  const m = G.mission;
  if (m.active) return m.label;
  if (m.failed) return `Job failed: ${m.failedReason} — press ENTER to retry`;
  if (m.completedAll) return 'Story complete — free roam. Fares wave you down across Solmar.';
  if (m.sideJob) {
    return m.sideJob.stage === 0
      ? `Fare waiting ($${m.sideJob.fare}) — drive up to them`
      : `Fare aboard — drop them at ${m.sideJob.dest.label}`;
  }
  return 'Lena will call with the next job…';
}
