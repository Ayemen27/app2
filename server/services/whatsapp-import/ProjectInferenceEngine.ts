import { normalizeArabicText } from './ArabicAmountParser.js';
import { db } from '../../db.js';
import { projects } from '@shared/schema';

export interface ProjectHypothesis {
  projectId: string;
  confidence: number;
  evidenceKeywords: string[];
  inferenceMethod: string;
}

export interface ProjectKeywordMap {
  projectId: string;
  projectName: string;
  keywords: string[];
}

export async function loadProjectKeywords(): Promise<ProjectKeywordMap[]> {
  const allProjects = await db.select({
    id: projects.id,
    name: projects.name,
  }).from(projects);

  const projectKeywords: ProjectKeywordMap[] = [];

  for (const project of allProjects) {
    const normalized = normalizeArabicText(project.name);
    const keywords: string[] = [normalized];

    const words = normalized.split(/\s+/).filter(w => w.length > 1);
    for (const word of words) {
      if (!keywords.includes(word)) {
        keywords.push(word);
      }
    }

    const withoutAl = normalized.replace(/^ال/, '');
    if (withoutAl !== normalized && !keywords.includes(withoutAl)) {
      keywords.push(withoutAl);
    }

    for (const word of words) {
      const wordWithoutAl = word.replace(/^ال/, '');
      if (wordWithoutAl !== word && wordWithoutAl.length > 1 && !keywords.includes(wordWithoutAl)) {
        keywords.push(wordWithoutAl);
      }
    }

    projectKeywords.push({
      projectId: project.id,
      projectName: project.name,
      keywords,
    });
  }

  return projectKeywords;
}

export function inferProject(
  messageText: string,
  chatSource: string,
  projectKeywords?: ProjectKeywordMap[]
): ProjectHypothesis[] {
  const text = normalizeArabicText(messageText);
  const hypotheses: ProjectHypothesis[] = [];

  if (!projectKeywords || projectKeywords.length === 0) {
    return hypotheses;
  }

  const isZainChat = chatSource === 'zain';
  const isAbbasiChat = chatSource === 'abbasi';

  for (const project of projectKeywords) {
    const matchedKeywords: string[] = [];
    for (const keyword of project.keywords) {
      if (text.includes(keyword)) {
        matchedKeywords.push(keyword);
      }
    }

    if (matchedKeywords.length === 0) continue;

    const fullNameMatch = text.includes(normalizeArabicText(project.projectName));

    let confidence: number;
    let inferenceMethod: string;

    if (fullNameMatch) {
      confidence = 0.90;
      inferenceMethod = 'db_full_name_match';
    } else if (matchedKeywords.length >= 2) {
      confidence = 0.80;
      inferenceMethod = 'db_multi_keyword_match';
    } else {
      confidence = 0.60;
      inferenceMethod = 'db_single_keyword_match';
    }

    if (isZainChat || isAbbasiChat) {
      confidence = Math.min(confidence + 0.05, 0.95);
      inferenceMethod += `+${chatSource}_chat_boost`;
    }

    hypotheses.push({
      projectId: project.projectId,
      confidence,
      evidenceKeywords: matchedKeywords,
      inferenceMethod,
    });
  }

  return hypotheses;
}

export function getBestProjectHypothesis(hypotheses: ProjectHypothesis[]): ProjectHypothesis | null {
  if (hypotheses.length === 0) return null;
  return hypotheses.reduce((best, h) => h.confidence > best.confidence ? h : best);
}
