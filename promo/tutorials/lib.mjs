import { chromium } from 'playwright';
export const EXE = process.env.HOME + '/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell';
export async function openApp({ width = 1440, height = 900, lang = 'bn', storage } = {}) {
  const browser = await chromium.launch({ executablePath: EXE });
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, storageState: storage });
  await ctx.addInitScript((l) => { try { localStorage.setItem('dorjee_lang', l); } catch {} }, lang);
  const page = await ctx.newPage();
  return { browser, ctx, page };
}
