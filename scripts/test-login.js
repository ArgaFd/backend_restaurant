const axios = require('axios');

async function testLogin() {
    try {
        const response = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'adi@mail.com',
            password: 'password123'
        });
        console.log('✅ Login Successful:', response.data);
    } catch (error) {
        if (error.response) {
            console.log('❌ Login Failed:', error.response.status);
            console.log('Response Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('❌ Connection Error:', error.message);
        }
    }
}

testLogin();
