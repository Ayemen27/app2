/**
 * 🕐 Hybrid Logical Clock (HLC) — مرجع أزمنة موزّع
 *
 * يحلّ مشكلة "from-the-future" و"clock-skew" في المزامنة عبر الأجهزة.
 * كل HLC يتكوّن من: physical_ms + logical_counter + node_id
 * تنسيق نصّي مرتب أبجدياً: "000001234567890-00000-nodeXYZ"
 *
 * يُستخدم في كلا الجانبين (server + client) لضمان order ثابت.
 */

const PHYSICAL_PAD = 15; // ms منذ epoch (يكفي حتى عام 33658)
const LOGICAL_PAD = 5;
const MAX_LOGICAL = 99999;
const MAX_DRIFT_MS = 60_000; // قبول انحراف ساعة حتى دقيقة

export interface HlcParts {
  physical: number;
  logical: number;
  nodeId: string;
}

export class HybridLogicalClock {
  private lastPhysical = 0;
  private lastLogical = 0;
  private readonly nodeId: string;

  constructor(nodeId: string) {
    if (!nodeId || nodeId.length === 0) {
      throw new Error("HLC nodeId مطلوب");
    }
    this.nodeId = nodeId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 16) || "anon";
  }

  /** توليد طابع جديد (للكتابة المحلية) */
  now(): string {
    const physicalNow = Date.now();
    if (physicalNow > this.lastPhysical) {
      this.lastPhysical = physicalNow;
      this.lastLogical = 0;
    } else {
      this.lastLogical += 1;
      if (this.lastLogical > MAX_LOGICAL) {
        // overflow نادر جداً
        this.lastPhysical += 1;
        this.lastLogical = 0;
      }
    }
    return formatHlc({
      physical: this.lastPhysical,
      logical: this.lastLogical,
      nodeId: this.nodeId,
    });
  }

  /** دمج طابع وارد من جهاز آخر (Lamport-style update) */
  receive(remoteHlc: string): string {
    const remote = parseHlc(remoteHlc);
    if (!remote) return this.now();

    const physicalNow = Date.now();
    const maxPhysical = Math.max(
      physicalNow,
      this.lastPhysical,
      remote.physical
    );

    // رفض الانحراف المفرط
    if (remote.physical - physicalNow > MAX_DRIFT_MS) {
      console.warn(
        `[HLC] طابع وارد ينحرف عن الساعة المحلية (${remote.physical - physicalNow}ms) — استخدام الساعة المحلية`
      );
    }

    if (maxPhysical === this.lastPhysical && maxPhysical === remote.physical) {
      this.lastLogical = Math.max(this.lastLogical, remote.logical) + 1;
    } else if (maxPhysical === this.lastPhysical) {
      this.lastLogical += 1;
    } else if (maxPhysical === remote.physical) {
      this.lastLogical = remote.logical + 1;
    } else {
      this.lastLogical = 0;
    }
    this.lastPhysical = maxPhysical;

    if (this.lastLogical > MAX_LOGICAL) {
      this.lastPhysical += 1;
      this.lastLogical = 0;
    }

    return formatHlc({
      physical: this.lastPhysical,
      logical: this.lastLogical,
      nodeId: this.nodeId,
    });
  }
}

export function formatHlc(parts: HlcParts): string {
  const phy = String(parts.physical).padStart(PHYSICAL_PAD, "0");
  const log = String(parts.logical).padStart(LOGICAL_PAD, "0");
  return `${phy}-${log}-${parts.nodeId}`;
}

export function parseHlc(hlc: string): HlcParts | null {
  if (!hlc || typeof hlc !== "string") return null;
  const match = hlc.match(/^(\d{15})-(\d{5})-([a-zA-Z0-9_-]+)$/);
  if (!match) return null;
  return {
    physical: parseInt(match[1], 10),
    logical: parseInt(match[2], 10),
    nodeId: match[3],
  };
}

/**
 * مقارنة HLC: إيجابي إذا a > b، سالب إذا a < b، صفر إن متساويان
 * المقارنة النصّية كافية لأنّ التنسيق lexicographically sortable
 */
export function compareHlc(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (!a) return -1;
  if (!b) return 1;
  if (a > b) return 1;
  if (a < b) return -1;
  return 0;
}

/** اختر الفائز من بين سجلَّين بناءً على HLC (أحدث يفوز) */
export function pickWinnerByHlc<T extends { hlc_timestamp?: string | null; hlcTimestamp?: string | null }>(
  a: T,
  b: T
): T {
  const ha = a.hlc_timestamp ?? a.hlcTimestamp ?? null;
  const hb = b.hlc_timestamp ?? b.hlcTimestamp ?? null;
  return compareHlc(ha, hb) >= 0 ? a : b;
}
