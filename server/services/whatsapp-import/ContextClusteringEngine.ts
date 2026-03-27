export interface RawMessageForClustering {
  id: number;
  waTimestamp: Date;
  sender: string;
  messageText: string | null;
  attachmentRef: string | null;
  messageOrder: number;
}

export interface MessageCluster {
  anchorMessageId: number;
  memberMessageIds: number[];
  mediaMessageIds: number[];
  mergedText: string;
  clusterReason: string;
}

const MAX_TIME_GAP_MS = 15 * 60 * 1000;
const MAX_MESSAGE_GAP = 2;

export function clusterMessages(messages: RawMessageForClustering[]): MessageCluster[] {
  const sorted = [...messages].sort((a, b) => a.messageOrder - b.messageOrder);
  const clusters: MessageCluster[] = [];
  const assignedToCluster = new Set<number>();

  for (let i = 0; i < sorted.length; i++) {
    const msg = sorted[i];
    if (assignedToCluster.has(msg.id)) continue;

    const hasAttachment = !!msg.attachmentRef;
    const rawText = (msg.messageText || '').trim();
    const isAttachmentPlaceholder = /^\(الملف مرفق\)$|^<الوسائط غير مدرجة>$|^\(file attached\)$/i.test(rawText);
    const hasRealText = rawText.length > 0 && !isAttachmentPlaceholder;

    if (hasAttachment && !hasRealText) {
      const contextMsgs = findContextMessages(sorted, i, msg.sender);
      if (contextMsgs.length > 0) {
        const memberIds = [msg.id, ...contextMsgs.map(m => m.id)];
        memberIds.forEach(id => assignedToCluster.add(id));

        const mergedText = contextMsgs
          .map(m => m.messageText || '')
          .filter(t => t.length > 0)
          .join(' ');

        clusters.push({
          anchorMessageId: msg.id,
          memberMessageIds: memberIds,
          mediaMessageIds: [msg.id],
          mergedText,
          clusterReason: 'image_with_context_text',
        });
        continue;
      }
    }

    if (hasRealText && rawText.length < 30) {
      const nextMsg = sorted[i + 1];
      if (nextMsg && nextMsg.sender === msg.sender && !assignedToCluster.has(nextMsg.id)) {
        const timeDiff = Math.abs(nextMsg.waTimestamp.getTime() - msg.waTimestamp.getTime());
        if (timeDiff <= MAX_TIME_GAP_MS && nextMsg.attachmentRef) {
          const memberIds = [msg.id, nextMsg.id];
          memberIds.forEach(id => assignedToCluster.add(id));

          clusters.push({
            anchorMessageId: msg.id,
            memberMessageIds: memberIds,
            mediaMessageIds: [nextMsg.id],
            mergedText: msg.messageText || '',
            clusterReason: 'text_followed_by_image',
          });
          continue;
        }
      }
    }
  }

  return clusters;
}

function findContextMessages(
  sorted: RawMessageForClustering[],
  anchorIndex: number,
  sender: string
): RawMessageForClustering[] {
  const anchor = sorted[anchorIndex];
  const context: RawMessageForClustering[] = [];

  for (let delta = 1; delta <= MAX_MESSAGE_GAP; delta++) {
    const beforeIdx = anchorIndex - delta;
    if (beforeIdx >= 0) {
      const before = sorted[beforeIdx];
      if (
        before.sender === sender &&
        before.messageText &&
        before.messageText.trim().length > 0 &&
        !before.attachmentRef &&
        Math.abs(before.waTimestamp.getTime() - anchor.waTimestamp.getTime()) <= MAX_TIME_GAP_MS
      ) {
        context.push(before);
      }
    }

    const afterIdx = anchorIndex + delta;
    if (afterIdx < sorted.length) {
      const after = sorted[afterIdx];
      if (
        after.sender === sender &&
        after.messageText &&
        after.messageText.trim().length > 0 &&
        !after.attachmentRef &&
        Math.abs(after.waTimestamp.getTime() - anchor.waTimestamp.getTime()) <= MAX_TIME_GAP_MS
      ) {
        context.push(after);
      }
    }
  }

  return context;
}
