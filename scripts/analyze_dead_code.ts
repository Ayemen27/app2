import fs from 'fs';
import path from 'path';

function getAllFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const name = path.join(dir, file);
    if (fs.statSync(name).isDirectory()) {
      if (!name.includes('node_modules') && !name.includes('.git')) {
        getAllFiles(name, fileList);
      }
    } else {
      if (name.endsWith('.ts') || name.endsWith('.tsx')) {
        fileList.push(name);
      }
    }
  });
  return fileList;
}

const allFiles = getAllFiles('.');
const exportsMap = new Map<string, string[]>();

console.log('🔍 [StaticAnalysis] جاري حصر التصديرات (Exports)...');
allFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  const exportMatches = content.match(/export (const|function|class|interface|type|enum) (\w+)/g);
  if (exportMatches) {
    exportsMap.set(file, exportMatches.map(m => m.split(' ')[2]));
  }
});

console.log('🔍 [StaticAnalysis] جاري فحص الاستخدامات (Imports/Usage)...');
const unusedExports: string[] = [];
exportsMap.forEach((names, file) => {
  names.forEach(name => {
    let used = false;
    allFiles.forEach(otherFile => {
      if (file === otherFile) return;
      const otherContent = fs.readFileSync(otherFile, 'utf-8');
      if (otherContent.includes(name)) used = true;
    });
    if (!used) unusedExports.push(`${file}: ${name}`);
  });
});

fs.writeFileSync('dead_code_report.json', JSON.stringify({ unusedExports, totalChecked: allFiles.length }, null, 2));
console.log('✅ تم الانتهاء من فحص الكود الميت.');
