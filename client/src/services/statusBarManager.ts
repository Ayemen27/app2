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

export async function setStatusBarColor(hexColor: string, isDark = false) {
  if (!await loadPlugin()) return;
  try {
    await StatusBarPlugin.setBackgroundColor({ color: hexColor });
    await StatusBarPlugin.setStyle({ style: isDark ? StyleEnum.Dark : StyleEnum.Light });
  } catch {}
}

export async function setStatusBarForPage(page: 'login' | 'app' | 'dark') {
  if (!await loadPlugin()) return;
  try {
    switch (page) {
      case 'login':
        await StatusBarPlugin.setBackgroundColor({ color: '#FFFFFF' });
        await StatusBarPlugin.setStyle({ style: StyleEnum.Light });
        break;
      case 'app':
        await StatusBarPlugin.setBackgroundColor({ color: '#1e293b' });
        await StatusBarPlugin.setStyle({ style: StyleEnum.Dark });
        break;
      case 'dark':
        await StatusBarPlugin.setBackgroundColor({ color: '#020617' });
        await StatusBarPlugin.setStyle({ style: StyleEnum.Dark });
        break;
    }
    await StatusBarPlugin.setOverlaysWebView({ overlay: false });
  } catch {}
}

export async function initStatusBar() {
  if (!await loadPlugin()) return;
  try {
    await StatusBarPlugin.setOverlaysWebView({ overlay: false });
    await StatusBarPlugin.show();
  } catch {}
}
