
import { Pool, Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import { getCredential } from './config/credentials';

// دالة فحص إتاحة قاعدة البيانات القديمة
export function isOldDatabaseAvailable(): boolean {
  try {
    const supabaseUrl = getCredential('SUPABASE_URL');
    const supabasePassword = getCredential('SUPABASE_DATABASE_PASSWORD');
    
    return Boolean(supabaseUrl && supabasePassword && supabaseUrl !== 'https://placeholder.supabase.co');
  } catch {
    return false;
  }
}

// دالة اختبار الاتصال بقاعدة البيانات القديمة
export async function testOldDatabaseConnection() {
  if (!isOldDatabaseAvailable()) {
    return {
      success: false,
      message: "بيانات Supabase غير مكوّنة في متغيرات البيئة",
      details: {
        error: 'SUPABASE_URL أو SUPABASE_DATABASE_PASSWORD مفقود',
        troubleshooting: [
          'تحقق من ملف .env',
          'تأكد من وجود SUPABASE_URL و SUPABASE_DATABASE_PASSWORD',
          'تحقق من ملف credentials.ts'
        ]
      }
    };
  }

  const supabaseUrl = getCredential('SUPABASE_URL');
  const supabasePassword = getCredential('SUPABASE_DATABASE_PASSWORD');
  
  console.log('\n🔍 بدء تشخيص شامل لاتصال Supabase...');
  console.log(`📋 URL: ${supabaseUrl}`);
  console.log(`🔑 Password: ${supabasePassword ? '[موجود]' : '[مفقود]'}`);
  
  const project = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  
  if (!project) {
    return {
      success: false,
      message: 'فشل في استخراج اسم المشروع من SUPABASE_URL',
      details: {
        url: supabaseUrl,
        error: 'URL غير صحيح، يجب أن يكون بالشكل: https://project.supabase.co',
        troubleshooting: [
          'تحقق من صحة SUPABASE_URL',
          'يجب أن يكون بالشكل: https://[project-id].supabase.co',
          'تأكد من عدم وجود مسافات أو أحرف إضافية'
        ]
      }
    };
  }

  console.log(`📊 اسم المشروع: ${project}`);

  try {
    const client = await getOldDbClient(1);
    
    const startTime = Date.now();
    const result = await client.query('SELECT version(), current_database(), current_user, now()');
    const responseTime = Date.now() - startTime;
    
    await client.end();
    
    console.log('✅ تم الاتصال بنجاح');
    
    return {
      success: true,
      message: "تم الاتصال بقاعدة البيانات القديمة بنجاح",
      details: {
        project: project,
        database: result.rows[0].current_database,
        user: result.rows[0].current_user,
        serverTime: result.rows[0].now,
        version: result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1],
        responseTime: `${responseTime}ms`,
        connectionMethod: "تم تحديد أفضل طريقة اتصال تلقائياً"
      }
    };
    
  } catch (error: any) {
    console.error('❌ فشل الاتصال:', error.message);
    
    const troubleshooting = [];
    
    if (error.message.includes('Tenant or user not found')) {
      troubleshooting.push('المشروع غير موجود أو تم حذفه من Supabase');
      troubleshooting.push('تحقق من لوحة تحكم Supabase');
      troubleshooting.push('تأكد من صحة project ID في الـ URL');
    } else if (error.message.includes('password authentication failed')) {
      troubleshooting.push('كلمة مرور قاعدة البيانات خاطئة');
      troubleshooting.push('احصل على كلمة مرور جديدة من Supabase Settings');
    } else if (error.message.includes('timeout')) {
      troubleshooting.push('مهلة الاتصال انتهت');
      troubleshooting.push('تحقق من اتصال الإنترنت');
      troubleshooting.push('قد تكون خدمات Supabase بطيئة');
    } else if (error.message.includes('ENOTFOUND')) {
      troubleshooting.push('لا يمكن العثور على خادم قاعدة البيانات');
      troubleshooting.push('تحقق من صحة الـ URL');
      troubleshooting.push('تحقق من حالة خدمات Supabase');
    }
    
    troubleshooting.push('تحقق من https://status.supabase.com');
    
    return {
      success: false,
      message: error.message || "فشل الاتصال بقاعدة البيانات القديمة",
      details: {
        project: project,
        error: error.message,
        code: error.code,
        troubleshooting: troubleshooting
      }
    };
  }
}

// دالة الحصول على عميل قاعدة البيانات القديمة
export async function getOldDbClient(maxRetries: number = 1): Promise<Client> {
  if (!isOldDatabaseAvailable()) {
    throw new Error("قاعدة البيانات القديمة غير مكوّنة");
  }
  
  const supabaseUrl = getCredential('SUPABASE_URL');
  const supabasePassword = getCredential('SUPABASE_DATABASE_PASSWORD');
  
  // تشخيص متقدم للبيانات من جميع المصادر
  console.log('🔍 تشخيص شامل لمصادر بيانات الاتصال:');
  console.log('📄 من ملف .env:');
  console.log(`   SUPABASE_URL: ${process.env.SUPABASE_URL || 'غير موجود'}`);
  console.log(`   OLD_DB_URL: ${process.env.OLD_DB_URL || 'غير موجود'}`);
  console.log('📄 من credentials.ts:');
  console.log(`   SUPABASE_URL: ${supabaseUrl}`);
  console.log(`   SUPABASE_DATABASE_URL: ${getCredential('SUPABASE_DATABASE_URL') || 'غير موجود'}`);
  console.log(`   Password length: ${supabasePassword ? supabasePassword.length : 'غير موجود'}`);
  
  // فحص OLD_DB_URL من .env للحصول على المنطقة الصحيحة
  const oldDbUrl = process.env.OLD_DB_URL;
  if (oldDbUrl) {
    const regionMatch = oldDbUrl.match(/aws-0-[^.]+/);
    if (regionMatch) {
      console.log(`🌍 منطقة جغرافية من OLD_DB_URL: ${regionMatch[0]}`);
    }
  }
  
  // استخراج اسم المشروع
  const project = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  
  if (!project) {
    console.error('❌ فشل في استخراج اسم المشروع من SUPABASE_URL');
    console.log(`   URL المُستخدم: ${supabaseUrl}`);
    throw new Error('فشل في استخراج اسم المشروع من SUPABASE_URL');
  }
  
  console.log(`   اسم المشروع المستخرج: ${project}`);
  
  // قائمة خيارات الاتصال المختلفة مع جميع المناطق الجغرافية
  // ترتيب المناطق بناءً على النجاح السابق
  const regions = [
    'aws-0-us-east-1', // المنطقة الصحيحة أولاً
    'aws-0-eu-central-1',
    'aws-0-us-west-1',
    'aws-0-ap-southeast-1'
  ];

  const connectionOptions = [];

  // إنشاء خيارات الاتصال لكل منطقة جغرافية
  for (const region of regions) {
    connectionOptions.push(
      {
        name: `Pooler Connection ${region} (Port 6543)`,
        config: {
          host: `${region}.pooler.supabase.com`,
          port: 6543,
          database: 'postgres',
          user: `postgres.${project}`,
          password: supabasePassword,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 15000,
        }
      },
      {
        name: `Pooler Connection ${region} (Port 5432)`,
        config: {
          host: `${region}.pooler.supabase.com`,
          port: 5432,
          database: 'postgres',
          user: `postgres.${project}`,
          password: supabasePassword,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 15000,
        }
      },
      {
        name: `Alternative User Format ${region}`,
        config: {
          host: `${region}.pooler.supabase.com`,
          port: 6543,
          database: 'postgres',
          user: `postgres`,
          password: supabasePassword,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 15000,
        }
      }
    );
  }

  // إضافة اتصال مباشر
  connectionOptions.push({
    name: 'Direct Connection (Port 5432)',
    config: {
      host: `db.${project}.supabase.co`,
      port: 5432,
      database: 'postgres',
      user: `postgres.${project}`,
      password: supabasePassword,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000,
    }
  });
  
  // تجربة كل خيار اتصال
  for (const option of connectionOptions) {
    console.log(`🔄 تجربة ${option.name}...`);
    console.log(`🔗 Connection: postgresql://${option.config.user}:***@${option.config.host}:${option.config.port}/${option.config.database}`);
    
    try {
      const client = new Client(option.config);
      await client.connect();
      
      // اختبار الاتصال
      const result = await client.query('SELECT version(), current_database(), current_user');
      
      console.log('✅ نجح الاتصال مع قاعدة البيانات القديمة');
      console.log(`   الطريقة: ${option.name}`);
      console.log(`   المستخدم: ${result.rows[0].current_user}`);
      console.log(`   قاعدة البيانات: ${result.rows[0].current_database}`);
      
      return client;
      
    } catch (error: any) {
      console.warn(`⚠️ فشل ${option.name}:`, error.message);
      
      // تحليل نوع الخطأ
      if (error.message.includes('Tenant or user not found')) {
        console.error('❌ المشروع غير موجود أو بيانات الاعتماد خاطئة');
      } else if (error.message.includes('password authentication failed')) {
        console.error('❌ كلمة المرور خاطئة');
      } else if (error.message.includes('timeout')) {
        console.error('❌ انتهت مهلة الاتصال');
      } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
        console.error('❌ لا يمكن العثور على الخادم');
      }
      
      continue;
    }
  }
  
  // إذا فشلت جميع الطرق، إظهار معلومات الاستكشاف
  console.error('❌ فشلت جميع محاولات الاتصال');
  console.log('\n🔍 خطوات استكشاف الأخطاء:');
  console.log('1. تحقق من أن مشروع Supabase لا يزال موجوداً');
  console.log('2. تحقق من صحة كلمة مرور قاعدة البيانات');
  console.log('3. تحقق من إعدادات الشبكة والجدار الناري');
  console.log('4. تحقق من حالة خدمات Supabase');
  
  throw new Error('فشل في الاتصال بقاعدة البيانات القديمة - جميع الطرق فشلت');
}

// تكوين اتصال قاعدة البيانات السحابية (إذا كان متوفراً)
let pool: Pool | null = null;
let db: any = null;

if (isOldDatabaseAvailable()) {
  try {
    const supabaseUrl = getCredential('SUPABASE_URL');
    const supabasePassword = getCredential('SUPABASE_DATABASE_PASSWORD');
    const project = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    
    if (project) {
      pool = new Pool({
        host: 'aws-0-us-east-1.pooler.supabase.com',
        port: 6543,
        database: 'postgres',
        user: `postgres.${project}`,
        password: supabasePassword,
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });
      db = drizzle(pool, { schema });
    }
  } catch (error) {
    console.warn('⚠️ فشل في تكوين pool قاعدة البيانات القديمة:', error);
  }
}

export { pool, db };
