async function testLogin() {
  const url = 'http://0.0.0.0:5000/api/auth/login';
  const credentials = {
    email: 'admin@example.com',
    password: 'AdminPassword123!'
  };

  console.log('📡 Testing login endpoint...');
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });

    const data = await response.json();
    if (data.success) {
      console.log('✅ Login Successful!');
      console.log('🔑 Data:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ Login Failed:', data.message);
    }
  } catch (error) {
    console.error('💥 Request error:', error.message);
  }
}

testLogin();
