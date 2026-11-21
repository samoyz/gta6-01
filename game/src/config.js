// SOLMAR HEAT — config: the city's layout, tuning and palette.
// A sun-soaked coastal city of its own: no names, places or art from any commercial game.
export const WORLD = { width: 5200, height: 3800 };
export const ROAD_WIDTH = 92;
export const AVENUES = [300, 800, 1300, 1800, 2300, 2800, 3300, 3800, 4300, 4800];
export const STREETS = [300, 800, 1300, 1800, 2300, 2800, 3300];
export const BEACH_X = 4960;
export const SEA_X = 5090;
export const SAVE_KEY = 'solmar-heat-save-v1';
export const STEP = 1 / 60;

export const PALETTE = {
  grass: '#a9b47e',
  sidewalk: '#d8c69a',
  asphalt: '#43434c',
  asphaltEdge: '#33333a',
  lane: '#e9e4c8',
  sand: '#eed9a4',
  seaDeep: '#17879e',
  seaShallow: '#2ec4b6',
  building: ['#f2a65a', '#e86a6a', '#7fb3d5', '#f7dc6f', '#a569bd', '#58d68d', '#f5b7b1', '#f0c27a'],
  roof: '#00000022',
  park: '#7fae62',
  pond: '#4fb3c9',
  palm: '#3e8e4f',
  trunk: '#8a6d4b',
};

export const CAR_TYPES = {
  sedan:   { name: 'Solmar Sedan',   length: 46, width: 22, topSpeed: 430, accel: 380, turn: 2.5, colors: ['#c0392b', '#2e6da4', '#7f8c8d', '#e67e22'] },
  taxi:    { name: 'Solmar Cab',     length: 46, width: 22, topSpeed: 400, accel: 360, turn: 2.5, colors: ['#f1c40f'] },
  sports:  { name: 'Comet GT',      length: 48, width: 22, topSpeed: 640, accel: 520, turn: 2.9, colors: ['#d21f3c', '#1f6fd2', '#f5f5f5'] },
  van:     { name: 'Mover Van',      length: 54, width: 24, topSpeed: 350, accel: 300, turn: 2.1, colors: ['#95a5a6', '#5d6d7e'] },
  truck:   { name: 'Hauler Truck',   length: 62, width: 26, topSpeed: 310, accel: 260, turn: 1.9, colors: ['#6e5100', '#4a6b8a'] },
  police:  { name: 'SCPD Interceptor', length: 48, width: 22, topSpeed: 580, accel: 500, turn: 2.8, colors: ['#1c1c22'] },
};

export const LANDMARKS = {
  bar:       { name: "Lena's Bar",      x: 1000, y: 1560, w: 220, h: 130 },
  bank:      { name: 'Solmar Bank',     x: 1560, y: 1020, w: 260, h: 150 },
  hotel:     { name: 'Palma Royale',    x: 4560, y: 1020, w: 240, h: 160 },
  docks:     { name: 'Solmar Docks',    x: 520,  y: 3520, w: 240, h: 140 },
  marina:    { name: 'Marina',          x: 5030, y: 1800, w: 60,  h: 200 },
  safehouse: { name: 'Safehouse',       x: 3060, y: 2560, w: 200, h: 130 },
  hospital:  { name: 'Solmar General',  x: 4060, y: 1560, w: 260, h: 150 },
  spray:     { name: "Ray's Respray",   x: 2560, y: 2060, w: 200, h: 120 },
};

export const PLAYER = {
  radius: 13,
  walkSpeed: 195,
  runSpeed: 265,
  health: 100,
  ammo: 12,
};

export const WANTED_MAX = 5;
export const SPRAY_PRICE = 150;
export const BUSTED_PENALTY = 200;
export const START_CASH = 100;

export const MISSION_REWARDS = [150, 250, 400, 600, 800, 2000];
