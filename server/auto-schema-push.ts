import { validateSchemaIntegrity, getSchemaStatus } from "./services/schema-guard";

export async function runSchemaCheck() {
  const result = await validateSchemaIntegrity();
  return {
    isConsistent: result.isConsistent,
    issues: [
      ...result.missingInDb.map(t => `جدول "${t}" معرّف في الكود لكنه غير موجود في قاعدة البيانات`),
      ...result.missingInSchema.map(t => `جدول "${t}" موجود في قاعدة البيانات لكنه غير معرّف في الكود`),
    ]
  };
}

export async function checkSchemaConsistency() {
  return runSchemaCheck();
}

export function getAutoPushStatus() {
  return getSchemaStatus();
}
