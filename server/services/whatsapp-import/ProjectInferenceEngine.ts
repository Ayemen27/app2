import { normalizeArabicText } from './ArabicAmountParser.js';

export interface ProjectHypothesis {
  projectId: string;
  confidence: number;
  evidenceKeywords: string[];
  inferenceMethod: string;
}

const PROJECT_IDS = {
  ZAIN_JARAHI: '6c9d8a97',
  ZAIN_TAHITA: '7212655c',
  MOHAMAD_JARAHI: '00735182',
  MOHAMAD_TAHITA: 'b23ad9a5',
} as const;

const JARAHI_KEYWORDS = ['الجراحي', 'جراحي'];
const TAHITA_KEYWORDS = ['التحيتا', 'التحيتاء', 'الحوش', 'تحيتا'];
const SITALBIAR_KEYWORDS = ['الست الابيار', 'ست الابيار', 'ستة ابيار', 'ست ابيار'];

const ZAIN_WORK_KEYWORDS = ['حفر', 'تصليح'];
const MOHAMAD_WORK_KEYWORDS = ['صب', 'صبه', 'صبة', 'قواعد', 'خرسان', 'منصة', 'ألواح', 'الواح', 'تركيب', 'تركيب المنصة', 'تركيب الألواح'];
const MOHAMAD_IDENTITY_KEYWORDS = ['المهندس محمد', 'مهندس محمد', 'محمد المهندس'];

export function inferProject(
  messageText: string,
  chatSource: string,
  senderName?: string
): ProjectHypothesis[] {
  const text = normalizeArabicText(messageText);
  const hypotheses: ProjectHypothesis[] = [];

  const isZainChat = chatSource === 'zain';
  const isAbbasiChat = chatSource === 'abbasi';

  const hasJarahi = JARAHI_KEYWORDS.some(k => text.includes(k));
  const hasTahita = TAHITA_KEYWORDS.some(k => text.includes(k));
  const hasSitAlbiar = SITALBIAR_KEYWORDS.some(k => text.includes(k));
  const hasZainWork = ZAIN_WORK_KEYWORDS.some(k => text.includes(k));
  const hasMohamadWork = MOHAMAD_WORK_KEYWORDS.some(k => text.includes(k));
  const hasMohamadIdentity = MOHAMAD_IDENTITY_KEYWORDS.some(k => text.includes(k));
  const hasMohamadSignal = hasMohamadWork || hasMohamadIdentity;

  const foundKeywords: string[] = [];
  for (const k of [...JARAHI_KEYWORDS, ...TAHITA_KEYWORDS, ...SITALBIAR_KEYWORDS, ...ZAIN_WORK_KEYWORDS, ...MOHAMAD_WORK_KEYWORDS, ...MOHAMAD_IDENTITY_KEYWORDS]) {
    if (text.includes(k)) foundKeywords.push(k);
  }

  if (hasJarahi) {
    if (hasMohamadSignal) {
      hypotheses.push({
        projectId: PROJECT_IDS.MOHAMAD_JARAHI,
        confidence: hasMohamadIdentity ? 0.92 : 0.90,
        evidenceKeywords: foundKeywords,
        inferenceMethod: hasMohamadIdentity ? 'keyword_jarahi+mohamad_identity' : 'keyword_jarahi+mohamad_work',
      });
    } else if (isZainChat || hasZainWork) {
      hypotheses.push({
        projectId: PROJECT_IDS.ZAIN_JARAHI,
        confidence: isZainChat ? 0.85 : 0.75,
        evidenceKeywords: foundKeywords,
        inferenceMethod: isZainChat ? 'keyword_jarahi+zain_chat_default' : 'keyword_jarahi+zain_work',
      });
    } else {
      hypotheses.push({
        projectId: PROJECT_IDS.ZAIN_JARAHI,
        confidence: 0.60,
        evidenceKeywords: foundKeywords,
        inferenceMethod: 'keyword_jarahi_ambiguous',
      });
      hypotheses.push({
        projectId: PROJECT_IDS.MOHAMAD_JARAHI,
        confidence: 0.30,
        evidenceKeywords: foundKeywords,
        inferenceMethod: 'keyword_jarahi_secondary',
      });
    }
  }

  if (hasTahita || hasSitAlbiar) {
    if (hasMohamadSignal) {
      hypotheses.push({
        projectId: PROJECT_IDS.MOHAMAD_TAHITA,
        confidence: hasMohamadIdentity ? 0.92 : 0.90,
        evidenceKeywords: foundKeywords,
        inferenceMethod: hasMohamadIdentity ? 'keyword_tahita+mohamad_identity' : 'keyword_tahita+mohamad_work',
      });
    } else if (isZainChat || hasZainWork) {
      hypotheses.push({
        projectId: PROJECT_IDS.ZAIN_TAHITA,
        confidence: isZainChat ? 0.85 : 0.75,
        evidenceKeywords: foundKeywords,
        inferenceMethod: isZainChat ? 'keyword_tahita+zain_chat_default' : 'keyword_tahita+zain_work',
      });
    } else {
      hypotheses.push({
        projectId: PROJECT_IDS.ZAIN_TAHITA,
        confidence: 0.60,
        evidenceKeywords: foundKeywords,
        inferenceMethod: 'keyword_tahita_ambiguous',
      });
      hypotheses.push({
        projectId: PROJECT_IDS.MOHAMAD_TAHITA,
        confidence: 0.30,
        evidenceKeywords: foundKeywords,
        inferenceMethod: 'keyword_tahita_secondary',
      });
    }
  }

  if (hypotheses.length === 0 && (isZainChat || isAbbasiChat)) {
    if (hasZainWork) {
      hypotheses.push({
        projectId: PROJECT_IDS.ZAIN_JARAHI,
        confidence: 0.50,
        evidenceKeywords: foundKeywords,
        inferenceMethod: 'zain_work_keywords_no_location',
      });
    } else if (hasMohamadSignal) {
      hypotheses.push({
        projectId: PROJECT_IDS.MOHAMAD_JARAHI,
        confidence: hasMohamadIdentity ? 0.55 : 0.50,
        evidenceKeywords: foundKeywords,
        inferenceMethod: hasMohamadIdentity ? 'mohamad_identity_no_location' : 'mohamad_work_keywords_no_location',
      });
    }
  }

  return hypotheses;
}

export function getBestProjectHypothesis(hypotheses: ProjectHypothesis[]): ProjectHypothesis | null {
  if (hypotheses.length === 0) return null;
  return hypotheses.reduce((best, h) => h.confidence > best.confidence ? h : best);
}
