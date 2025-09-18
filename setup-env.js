
/**
 * سكربت تهيئة متغيرات البيئة تلقائياً
 * يتأكد من وجود جميع المتغيرات المطلوبة في ملف .env
 */

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const envPath = path.join(process.cwd(), '.env');

// المتغيرات المطلوبة مع قيمها
const requiredEnvVars = {
  'DATABASE_URL': 'postgresql://app2data:Ay**--772283228@93.127.142.144:5432/app2data?sslmode=require',
  'JWT_ACCESS_SECRET': 'ebd185c17c06993902fe94b0d2628af77440140e6be2304fa9891dedb4dc14c5c5107ea13af39608c372c42e6dc3b797eba082e1d484f44e9bb08f8c4f0aa3d9',
  'JWT_REFRESH_SECRET': '5246045571e21f30c5ea8e3bb051bb8e68a6dc1256f3267711e8391cad91866e849d4ecc139a8d491169f4f2a50a15680cca9bfa7181e7554cc61915f3867b20',
  'ENCRYPTION_KEY': '0367beacd2697c2d253a477e870747b7bc03ca5e0812962139e97e8541050b7d725d00726eb3fc809dbd2279fac5b53e69c25b2fbac3e4379ca98044986c5b00',
  'SESSION_SECRET': '0hbejGF7PzGIHtRdgzOWuX6DBaSWVhew/Wg5kwxgnKPto3/UT7dPRBuryDhROVyOneNnawtFLyjFHgz89Dh2oQ==',
  'NODE_ENV': 'production',
  'PORT': '5000'
};

function ensureEnvFile() {
  console.log('🔧 فحص ملف .env...');
  
  let envContent = '';
  let existingVars = {};
  
  // قراءة الملف الحالي إن وجد
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=');
        existingVars[key.trim()] = valueParts.join('=').trim();
      }
    });
  }
  
  let updated = false;
  
  // إضافة المتغيرات المفقودة
  for (const [key, defaultValue] of Object.entries(requiredEnvVars)) {
    if (!existingVars[key]) {
      console.log(`➕ إضافة متغير مفقود: ${key}`);
      
      if (!envContent.endsWith('\n') && envContent.length > 0) {
        envContent += '\n';
      }
      
      envContent += `${key}=${defaultValue}\n`;
      updated = true;
    } else {
      console.log(`✅ متغير موجود: ${key}`);
    }
  }
  
  if (updated) {
    fs.writeFileSync(envPath, envContent);
    console.log('✅ تم تحديث ملف .env بنجاح');
  } else {
    console.log('✅ جميع المتغيرات موجودة');
  }
  
  console.log('🎯 تم الانتهاء من فحص متغيرات البيئة');
}

// تشغيل السكربت
ensureEnvFile();
