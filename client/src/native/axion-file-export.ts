import { registerPlugin } from '@capacitor/core';
import { debugLog } from '@/utils/webview-download';

export interface AxionFileExportPlugin {
  /**
   * Begin a streaming write session. Native side opens a temp file in cache.
   * Returns a sessionId to use for subsequent chunk writes.
   */
  startWrite(options: {
    fileName: string;
  }): Promise<{ sessionId: string }>;

  /**
   * Append a base64-encoded chunk to the open session.
   * Chunks should be ≤ 256KB of base64 text (≈192KB binary) to keep bridge memory bounded.
   * Native side decodes and streams to FileOutputStream immediately.
   */
  writeChunk(options: {
    sessionId: string;
    chunk: string;
  }): Promise<void>;

  /**
   * Finalize the write and share the file via Intent.ACTION_SEND with a FileProvider URI.
   * Closes the session and deletes the cached file after share intent dispatched.
   */
  finishAndShare(options: {
    sessionId: string;
    mimeType: string;
    dialogTitle?: string;
  }): Promise<{ shared: boolean }>;

  /**
   * Finalize the write and save the file directly to MediaStore.Downloads.
   */
  finishAndSaveToDownloads(options: {
    sessionId: string;
    mimeType: string;
  }): Promise<{ uri: string; relativePath: string }>;

  /**
   * Finalize via Storage Access Framework — opens system file picker so the user
   * chooses the exact save location.
   */
  finishAndSaveAs(options: {
    sessionId: string;
    mimeType: string;
  }): Promise<{ uri: string; cancelled?: boolean }>;

  /**
   * Cancel an in-progress session, deletes the temp cache file.
   */
  cancelWrite(options: {
    sessionId: string;
  }): Promise<void>;
}

export const AxionFileExport = registerPlugin<AxionFileExportPlugin>('AxionFileExport');

const CHUNK_SIZE = 192 * 1024; // 192KB binary ≈ 256KB base64

/**
 * High-level helper to stream a blob to the native export plugin.
 */
export async function streamExport(
  blob: Blob,
  fileName: string,
  mimeType: string,
  mode: 'share' | 'downloads' | 'saveAs' = 'share'
): Promise<{ success: boolean; uri?: string; cancelled?: boolean }> {
  let sessionId: string | null = null;
  try {
    debugLog('AxionFileExport', 'START', `${fileName} (${blob.size} bytes, mode=${mode})`);

    // 1. Start write
    const startResult = await AxionFileExport.startWrite({ fileName });
    sessionId = startResult.sessionId;
    debugLog('AxionFileExport', 'SESSION', sessionId);

    // 2. Stream chunks
    const totalSize = blob.size;
    let offset = 0;

    while (offset < totalSize) {
      const end = Math.min(offset + CHUNK_SIZE, totalSize);
      const chunk = blob.slice(offset, end);
      
      const base64 = await blobToBase64(chunk);
      await AxionFileExport.writeChunk({
        sessionId,
        chunk: base64
      });
      
      offset = end;
      const progress = Math.round((offset / totalSize) * 100);
      if (progress % 20 === 0 || offset === totalSize) {
        debugLog('AxionFileExport', 'PROGRESS', `${progress}%`);
      }
    }

    // 3. Finalize based on mode
    if (mode === 'share') {
      const result = await AxionFileExport.finishAndShare({
        sessionId,
        mimeType,
        dialogTitle: `مشاركة: ${fileName}`
      });
      debugLog('AxionFileExport', 'FINISH_SHARE', `shared=${result.shared}`);
      return { success: true };
    } else if (mode === 'downloads') {
      const result = await AxionFileExport.finishAndSaveToDownloads({
        sessionId,
        mimeType
      });
      debugLog('AxionFileExport', 'FINISH_DOWNLOADS', result.uri);
      return { success: true, uri: result.uri };
    } else if (mode === 'saveAs') {
      const result = await AxionFileExport.finishAndSaveAs({
        sessionId,
        mimeType
      });
      debugLog('AxionFileExport', 'FINISH_SAVEAS', result.cancelled ? 'CANCELLED' : result.uri);
      return { success: true, uri: result.uri, cancelled: result.cancelled };
    }

    return { success: false };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    debugLog('AxionFileExport', 'ERROR', errorMsg);
    
    // Clean up if something went wrong
    if (sessionId) {
      try {
        await AxionFileExport.cancelWrite({ sessionId });
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    
    if (errorMsg === 'ERR_USER_CANCELLED') {
      return { success: true, cancelled: true };
    }
    
    return { success: false };
  }
}

/**
 * Helper to convert a blob/chunk to base64 (without data: prefix)
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const idx = result.indexOf(',');
      resolve(idx >= 0 ? result.substring(idx + 1) : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
