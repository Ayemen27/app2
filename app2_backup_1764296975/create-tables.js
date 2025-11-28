import { Client } from 'pg';

const client = new Client({
  host: '93.127.142.144',
  port: 5432,
  database: 'newdb',
  user: 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: { rejectUnauthorized: false }
});

async function grantPermissions() {
  try {
    await client.connect();
    
    console.log('Granting permissions to newuser...');
    
    await client.query('GRANT ALL PRIVILEGES ON SCHEMA public TO newuser;');
    console.log('✓ Granted schema privileges');
    
    await client.query('GRANT ALL PRIVILEGES ON DATABASE newdb TO newuser;');
    console.log('✓ Granted database privileges');
    
    await client.query('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO newuser;');
    console.log('✓ Granted default table privileges');
    
    await client.query('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO newuser;');
    console.log('✓ Granted sequence privileges');
    
    console.log('\n✅ All permissions granted successfully!');
    
  } catch (error) {
    console.error('❌ Error granting permissions:', error.message);
  } finally {
    await client.end();
  }
}

grantPermissions();
