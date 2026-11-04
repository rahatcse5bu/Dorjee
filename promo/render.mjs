// usage: node render.mjs [preview t1,t2,...]  |  node render.mjs full
import { chromium } from 'playwright';
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.dirname(new URL(import.meta.url).pathname);
const FPS = 30;
const script = JSON.parse(fs.readFileSync(path.join(DIR, 'script.json'), 'utf8'));
const dur = f => parseFloat(execFileSync('ffprobe', ['-v','error','-show_entries','format=duration','-of','csv=p=0', f]).toString());

// per scene: lead-in before voice, voice, tail after voice
const LEAD = { s1: 0.9, s2: 1.4 }, TAIL = { s8: 2.2 };
let t = 0;
const scenes = script.map(s => {
  const vdur = dur(path.join(DIR, 'audio', s.id + '.mp3'));
  const vo = LEAD[s.id] ?? 0.35;
  const d = vo + vdur + (TAIL[s.id] ?? 0.55);
  const sc = { id: s.id, text: s.text, start: t, dur: d, vo, vdur };
  t += d;
  return sc;
});
const TOTAL = t;
fs.writeFileSync(path.join(DIR, 'timeline.json'), JSON.stringify({ scenes, TOTAL }, null, 1));
console.log('total', TOTAL.toFixed(2), scenes.map(s => `${s.id}:${s.dur.toFixed(2)}`).join(' '));

const mode = process.argv[2] || 'preview';
const browser = await chromium.launch({ executablePath: process.env.HOME + '/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.addInitScript(([S, T]) => { window.SCENES = S; window.TOTAL = T; }, [scenes, TOTAL]);
await page.goto('file://' + path.join(DIR, 'promo.html'));
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(500);

if (mode === 'preview') {
  const times = (process.argv[3] || '').split(',').filter(Boolean).map(Number);
  const pts = times.length ? times : scenes.map(s => s.start + s.dur * 0.75);
  fs.mkdirSync(path.join(DIR, 'preview'), { recursive: true });
  for (const [i, tt] of pts.entries()) {
    await page.evaluate(x => window.render(x), tt);
    await page.screenshot({ path: path.join(DIR, 'preview', `p${i}.jpg`), type: 'jpeg', quality: 80 });
  }
  console.log('preview done', pts.map(x => x.toFixed(1)).join(','));
} else {
  // audio: place each clip at start+vo
  const inputs = [], filters = [];
  scenes.forEach((s, i) => {
    inputs.push('-i', path.join(DIR, 'audio', s.id + '.mp3'));
    const ms = Math.round((s.start + s.vo) * 1000);
    filters.push(`[${i}:a]adelay=${ms}|${ms}[a${i}]`);
  });
  const mix = scenes.map((_, i) => `[a${i}]`).join('') + `amix=inputs=${scenes.length}:normalize=0,apad=whole_dur=${TOTAL.toFixed(3)},loudnorm=I=-16:TP=-1.5[out]`;
  execFileSync('ffmpeg', ['-y', '-v', 'error', ...inputs, '-filter_complex', filters.join(';') + ';' + mix, '-map', '[out]', '-ar', '48000', path.join(DIR, 'voice.wav')]);

  const out = path.join(DIR, 'dorjee_promo_bn.mp4');
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-i', path.join(DIR, 'voice.wav'), '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const N = Math.ceil(TOTAL * FPS);
  for (let f = 0; f < N; f++) {
    await page.evaluate(x => window.render(x), f / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 150 === 0) console.log(`frame ${f}/${N}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  console.log('wrote', out);
}
await browser.close();
