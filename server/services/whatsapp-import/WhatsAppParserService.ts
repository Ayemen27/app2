import type { InsertWaRawMessage } from "@shared/schema";

const EASTERN_TO_WESTERN: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

function easternToWestern(str: string): string {
  return str.replace(/[٠-٩]/g, (ch) => EASTERN_TO_WESTERN[ch] || ch);
}

function stripRtlMarkers(str: string): string {
  return str.replace(/[\u200F\u200E\u202A-\u202E\u2066-\u2069]/g, '');
}

const MESSAGE_LINE_RE = /^(\d{1,2}\/\d{1,2}\/\d{4})،?\s*(\d{1,2}:\d{2})\s*(ص|م|AM|PM)\s*-\s*(.+?):\s(.*)$/;

interface ParsedMessage {
  timestamp: Date;
  sender: string;
  text: string;
  attachmentRef: string | null;
  isMultiline: boolean;
  messageOrder: number;
}

function parseTimestamp(dateStr: string, timeStr: string, period: string): Date {
  const [day, month, year] = dateStr.split('/').map(Number);
  let [hours, minutes] = timeStr.split(':').map(Number);

  const isPm = period === 'م' || period === 'PM';
  const isAm = period === 'ص' || period === 'AM';

  if (isPm && hours !== 12) hours += 12;
  if (isAm && hours === 12) hours = 0;

  return new Date(year, month - 1, day, hours, minutes);
}

const ATTACHMENT_RE = /(.+?)\s*\(الملف مرفق\)$/;
const SYSTEM_MESSAGES = [
  'تم تغيير',
  'الرسائل والمكالمات مشفرة',
  'أضاف',
  'أزال',
  'غادر',
  'انضم',
  'تم إنشاء',
  'أنشأ',
  'غيّر',
  'تم حذف هذه الرسالة',
  'رسالة محذوفة',
];

function isSystemMessage(text: string): boolean {
  return SYSTEM_MESSAGES.some(prefix => text.includes(prefix));
}

export function parseWhatsAppChat(
  content: string,
  batchId: number,
  chatSource: string
): InsertWaRawMessage[] {
  const normalized = easternToWestern(stripRtlMarkers(content));
  const lines = normalized.split('\n');
  const messages: ParsedMessage[] = [];
  let currentMsg: ParsedMessage | null = null;
  let order = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const match = line.match(MESSAGE_LINE_RE);
    if (match) {
      if (currentMsg) {
        messages.push(currentMsg);
      }

      const [, dateStr, timeStr, period, sender, text] = match;
      const timestamp = parseTimestamp(dateStr, timeStr, period);
      order++;

      if (isSystemMessage(text) || isSystemMessage(sender + ': ' + text)) {
        currentMsg = null;
        continue;
      }

      let attachmentRef: string | null = null;
      let messageText = text;
      const attachMatch = text.match(ATTACHMENT_RE);
      if (attachMatch) {
        attachmentRef = attachMatch[1].trim();
        messageText = text;
      }

      currentMsg = {
        timestamp,
        sender: sender.trim(),
        text: messageText,
        attachmentRef,
        isMultiline: false,
        messageOrder: order,
      };
    } else if (currentMsg) {
      currentMsg.text += '\n' + line;
      currentMsg.isMultiline = true;
    }
  }

  if (currentMsg) {
    messages.push(currentMsg);
  }

  return messages.map((msg): InsertWaRawMessage => ({
    batchId,
    waTimestamp: msg.timestamp,
    sender: msg.sender,
    messageText: msg.text,
    isMultiline: msg.isMultiline,
    attachmentRef: msg.attachmentRef,
    inlineClaimedDate: null,
    dateMismatchReason: null,
    chatSource,
    messageOrder: msg.messageOrder,
  }));
}

export function detectChatSource(content: string): string {
  const normalized = easternToWestern(stripRtlMarkers(content));
  if (normalized.includes('زين العابدين') || normalized.includes('زين')) return 'zain';
  if (normalized.includes('العباسي') || normalized.includes('عبداللة العباسي')) return 'abbasi';
  return 'other';
}
