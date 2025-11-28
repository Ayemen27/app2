import bcrypt from 'bcrypt';

async function hashAndInsertPassword() {
  const password = 'Demo@123456';
  const hashedPassword = await bcrypt.hash(password, 10);
  
  console.log('🔐 كلمة المرور المشفرة:');
  console.log(hashedPassword);
}

hashAndInsertPassword();
