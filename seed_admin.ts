import bcrypt from 'bcryptjs';
import { db } from './server/db';
import { users } from './shared/schema';
import { sql } from 'drizzle-orm';

async function seed() {
  const email = 'admin@example.com';
  const password = 'AdminPassword123!';
  const hashedPassword = await bcrypt.hash(password, 12);
  
  console.log('🌱 Seeding admin user...');
  
  try {
    const existing = await db.execute(sql`SELECT id FROM users WHERE email = ${email}`);
    if (existing.rows.length > 0) {
      console.log('⚠️ Admin already exists, updating password...');
      await db.execute(sql`UPDATE users SET password = ${hashedPassword}, role = 'admin', is_active = true, email_verified_at = NOW() WHERE email = ${email}`);
    } else {
      await db.execute(sql`
        INSERT INTO users (email, password, role, first_name, last_name, is_active, email_verified_at, created_at)
        VALUES (${email}, ${hashedPassword}, 'admin', 'Super', 'Admin', true, NOW(), NOW())
      `);
      console.log('✅ Admin user created successfully');
    }
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    process.exit(0);
  }
}

seed();
