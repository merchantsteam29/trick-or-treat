// Boots the live GitHub Pages copy and checks it starts a night without errors.
import { open, sleep } from './harness.mjs';
process.env.SH_URL = 'https://merchantsteam29.github.io/trick-or-treat/';
const { ev, check, done } = await open(import.meta.url);
for (let i = 0; i < 80 && (await ev('return document.body.dataset.ready')) !== '1'; i++) await sleep(500);
check(await ev('return document.body.dataset.ready') === '1', 'live site booted');
await ev(`localStorage.clear(); document.getElementById('warnOk').click(); __s.startFrom(1)`);
for (let i = 0; i < 40 && (await ev('return __s.mode')) !== 'play'; i++) await sleep(250);
check(await ev('return __s.mode') === 'play', 'playing on the live site');
await done();
