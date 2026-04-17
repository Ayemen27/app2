import { Capacitor } from '@capacitor/core';

let StatusBarPlugin: any = null;
let StyleEnum: any       = null;

function isPluginReady(): boolean {
  try { return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('StatusBar'); } catch { return false; }
}

async function loadPlugin(): Promise<boolean> {
  if (!isPluginReady()) return false;
  try {
    const mod      = await import('@capacitor/status-bar');
    StatusBarPlugin = mod.StatusBar;
    StyleEnum       = mod.Style;
    return true;
  } catch {
    return false;
  }
}

function isDarkMode(): boolean {
  return (
    document.documentElement.classList.contains('dark') ||
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

export async function setStatusBarColor(hexColor: string, darkIcons = true) {
  if (!await loadPlugin()) return;
  try {
    await StatusBarPlugin.setBackgroundColor({ color: hexColor });
    await StatusBarPlugin.setStyle({ style: darkIcons ? StyleEnum.Light : StyleEnum.Dark });
  } catch {}
}

export async function getStatusBarHeight(): Promise<number> {
  if (!await loadPlugin()) return 0;
  try {
    await StatusBarPlugin.getInfo();
    return 24; // قيمة افتراضية موثوقة لشريط الحالة في Android
  } catch {
    return 0;
  }
}

export async function setStatusBarForPage(page: 'login' | 'app' | 'dark') {
  if (!await loadPlugin()) return;
  try {
    const dark = isDarkMode();

    switch (page) {
      case 'login':
        await StatusBarPlugin.setBackgroundColor({ color: dark ? '#020617' : '#FFFFFF' });
        await StatusBarPlugin.setStyle({ style: dark ? StyleEnum.Dark : StyleEnum.Light });
        break;
      case 'app':
        await StatusBarPlugin.setBackgroundColor({ color: dark ? '#0f172a' : '#FFFFFF' });
        await StatusBarPlugin.setStyle({ style: dark ? StyleEnum.Dark : StyleEnum.Light });
        break;
      case 'dark':
        await StatusBarPlugin.setBackgroundColor({ color: '#020617' });
        await StatusBarPlugin.setStyle({ style: StyleEnum.Dark });
        break;
    }

    await StatusBarPlugin.setOverlaysWebView({ overlay: false });
    document.body.style.paddingTop = 'env(safe-area-inset-top)';
  } catch {}
}

export async function initStatusBar() {
  if (!await loadPlugin()) return;
  try {
    await StatusBarPlugin.setOverlaysWebView({ overlay: false });
    await StatusBarPlugin.show();
    document.body.style.paddingTop = 'env(safe-area-inset-top)';
  } catch {}
}
