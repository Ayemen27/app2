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
  } catch (e) {
  }
}

function isDarkMode(): boolean {
  return document.documentElement.classList.contains('dark') ||
    window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export async function getStatusBarHeight(): Promise<number> {
  if (!await loadPlugin()) return 0;
  try {
    const info = await StatusBarPlugin.getInfo();
    // Return a default height if we can't get it, or use the info if available in future versions
    // For now, most Android status bars are around 24dp-32dp
    return 24; 
  } catch (e) {
    return 0;
  }
}

export async function setStatusBarForPage(page: 'login' | 'app' | 'dark') {
  if (!await loadPlugin()) return;
  try {
    const dark = isDarkMode();
    const overlay = false;
    
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
    
    await StatusBarPlugin.setOverlaysWebView({ overlay });
    
    // Apply padding to document body to prevent overlap when not overlaying
    if (!overlay) {
      document.body.style.paddingTop = 'env(safe-area-inset-top)';
    } else {
      document.body.style.paddingTop = '0px';
    }
  } catch (e) {
  }
}

export async function initStatusBar() {
  if (!await loadPlugin()) return;
  try {
    const overlay = false;
    await StatusBarPlugin.setOverlaysWebView({ overlay });
    await StatusBarPlugin.show();
    
    // Apply padding to document body to prevent overlap when not overlaying
    if (!overlay) {
      document.body.style.paddingTop = 'env(safe-area-inset-top)';
    } else {
      document.body.style.paddingTop = '0px';
    }
  } catch (e) {
  }
}
