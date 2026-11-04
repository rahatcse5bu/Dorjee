// Records a narrated Bangla tutorial of the real Dorjee shop app.
// usage: node tut/rec.mjs <tutorial-module> <out.mp4>
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.dirname(new URL(import.meta.url).pathname);
const EXE = process.env.HOME + '/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell';
const APP = 'http://localhost:3100';
const VOICE = 'nPczCjzI2devNBz1zQrb';

const [, , modPath, outPath] = process.argv;
const tut = (await import(path.resolve(modPath))).default;

// ---------- narration (cached per text) ----------
const key = fs.readFileSync('/Volumes/TRANSCEND/PNC_Soft_Tech/Dorjee/.env', 'utf8').match(/^ELEVEN_LABS_API_KEY=(.*)$/m)[1].trim().replace(/^["']|["']$/g, '');
fs.mkdirSync(path.join(DIR, 'vo'), { recursive: true });
const dur = f => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());
async function tts(text) {
  if (process.env.DRY) {
    const d = Math.max(2, text.length * 0.075), f = path.join(DIR, 'vo', 'silent_' + d.toFixed(2) + '.mp3');
    if (!fs.existsSync(f)) execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', d.toFixed(2), f]);
    return { file: f, dur: d };
  }
  const f = path.join(DIR, 'vo', crypto.createHash('sha1').update(text).digest('hex').slice(0, 16) + '.mp3');
  if (!fs.existsSync(f)) {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`, {
      method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model_id: 'eleven_v4', language_code: 'bn', voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.2, speed: 1.0 } }),
    });
    if (!r.ok) throw new Error('TTS ' + r.status + ' ' + (await r.text()));
    fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
  }
  return { file: f, dur: dur(f) };
}
const steps = [];
for (const s of tut.steps) steps.push({ ...s, vo: await tts(s.say) });
console.log('narration ready:', steps.map(s => s.vo.dur.toFixed(1)).join(' '));

// ---------- browser + overlays ----------
const browser = await chromium.launch({ executablePath: EXE });
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5,
  storageState: path.join(DIR, 'state.json'),
});
await ctx.addInitScript(() => {
  try { localStorage.setItem('dorjee_lang', 'bn'); } catch {}
  const boot = () => {
    if (document.getElementById('__tut')) return;
    const root = document.createElement('div');
    root.id = '__tut';
    root.innerHTML = `
      <style>
        #__tut{position:fixed;inset:0;pointer-events:none;z-index:2147483647;font-family:'Hind Siliguri','Bangla Sangam MN',sans-serif}
        #__cur{position:absolute;left:0;top:0;width:30px;height:30px;transform:translate(-4px,-3px);transition:none;filter:drop-shadow(0 3px 4px rgba(0,0,0,.35))}
        .__rip{position:absolute;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;border:3px solid #f2a33a;animation:__r .6s ease-out forwards}
        @keyframes __r{to{transform:scale(4.5);opacity:0}}
        #__ring{position:absolute;border:3px solid #f2a33a;border-radius:14px;box-shadow:0 0 0 6px rgba(242,163,58,.25);opacity:0;transition:all .35s cubic-bezier(.2,.8,.3,1)}
        #__sub{position:absolute;left:50%;bottom:18px;transform:translateX(-50%);max-width:1150px;width:max-content;text-align:center;background:rgba(19,42,46,.88);color:#fff;
               font-size:21px;font-weight:500;line-height:1.5;padding:8px 26px;border-radius:14px;opacity:0;transition:opacity .25s}
        #__step{position:absolute;left:50%;top:10px;margin-left:-110px;display:flex;align-items:center;gap:10px;background:#fff;border-radius:999px;padding:6px 18px 6px 6px;
                box-shadow:0 10px 30px rgba(19,42,46,.18);font-size:16px;font-weight:600;color:#132a2e;opacity:0;transition:opacity .3s, transform .3s;transform:translateY(-10px)}
        #__step b{background:#177e89;color:#fff;border-radius:999px;padding:1px 10px;font-size:14px}
        .__card #__cur{display:none}
      </style>
      <div id="__ring"></div>
      <div id="__step"><b></b><span></span></div>
      <div id="__sub"></div>
      <svg id="__cur" viewBox="0 0 24 24"><path d="M4 2l15 10.5-6.6 1.3 4 7.6-3 1.6-4-7.7L4 20z" fill="#132a2e" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
    document.documentElement.appendChild(root);
    if (location.protocol === 'file:') root.classList.add('__card');
    const cur = root.querySelector('#__cur');
    const st = JSON.parse(sessionStorage.getItem('__tutpos') || '{"x":800,"y":450}');
    cur.style.left = st.x + 'px'; cur.style.top = st.y + 'px';
    addEventListener('mousemove', e => { cur.style.left = e.clientX + 'px'; cur.style.top = e.clientY + 'px'; sessionStorage.setItem('__tutpos', JSON.stringify({ x: e.clientX, y: e.clientY })); }, true);
    addEventListener('mousedown', e => { const r = document.createElement('div'); r.className = '__rip'; r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px'; root.appendChild(r); setTimeout(() => r.remove(), 700); }, true);
    window.__tutSet = (sub, n, label) => {
      const s = root.querySelector('#__sub'); s.textContent = sub || ''; s.style.opacity = sub ? 1 : 0;
      const p = root.querySelector('#__step');
      if (label) { p.querySelector('b').textContent = n; p.querySelector('span').textContent = label; p.style.opacity = 1; p.style.transform = 'none'; }
      else { p.style.opacity = 0; }
    };
    window.__tutRing = (r) => {
      const g = root.querySelector('#__ring');
      if (!r) { g.style.opacity = 0; return; }
      Object.assign(g.style, { left: r.x - 6 + 'px', top: r.y - 6 + 'px', width: r.width + 12 + 'px', height: r.height + 12 + 'px', opacity: 1 });
    };
    const saved = sessionStorage.getItem('__tutsub');
    if (saved) { const [a, b, c] = JSON.parse(saved); window.__tutSet(a, b, c); }
  };
  if (document.documentElement) boot(); else document.addEventListener('DOMContentLoaded', boot);
  document.addEventListener('DOMContentLoaded', boot);
});
const page = await ctx.newPage();

// ---------- screencast ----------
const frames = [];
const cdp = await ctx.newCDPSession(page);
cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
  frames.push({ t: metadata.timestamp, data });
  try { await cdp.send('Page.screencastFrameAck', { sessionId }); } catch {}
});

// ---------- helpers for tutorial steps ----------
const sleep = ms => new Promise(r => setTimeout(r, ms));
let mouse = { x: 640, y: 360 };
const h = {
  page, sleep, APP,
  async goto(p) { await page.goto(p.startsWith('http') || p.startsWith('file') ? p : APP + p, { waitUntil: 'networkidle' }); await sleep(300); },
  async moveTo(loc, { ring = true } = {}) {
    await loc.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    await sleep(450);
    const b = await loc.boundingBox();
    if (!b) throw new Error('no box');
    const x = b.x + Math.min(b.width / 2, 60 + b.width * 0.25), y = b.y + b.height / 2;
    if (ring) await page.evaluate(r => window.__tutRing?.(r), b);
    const n = Math.max(12, Math.round(Math.hypot(x - mouse.x, y - mouse.y) / 14));
    for (let i = 1; i <= n; i++) {
      const k = i / n, e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      await page.mouse.move(mouse.x + (x - mouse.x) * e, mouse.y + (y - mouse.y) * e);
      await sleep(12);
    }
    mouse = { x, y };
    return b;
  },
  async click(loc, opts) { await h.moveTo(loc, opts); await sleep(250); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(350); await page.evaluate(() => window.__tutRing?.(null)); },
  async type(loc, text, delay = 85) { await h.click(loc); await loc.pressSequentially(text, { delay }); await sleep(250); },
  async select(loc, label) { await h.moveTo(loc); await sleep(300); await loc.selectOption({ label }); await sleep(500); await page.evaluate(() => window.__tutRing?.(null)); },
  async ring(loc, ms = 1500) { const b = await h.moveTo(loc); await sleep(ms); await page.evaluate(() => window.__tutRing?.(null)); return b; },
  async scroll(dy) { await page.mouse.wheel(0, dy); await sleep(700); },
};

// ---------- run ----------
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
const card = (o) => 'file://' + path.join(DIR, 'card.html') + '?' + new URLSearchParams(o).toString();
const audio = [];
const t0 = Date.now() / 1000;
let stepNo = 0;
for (const s of steps) {
  if (s.card) await h.goto(card(s.card));
  if (s.before) await s.before(h);
  if (s.label) stepNo++;
  const n = s.label ? `ধাপ ${'০১২৩৪৫৬৭৮৯'[stepNo] ?? stepNo}` : '';
  await page.evaluate(([a, b, c]) => { sessionStorage.setItem('__tutsub', JSON.stringify([a, b, c])); window.__tutSet?.(a, b, c); }, [s.card ? '' : s.say, n, s.label || '']);
  const start = Date.now() / 1000;
  audio.push({ file: s.vo.file, at: start - t0 });
  const work = s.act ? s.act(h).catch(async e => { await page.screenshot({ path: path.join(DIR, 'fail.png') }); throw e; }) : Promise.resolve();
  if (!s.card) {
    const parts = s.say.split(/(?<=[।?!])\s+/);
    const tot = parts.reduce((a, p) => a + p.length, 0);
    let acc = 0;
    parts.forEach((p, i) => {
      const at = (acc / tot) * s.vo.dur * 1000; acc += p.length;
      setTimeout(() => page.evaluate(([a, b, c]) => { sessionStorage.setItem('__tutsub', JSON.stringify([a, b, c])); window.__tutSet?.(a, b, c); }, [p, n, s.label || '']).catch(() => {}), i === 0 ? 0 : at);
    });
  }
  await Promise.all([work, sleep((s.vo.dur + (s.pad ?? 0.5)) * 1000)]);
  if (s.after) await sleep(s.after * 1000);
}
await page.evaluate(() => { sessionStorage.removeItem('__tutsub'); window.__tutSet?.('', '', ''); });
await sleep(800);
const tEnd = Date.now() / 1000;
await cdp.send('Page.stopScreencast');
await browser.close();

// ---------- assemble ----------
const work = path.join(DIR, 'work_' + path.basename(outPath, '.mp4'));
fs.rmSync(work, { recursive: true, force: true }); fs.mkdirSync(work);
const first = frames.findIndex(f => f.t >= t0 - 0.05);
const fr = frames.slice(Math.max(0, first - 1));
let list = '';
fr.forEach((f, i) => {
  const name = `f${String(i).padStart(6, '0')}.jpg`;
  fs.writeFileSync(path.join(work, name), Buffer.from(f.data, 'base64'));
  const next = i + 1 < fr.length ? fr[i + 1].t : tEnd;
  const t = Math.max(0.001, next - Math.max(f.t, t0));
  list += `file '${name}'\nduration ${t.toFixed(4)}\n`;
});
list += `file 'f${String(fr.length - 1).padStart(6, '0')}.jpg'\n`;
fs.writeFileSync(path.join(work, 'list.txt'), list);
const total = tEnd - t0;
const ins = [], fl = [];
audio.forEach((a, i) => { ins.push('-i', a.file); const ms = Math.round(a.at * 1000); fl.push(`[${i + 1}:a]adelay=${ms}|${ms}[a${i}]`); });
const mix = audio.map((_, i) => `[a${i}]`).join('') + `amix=inputs=${audio.length}:normalize=0,apad=whole_dur=${total.toFixed(3)},loudnorm=I=-16:TP=-1.5[aout]`;
execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(work, 'list.txt'), ...ins,
  '-filter_complex', fl.join(';') + ';' + mix + ';[0:v]fps=30,scale=1920:1080:flags=lanczos,format=yuv420p[vout]',
  '-map', '[vout]', '-map', '[aout]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-c:a', 'aac', '-b:a', '160k',
  '-t', total.toFixed(3), '-movflags', '+faststart', outPath]);
console.log('wrote', outPath, total.toFixed(1) + 's', fr.length, 'frames');
