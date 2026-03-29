import { db } from "../../db.js";
import { waMediaAssets } from "@shared/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import { analyzeImageWithAI, isAIAvailable } from './AIExtractionOrchestrator.js';

export interface MediaProcessingResult {
  processed: number;
  failed: number;
  skipped: number;
  totalText: number;
  previouslyProcessed: number;
  totalAssets: number;
  newlyProcessed: number;
}

async function ocrImage(filePath: string): Promise<string> {
  const Tesseract = (await import('tesseract.js')).default;
  const { data } = await Tesseract.recognize(filePath, 'ara+eng');
  return data.text || '';
}

async function extractPdfText(filePath: string): Promise<string> {
  const pdfModule = await import('pdf-parse');
  let pdf: any = pdfModule;
  if (typeof pdf === 'object' && pdf.default) pdf = pdf.default;
  if (typeof pdf === 'object' && pdf.default) pdf = pdf.default;
  if (typeof pdf !== 'function') {
    const keys = Object.keys(pdfModule);
    for (const k of keys) {
      if (typeof (pdfModule as any)[k] === 'function') { pdf = (pdfModule as any)[k]; break; }
    }
  }
  if (typeof pdf !== 'function') throw new Error('pdf-parse module could not be resolved as function');
  const buffer = fs.readFileSync(filePath);
  const data = await pdf(buffer);
  return data.text || '';
}

async function extractExcelText(filePath: string): Promise<string> {
  const XLSX = (await import('xlsx')).default;
  const buffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const lines: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    if (csv.trim()) {
      lines.push(`[${sheetName}]`);
      lines.push(csv.trim());
    }
  }
  return lines.join('\n');
}

export async function processMediaForBatch(batchId: number): Promise<MediaProcessingResult> {
  const result: MediaProcessingResult = {
    processed: 0,
    failed: 0,
    skipped: 0,
    totalText: 0,
    previouslyProcessed: 0,
    totalAssets: 0,
    newlyProcessed: 0,
  };

  const assets = await db.select()
    .from(waMediaAssets)
    .where(eq(waMediaAssets.batchId, batchId));

  result.totalAssets = assets.length;

  for (const asset of assets) {
    if (asset.ocrText) {
      result.previouslyProcessed++;
      result.skipped++;
      continue;
    }

    if (asset.mediaStatus === 'skipped_unsupported' || asset.mediaStatus === 'skipped_too_large') {
      result.skipped++;
      continue;
    }

    const resolvedPath = path.isAbsolute(asset.filePath)
      ? asset.filePath
      : path.resolve(asset.filePath);

    if (!fs.existsSync(resolvedPath)) {
      console.warn(`[MediaProcessing] File missing for asset ${asset.id}: ${resolvedPath} (stored: ${asset.filePath})`);
      await db.update(waMediaAssets)
        .set({ mediaStatus: 'ocr_failed', skipReason: 'الملف غير موجود على القرص' })
        .where(eq(waMediaAssets.id, asset.id));
      result.failed++;
      continue;
    }

    let mime = asset.mimeType || '';

    if (!mime) {
      const ext = path.extname(asset.originalFilename || asset.filePath || '').toLowerCase();
      const mimeMap: Record<string, string> = {
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
        '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp',
        '.pdf': 'application/pdf',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.xls': 'application/vnd.ms-excel',
      };
      mime = mimeMap[ext] || '';
      if (mime) {
        console.log(`[MediaProcessing] Detected mime by extension: ${ext} → ${mime} for asset ${asset.id}`);
      }
    }

    try {
      let extractedText = '';

      if (mime.startsWith('image/')) {
        const fileName = asset.originalFilename || '';
        if (fileName.startsWith('STK-') || fileName.startsWith('stk-')) {
          await db.update(waMediaAssets)
            .set({ mediaStatus: 'skipped_unsupported', skipReason: 'ستيكر واتساب - لا يحتوي بيانات مالية' })
            .where(eq(waMediaAssets.id, asset.id));
          result.skipped++;
          continue;
        }
        const stats = fs.statSync(resolvedPath);
        if (stats.size < 1024) {
          await db.update(waMediaAssets)
            .set({ mediaStatus: 'skipped_unsupported', skipReason: 'ملف صغير جداً' })
            .where(eq(waMediaAssets.id, asset.id));
          result.skipped++;
          continue;
        }
        extractedText = await ocrImage(resolvedPath);
      } else if (mime === 'application/pdf') {
        extractedText = await extractPdfText(resolvedPath);
      } else if (
        mime.startsWith('application/vnd.openxmlformats') ||
        mime === 'application/vnd.ms-excel'
      ) {
        extractedText = await extractExcelText(resolvedPath);
      } else {
        await db.update(waMediaAssets)
          .set({ mediaStatus: 'skipped_unsupported', skipReason: `نوع غير مدعوم: ${mime || 'مجهول'}` })
          .where(eq(waMediaAssets.id, asset.id));
        result.skipped++;
        continue;
      }

      const trimmedText = extractedText.trim();
      if (trimmedText) {
        let finalText = trimmedText;
        let finalStatus = 'ocr_completed';

        const hasFinancialData = /\d{3,}/.test(trimmedText) || /ريال|حوالة|تحويل|مبلغ|فاتورة|إيصال/.test(trimmedText);
        if (hasFinancialData && isAIAvailable()) {
          try {
            const aiAnalysis = await analyzeImageWithAI(trimmedText, asset.originalFilename || undefined);
            if (aiAnalysis) {
              const aiSummaryParts: string[] = [];
              if (aiAnalysis.documentType && aiAnalysis.documentType !== 'غير_محدد') {
                aiSummaryParts.push(`نوع: ${aiAnalysis.documentType}`);
              }
              if (aiAnalysis.companyName) {
                aiSummaryParts.push(`شركة: ${aiAnalysis.companyName}`);
              }
              if (aiAnalysis.transferNumber) {
                aiSummaryParts.push(`رقم: ${aiAnalysis.transferNumber}`);
              }
              if (aiAnalysis.sender) {
                aiSummaryParts.push(`مرسل: ${aiAnalysis.sender}`);
              }
              if (aiAnalysis.recipient) {
                aiSummaryParts.push(`مستلم: ${aiAnalysis.recipient}`);
              }
              if (aiAnalysis.extractedAmounts && aiAnalysis.extractedAmounts.length > 0) {
                const amountStrs = aiAnalysis.extractedAmounts.map(a => `${a.amount} (${a.description})`);
                aiSummaryParts.push(`مبالغ: ${amountStrs.join('، ')}`);
              }
              if (aiAnalysis.summary) {
                aiSummaryParts.push(`ملخص: ${aiAnalysis.summary}`);
              }
              if (aiSummaryParts.length > 0) {
                finalText = `${trimmedText}\n[تحليل AI: ${aiSummaryParts.join(' | ')}]`;
                finalStatus = 'ai_analyzed';
              }
            }
          } catch (aiErr: any) {
            console.warn(`[MediaProcessing] AI analysis failed for asset ${asset.id}: ${aiErr.message}`);
          }
        }

        await db.update(waMediaAssets)
          .set({
            ocrText: finalText,
            mediaStatus: finalStatus,
          })
          .where(eq(waMediaAssets.id, asset.id));
        result.processed++;
        result.totalText += finalText.length;
      } else {
        await db.update(waMediaAssets)
          .set({ mediaStatus: 'ocr_completed' })
          .where(eq(waMediaAssets.id, asset.id));
        result.processed++;
      }
    } catch (err: any) {
      console.error(`[MediaProcessing] Failed to process asset ${asset.id} (${asset.originalFilename}): ${err.message}`);
      const truncatedReason = (err.message || 'OCR/extraction failed').substring(0, 500);
      try {
        await db.update(waMediaAssets)
          .set({
            mediaStatus: 'ocr_failed',
            skipReason: truncatedReason,
          })
          .where(eq(waMediaAssets.id, asset.id));
      } catch (updateErr: any) {
        console.error(`[MediaProcessing] Failed to update error status for asset ${asset.id}`);
        await db.update(waMediaAssets)
          .set({ mediaStatus: 'error' })
          .where(eq(waMediaAssets.id, asset.id));
      }
      result.failed++;
    }
  }

  result.newlyProcessed = result.processed;
  console.log(`[MediaProcessing] Batch ${batchId}: total=${result.totalAssets}, previouslyProcessed=${result.previouslyProcessed}, newlyProcessed=${result.newlyProcessed}, failed=${result.failed}, skipped=${result.skipped}`);
  return result;
}
