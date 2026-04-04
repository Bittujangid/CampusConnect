const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConnection() {
    console.log('Testing MySQL Connection...');
    console.log(`Host: ${process.env.DB_HOST}`);
    console.log(`User: ${process.env.DB_USER}`);
    // console.log(`Password: ${process.env.DB_PASSWORD}`); // Don't log password

    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        });
        console.log('✅ Connection Successful!');
        await connection.end();
    } catch (error) {
        console.error('❌ Connection Failed!');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.log('👉 Suggestion: Is MySQL Service running? Port 3306?');
        }
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('👉 Suggestion: Check User/Password.');
        }
    }
}

testConnection();
