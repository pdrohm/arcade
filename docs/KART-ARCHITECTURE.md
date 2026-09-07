# KART architecture

## Audit

Arcade is plain JavaScript: Node HTTP, `ws`, `qrcode`, and server-rendered state sent to vanilla browser views. No React or bundler exists. Nine game folders expose `{meta, create(api)}` and TV/phone `ARCADE.register` views. The old `imagemeacao/` folder is a separate predecessor; it is not the Arcade runtime.

`server.js` owns four-character rooms, QR links, a color palette, player seats, private seat secrets, reconnects, save/restore, the catalog and game launch. Game folders are discovered at startup. Each room has one game. Players retain their seats between games. Phone `/ABCD` and TV `/tv/ABCD` connect to the same WebSocket server. Public player IDs do not authorize control; the room resolves each socket's seat.

`shared/client.js` loads the correct TV/phone script, reconnects, stores identity, and supplies common UI helpers. `public/tv.html` supports a retained `mount` stage. `public/index.html` supports a stable phone `key`, which preserves a drawing canvas or held controls. `shared/ui.css` defines the navy/amber theme, player colors, large buttons, and TV sidebar. Kart scopes its immersive layout to its own body class.

## Data flow

Phone held controls → existing authenticated room socket → game input → fixed-step server simulation → game snapshots → one TV WebGL renderer with multiple chase cameras. Phones never load the 3D renderer.

Three.js is the only new runtime dependency. All textures are painted on a 2D canvas at load time, so no image files or fonts are served (the CSP allows only same-origin assets). It is pinned and served locally through two exact allowlisted module paths. No CDN, React, build system, or separate lobby is needed. Custom analytic vehicle physics keeps steering and drift easy to tune without a full rigid-body vehicle stack. Rapier can later replace the physics layer if contact complexity requires it.

## Modules

- `games/kart/game.js`: setup, active roster, mode/driver selection, readiness, TV-load gate, countdown, input expiry, results, reconnect/rekey, serialization, cleanup.
- `shared/kart/world.js`: track and arena data shared by collision and rendering.
- `shared/kart/simulation.js`: vehicle movement, checkpoints, lap order, pickups, attacks, respawns and match rules.
- `shared/game3d/`: reusable renderer/camera/interpolation/resource lifecycle.
- `shared/kart/art.js`: art direction of the 2.5D illustrated look. Canvas-painted textures (grass, road, curb, checker, planks, stone, lava, sky), three-step toon materials with an ink outline pass, instanced scenery (hills, trees, bushes, clouds), the cartoon kart/driver builders and the fixed sprite particle pool.
- `shared/kart/scene.js`: assembles the world from `world.js` data (track strip with painted UVs, curbs, start gate, ramps, platforms, castle walls, item boxes), drives per-frame animation (wheels, clouds, boost flames, drift sparks, dust, hit stars, confetti) and the camera views.
- `shared/kart/icons.js`: ES5 SVG icon set (driver portraits, karts, items, misc) shared by the TV posters/HUD and the phone screens.
- `games/kart/tv.js` + `shared/kart/tv.css`: ES5 TV view. Lobby poster, countdown, per-view HUD (name plate, position badge, lap pill with clock, speed gauge with drift meter, HP bar in battle), podium results.
- `shared/kart/phone.css`: setup poster (mode, driver, kart, roster), results list and the full-screen controller in the same sticker style.
- `games/kart/phone.js`: retained multi-touch controller, private inventory and selection UI.

## Timing and ownership

The server uses 1/60-second physics steps, with bounded catch-up. It publishes about 20 snapshots per second through `api.stream()`. These snapshots do not redraw room UI or write disk state. Slow sockets skip obsolete frames. Each recipient still gets the game's private view.

Phones send input on change: button edges go out at once (at most one packet per 16ms), steering changes at up to 30Hz, and a 10Hz heartbeat keeps the server informed while nothing changes. The server gives `t:'input'` packets their own token bucket (45/s, burst 60) so the general 20/s limit for room messages stays. Stale input expires after 350ms and brakes the kart. Inputs contain steering/buttons only; phones cannot assign positions, laps, damage, or another driver's identity. Match IDs reject old-match packets. Blur, hide, pointer cancellation, orientation change, disconnect and exit clear local controls.

Steering has an 8% deadzone and then a gentle curve (`.6t + .4t²`) so small thumb moves steer a little and the edge of the stick steers fully. Snapshots are rounded to two decimals (about 40% smaller on the wire). The TV consumes snapshots through `tv.frame()`: the scene buffers them and renders 75ms behind the newest one, interpolating position and heading between the two nearest samples.

A drift locks its direction when it starts (button held while turning) and keeps it until the button is released, so passing the stick through center mid-corner does not drop the charge; the stick then tightens or opens the arc. Kart-kart bumps, rail bounces and hits stamp a time the phone turns into a short vibration.

One WebGL renderer shares one scene across two or four camera viewports. Effect meshes come from a fixed pool of twelve; nothing is allocated per frame. Geometry stays simple, with no expensive post-processing or dynamic shadows. Lower render resolution is the first performance fallback. 60 FPS is a target, not a hardware guarantee. A desktop browser with WebGL 2 is required; the TV can be a display attached to that computer.

## Room and match flow

Library → KART → mode → drivers ready → TV ready → countdown → play → results → replay or library. Two to four active entrants use the existing room; extra members watch. Race uses three laps and ordered forward checkpoints, with a time cap. Battle runs for two minutes with kills, health and respawns.

Existing games keep their original contracts. New optional `input`, `tvAction`, `stream`, `frame`, and `destroy` hooks enable real-time games. Exit frees server timers, browser input handlers, animation loops and WebGL resources. Interrupted matches restore to setup with choices retained, so a restart cannot restore a stuck throttle. Completed results can be restored.

## Verification plan

`npm test`: physics rules plus real WebSocket room integration, seat identity, privacy, input expiry, four-driver limit, room isolation, static asset allowlist and old-game launch after Kart.

`npm run test:kart:e2e`: a full three-lap race driven through ordinary WebSocket inputs, return to the library, timed battle and return. No privileged clock or position test endpoints.

Browser checks: actual Three.js loading, independent phone controls, split screen, viewport changes, replay/exit cleanup, console errors and failed requests. These run in headless Chrome driven over the DevTools protocol (TV page plus one browser context per phone, real multi-touch events); see the scratch scripts described in the session notes. Physical phone/Wi-Fi and target-TV GPU testing remain distinct from desktop automation.
