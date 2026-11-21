# TRICK OR TREAT

A first-person Halloween horror game. October 31, 1990: you let go of your little brother's hand on Hollow Lane
for one second, and Toby is gone. Follow the candy he dropped from house to house while the Tall Pumpkin Man
walks the street, and the neighbours watch from their porches.

Play: `node serve.js`, then open http://localhost:8080 in Chrome. No build step; Three.js 0.160 loads from a CDN.

## The night
1. **The Moss house**: Toby's bucket, his mask, Mrs. Moss in front of the TV, and his first visit.
2. **The Ferris house**: Lisa's room, kept the way it was in 1989. Her parents only move when you aren't looking.
3. **Dorsey's House of Horrors**: a haunted garage of black curtains, pop-ups, and a guillotine that was never a prop.
4. **The Marsh farm**: the gate at the top of the lane, the house where it started in 1958.
5. **The corn**: candles round a clearing, and Toby.
6. **The run home**, with Toby, and him right behind you.

Three jack-o'-lanterns have names carved in them (Danny, Lisa, Marcus). Blowing all three out decides the ending.
Four endings: TREAT, TRICK, THE CANDLE, PORCH LIGHT. Five deaths: carved, found, held, headless, torn.
Gore defaults to Full; Settings → Gore → Quick cut cuts to black instead.

## How he works (`js/pumpkin.js`)
- Sees you within a range that grows with your flashlight and standing in light, and shrinks when you crouch or
  stand still; ~72° to either side; walls, closed doors and corn block him. A flashlight beam in his face: he knows.
- Hears running (10-14 m), walking (3 m), doors. Neighbours who see you scream and send him to you.
- Chases at 3.7 m/s (you run at 4.3 until you're out of breath). Lose him for 5 s and he searches.
- If he watches you hide, he walks straight to your hiding place. Beside it, hold your breath or he hears you.
- Walks a graph of points (`buildNav` in world.js), joined wherever there's a clear line; A* for paths.
- The walkie-talkie hisses louder the closer he is.

## Files
- `js/world.js` — the street, 12 houses (2 you can enter), the garage maze, the Marsh farmhouse, the corn; collision
  grid; exact line-of-sight; the nav graph; static boxes merged by material (~1500 boxes → ~230 meshes).
- `js/story.js` — chapters, checkpoints, the candy trail, interactions, notes, the neighbours, the Ferrises, the
  guillotine, the ghosts, the chase home, the opening cutscene.
- `js/pumpkin.js` — his body and his mind. `js/deaths.js` — death scenes. `js/people.js` — everyone else.
- `js/tex.js`, `js/tex2.js` — every texture painted on canvases. `js/audio.js` — every sound synthesized.
- `js/main.js` — renderer, post effect, lights, player, hiding, menus, endings, saving, sync + achievements.

## Tests
`node tools/smoke.mjs` (views of every area, draw calls), `node tools/play.mjs` (the whole night through the test
hooks: every chapter, deaths, all four endings), `node tools/icons.mjs` (icons + cover), `sh tools/check.sh` (syntax).
They need Chrome; screenshots go to `tools/shots/`.
