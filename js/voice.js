// Spoken lines go through the browser's own text to speech, each character pitched and paced their own way.
// HIM is slowed and dropped so it sounds wrong. Subtitles always show the words too.
const S = typeof speechSynthesis !== 'undefined' ? speechSynthesis : null;
const CAST = {
  SAM: { pitch: 1.05, rate: 1.0, prefer: [/jenny.*natural|aria.*natural|ana.*natural/i, /google us english|samantha|zira/i, /female|zira/i] },
  TOBY: { pitch: 1.9, rate: 1.1, prefer: [/ana.*natural|jenny.*natural/i, /google us english|samantha|zira/i, /female|zira/i] },
  MOSS: { pitch: 1.25, rate: 0.82, prefer: [/sonia.*natural|libby.*natural|aria.*natural/i, /google uk english female|hazel|susan/i, /female|zira/i] },
  FERRIS: { pitch: 0.95, rate: 0.85, prefer: [/michelle.*natural|aria.*natural/i, /google us english|zira/i, /female/i] },
  MRFERRIS: { pitch: 0.7, rate: 0.85, prefer: [/guy.*natural|davis.*natural/i, /google uk english male|david/i, /male|david/i] },
  KIDS: { pitch: 1.7, rate: 0.75, prefer: [/ana.*natural|jenny.*natural/i, /google us english|zira/i, /female/i] },
  HIM: { pitch: 0.1, rate: 0.5, prefer: [/christopher.*natural|guy.*natural/i, /google uk english male|daniel/i, /male|david/i] },
  MOM: { pitch: 1.0, rate: 1.0, prefer: [/aria.*natural|jenny.*natural/i, /google us english|zira/i, /female/i] },
};
let voices = [], picked = {};
function load() {
  if (!S) return;
  voices = S.getVoices().filter((v) => /^en/i.test(v.lang));
  picked = {};
  for (const [who, c] of Object.entries(CAST)) { let v = null; for (const re of c.prefer) { v = voices.find((x) => re.test(x.name)); if (v) break; } picked[who] = v || voices[0] || null; }
}
if (S) { load(); S.addEventListener?.('voiceschanged', load); }
export const voice = {
  on: true, vol: 0.9,
  say(who, text, onend) {
    if (!S || !this.on || this.vol <= 0) { onend?.(); return null; }
    if (!voices.length) load();
    const c = CAST[who] || CAST.SAM, u = new SpeechSynthesisUtterance(text.replace(/<[^>]+>/g, ''));
    const v = picked[who]; if (v) { u.voice = v; u.lang = v.lang; }
    u.pitch = c.pitch; u.rate = c.rate; u.volume = Math.min(1, this.vol * (who === 'TOBY' ? 0.8 : 1));
    let done = false; const end = () => { if (!done) { done = true; onend?.(); } };
    u.onend = end; u.onerror = end;
    try { S.resume(); S.speak(u); } catch { end(); }
    return u;
  },
  get busy() { return !!S?.speaking; },
  cancel() { try { S?.cancel(); } catch { /* fine */ } },
  pause() { try { S?.pause(); } catch { /* fine */ } },
  resume() { try { S?.resume(); } catch { /* fine */ } },
};
