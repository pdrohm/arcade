# KART architecture

## Audit

Arcade is plain JavaScript: Node HTTP, `ws`, `qrcode`, and server-rendered state sent to vanilla browser views. No React or bundler exists. Nine game folders expose `{meta, create(api)}` and TV/phone `ARCADE.register` views. The old `imagemeacao/` folder is a separate predecessor; it is not the Arcade runtime.

`server.js` owns four-character rooms, QR links, a color palette, player seats, private seat secrets, reconnects, save/restore, the catalog and game launch. Game folders are discovered at startup. Each room has one game. Players retain their seats between games. Phone `/ABCD` and TV `/tv/ABCD` connect to the same WebSocket server. Public player IDs do not authorize control; the room resolves each socket's seat.

`shared/client.js` loads the correct TV/phone script, reconnects, stores identity, and supplies common UI helpers. `public/tv.html` supports a retained `mount` stage. `public/index.html` supports a stable phone `key`, which preserves a drawing canvas or held controls. `shared/ui.css` defines the navy/amber theme, player colors, large buttons, and TV sidebar. Kart scopes its immersive layout to its own body class.

## Data flow

Phone held controls → existing authenticated room socket → game input → fixed-step server simulation → game snapshots → one TV Canvas 2D pseudo-3D renderer with one chase camera per player. Phones never load the renderer.

No new runtime dependency and no WebGL: the TV draws with Canvas 2D only, so the game runs on Smart TV browsers that have weak or no WebGL (the living-room TV is a 2016 Samsung, Chrome 47). All sprites and textures are painted on offscreen canvases at load time; no image files or fonts are served (the CSP allows only same-origin assets). Custom analytic vehicle physics keeps steering and drift easy to tune without a full rigid-body vehicle stack.

## Modules

- `games/kart/game.js`: setup, active roster, mode/driver selection, readiness, TV-load gate, countdown, input expiry, results, reconnect/rekey, serialization, cleanup.
- `shared/kart/world.js`: track and arena data shared by collision and rendering.
- `shared/kart/simulation.js`: vehicle movement, checkpoints, lap order, pickups, attacks, respawns and match rules.
- `shared/game3d/`: reusable renderer/camera/interpolation/resource lifecycle.
- `shared/kart/sprites.js` (ES5): sprite factory. A tiny orthographic box-and-ball rasterizer renders every kart+driver, projectile and item box in 16 yaw steps with one light and a 1px ink outline; trees, bushes, the mountain/cloud panoramas and the checker pattern are drawn directly. Generated once per match and cached.
- `shared/kart/render.js` (ES5): the 2.5D renderer. Builds ground polygons (track strips, grass stripes, curbs, arena tiles, ramps, pads, lava) and vertical faces (walls, platforms, start banner) from `world.js`, projects them per chase camera (rotate, near-plane clip, perspective divide), sorts far-to-near, then draws depth-sorted billboards (scenery, karts by relative angle, projectiles, particles). Also the in-race HUD, countdown, lobby fly-through and the minimap quadrant. Fixed pools; internal resolution 960→800→640 adapts to frame cost; `image-rendering: pixelated` upscales.
- `shared/kart/icons.js` (ES5): SVG icon set (driver portraits, karts, items, misc) shared by the TV posters and the phone screens.
- `games/kart/tv.js` + `shared/kart/tv.css`: ES5 TV view. Loads the three scripts above, hands every state/frame to the renderer, and renders the DOM posters (lobby, loading, podium results, failure) in TV-safe CSS (rem units, no grid/var/clamp).
- `games/kart/phone.js`: retained multi-touch controller, private inventory and selection UI.

## Timing and ownership

The server uses 1/60-second physics steps, with bounded catch-up. It publishes about 20 snapshots per second through `api.stream()`. These snapshots do not redraw room UI or write disk state. Slow sockets skip obsolete frames. Each recipient still gets the game's private view.

Phones send input on change: button edges go out at once (at most one packet per 16ms), steering changes at up to 30Hz, and a 10Hz heartbeat keeps the server informed while nothing changes. The server gives `t:'input'` packets their own token bucket (45/s, burst 60) so the general 20/s limit for room messages stays. Stale input expires after 350ms and brakes the kart. Inputs contain steering/buttons only; phones cannot assign positions, laps, damage, or another driver's identity. Match IDs reject old-match packets. Blur, hide, pointer cancellation, orientation change, disconnect and exit clear local controls.

Steering has an 8% deadzone and then a gentle curve (`.6t + .4t²`) so small thumb moves steer a little and the edge of the stick steers fully. Snapshots are rounded to two decimals (about 40% smaller on the wire). The TV consumes snapshots through `tv.frame()`: the scene buffers them and renders 75ms behind the newest one, interpolating position and heading between the two nearest samples.

A drift locks its direction when it starts (button held while turning) and keeps it until the button is released, so passing the stick through center mid-corner does not drop the charge; the stick then tightens or opens the arc. Kart-kart bumps, rail bounces and hits stamp a time the phone turns into a short vibration.

One Canvas 2D renderer draws two to four viewports per frame from one world description. Particles come from a fixed pool of 160; draw lists and clip buffers are reused, nothing is allocated per frame. Lower internal resolution is the first performance fallback (960 → 800 → 640 wide). 60 FPS is a target, not a hardware guarantee; the renderer was measured at 60 FPS with four viewports in software-rendered Chrome (GPU and WebGL disabled).

## Room and match flow

Library → KART → mode → drivers ready → TV ready → countdown → play → results → replay or library. Two to four active entrants use the existing room; extra members watch. Race uses three laps and ordered forward checkpoints, with a time cap. Battle runs for two minutes with kills, health and respawns.

Existing games keep their original contracts. New optional `input`, `tvAction`, `stream`, `frame`, and `destroy` hooks enable real-time games. Exit frees server timers, browser input handlers, animation loops and canvas resources. Interrupted matches restore to setup with choices retained, so a restart cannot restore a stuck throttle. Completed results can be restored.

## Verification plan

`npm test`: physics rules plus real WebSocket room integration, seat identity, privacy, input expiry, four-driver limit, room isolation, static asset allowlist and old-game launch after Kart.

`npm run test:kart:e2e`: a full three-lap race driven through ordinary WebSocket inputs, return to the library, timed battle and return. No privileged clock or position test endpoints.

Browser checks: independent phone controls, split screen, viewport changes, replay/exit cleanup, console errors and failed requests, and a run with `--disable-3d-apis --disable-gpu` to prove the game plays without WebGL. These run in headless Chrome driven over the DevTools protocol (TV page plus one browser context per phone, real multi-touch events); see the scratch scripts described in the session notes. Physical phone/Wi-Fi and target-TV GPU testing remain distinct from desktop automation.
