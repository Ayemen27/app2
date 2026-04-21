/**
 * 🕐 HLC singleton للعميل
 *
 * كل جهاز له node_id فريد محفوظ في localStorage.
 * يُستخدم لختم كل عملية offline قبل وضعها في outbox.
 */

import { HybridLogicalClock } from "@shared/hlc";

const NODE_ID_KEY = "axion.hlcNodeId";

function getOrCreateNodeId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = localStorage.getItem(NODE_ID_KEY);
    if (!id) {
      // node_id قصير ومميّز
      id =
        "c" +
        Math.random().toString(36).slice(2, 8) +
        Date.now().toString(36).slice(-4);
      localStorage.setItem(NODE_ID_KEY, id);
    }
    return id;
  } catch {
    return "anon" + Math.random().toString(36).slice(2, 6);
  }
}

const clientNodeId = getOrCreateNodeId();
export const clientHlc = new HybridLogicalClock(clientNodeId);

export function newHlc(): string {
  return clientHlc.now();
}

export function receiveHlc(remote: string): string {
  return clientHlc.receive(remote);
}

export function getNodeId(): string {
  return clientNodeId;
}
