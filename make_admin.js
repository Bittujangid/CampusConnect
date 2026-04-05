const mysql = require('mysql2/promise');
require('dotenv').config();

async function makeAdmin(email) {
    if (!email) {
        console.log('Usage: node make_admin.js <email>');
        process.exit(1);
    }

    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        const [result] = await connection.query(
            'UPDATE users SET role = "admin" WHERE email = ?',
            [email]
        );

        if (result.affectedRows > 0) {
            console.log(`✅ Success: User with email "${email}" has been promoted to administrator.`);
        } else {
            console.log(`❌ Error: No user found with email "${email}".`);
        }
    } catch (error) {
        console.error('❌ Database Error:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

const targetEmail = process.argv[2];
makeAdmin(targetEmail);
