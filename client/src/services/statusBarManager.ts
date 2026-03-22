import { Capacitor } from '@capacitor/core';

let StatusBarPlugin: any = null;
let StyleEnum: any = null;

async function loadPlugin() {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const mod = await import('@capacitor/status-bar');
    StatusBarPlugin = mod.StatusBar;
    StyleEnum = mod.Style;
    return true;
  } catch {
    return false;
  }
}

export async function setStatusBarColor(hexColor: string, darkIcons = true) {
  if (!await loadPlugin()) return;
  try {
    await StatusBarPlugin.setBackgroundColor({ color: hexColor });
    await StatusBarPlugin.setStyle({ style: darkIcons ? StyleEnum.Light : StyleEnum.Dark });
    console.log(`[StatusBar] color=${hexColor}, darkIcons=${darkIcons}`);
  } catch (e) {
    console.warn('[StatusBar] setStatusBarColor failed:', e);
  }
}

function isDarkMode(): boolean {
  return document.documentElement.classList.contains('dark') ||
    window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export async function setStatusBarForPage(page: 'login' | 'app' | 'dark') {
  if (!await loadPlugin()) return;
  try {
    const dark = isDarkMode();
    switch (page) {
      case 'login':
        if (dark) {
          await StatusBarPlugin.setBackgroundColor({ color: '#020617' });
          await StatusBarPlugin.setStyle({ style: StyleEnum.Dark });
        } else {
          await StatusBarPlugin.setBackgroundColor({ color: '#FFFFFF' });
          await StatusBarPlugin.setStyle({ style: StyleEnum.Light });
        }
        break;
      case 'app':
        if (dark) {
          await StatusBarPlugin.setBackgroundColor({ color: '#0f172a' });
          await StatusBarPlugin.setStyle({ style: StyleEnum.Dark });
        } else {
          await StatusBarPlugin.setBackgroundColor({ color: '#FFFFFF' });
          await StatusBarPlugin.setStyle({ style: StyleEnum.Light });
        }
        break;
      case 'dark':
        await StatusBarPlugin.setBackgroundColor({ color: '#020617' });
        await StatusBarPlugin.setStyle({ style: StyleEnum.Dark });
        break;
    }
    await StatusBarPlugin.setOverlaysWebView({ overlay: false });
    console.log(`[StatusBar] page=${page}, dark=${dark}`);
  } catch (e) {
    console.warn('[StatusBar] setStatusBarForPage failed:', e);
  }
}

export async function initStatusBar() {
  if (!await loadPlugin()) return;
  try {
    await StatusBarPlugin.setOverlaysWebView({ overlay: false });
    await StatusBarPlugin.show();
  } catch (e) {
    console.warn('[StatusBar] initStatusBar failed:', e);
  }
}
