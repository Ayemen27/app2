/**
 * 🕐 HLC singleton للسيرفر
 *
 * يضمن طوابع زمنية فريدة لكل عملية كتابة على السيرفر،
 * متماثلة مع HLC العميل عند الدمج.
 */

import { HybridLogicalClock } from "@shared/hlc";
import { randomBytes } from "crypto";

const SERVER_NODE_ID =
  process.env.HLC_NODE_ID ||
  `srv-${randomBytes(4).toString("hex")}`;

export const serverHlc = new HybridLogicalClock(SERVER_NODE_ID);

/** ولّد طابع HLC جديد لعملية كتابة على السيرفر */
export function newHlc(): string {
  return serverHlc.now();
}

/** عند استقبال طابع من العميل: ادمجه وأرجع طابعاً محدّثاً */
export function mergeClientHlc(clientHlc?: string | null): string {
  if (!clientHlc) return serverHlc.now();
  return serverHlc.receive(clientHlc);
}
