# SOLMAR HEAT — a Solmar City story

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/samoyz/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/samoyz/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An original open-world crime game built for the make.fun gta6-01 bounty
("Make GTA 6"). Top-down, playable offline in a desktop browser from static
files: open `game/index.html` or run `node serve.ts` and visit
http://localhost:8080.

**The hook:** steal the car. Do the job. Lose the heat. Get paid.

You are Danny Voss, a getaway driver in Solmar City, a sun-soaked coastal
town of your own. Lena Cruz calls with six jobs — steal a car, run a fare,
move a package, drive the getaway, win a street race, rob Solmar Bank — and
every job ends with the cops on you. Break line of sight until the stars
fall, or pay $150 at Ray's Respray to clear them.

**Systems:** a road-grid city with traffic, pedestrians, a beach and a
marina; cars to steal and drive (sedan, cab, Comet GT, van, truck, police
interceptor); a 5-star wanted level with pursuing cruisers and foot cops;
pistol combat; missions with timers and payouts; free-roam taxi fares;
a HUD with cash, health, wanted stars and a live minimap; save/continue
via localStorage; synthesised sound (WebAudio, no files).

**Controls:** WASD/arrows drive or walk, SHIFT run, E enter/steal a car,
F or click shoot (mouse aims), R reload, SPACE handbrake, Q respray,
ESC pause, M mute.

**Layout:** `game/src/` holds one file per job — `config.js` (tuning),
`city.js` (the city), `entities.js` (cars, traffic, pedestrians, police,
combat), `missions.js` (the six jobs and side fares), `wanted.js` (the
heat), `render.js` (drawing, HUD, minimap, screens), `audio.js`
(synthesised sound), `input.js`, `random.js`, `shots.js` (the four
screenshot scenes), `main.js` (boot and loop). `main.ts` hands the entry
in; `screenshots/` holds the four real renders.

Solmar City, its people and its story are invented here. No affiliation
with any commercial series; no names, art or assets from one.
