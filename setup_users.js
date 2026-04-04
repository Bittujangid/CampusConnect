const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupDatabase() {
    let connection;
    try {
        // Connect without database first to create it if needed
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        });

        console.log('Connected to MySQL server.');

        // Create Database
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
        console.log(`Database '${process.env.DB_NAME}' checked/created.`);

        await connection.changeUser({ database: process.env.DB_NAME });

        // Create Users Table
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                studentId VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role ENUM('student', 'admin') DEFAULT 'student',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        await connection.query(createTableQuery);
        console.log('Users table checked/created.');

        // Verify table creation
        const [rows] = await connection.query('SHOW TABLES LIKE "users"');
        if (rows.length > 0) {
            console.log('SUCCESS: Users table exists.');
        } else {
            console.error('ERROR: Users table does not exist.');
        }

    } catch (error) {
        console.error('Database Setup Error:', error);
    } finally {
        if (connection) await connection.end();
        process.exit();
    }
}

setupDatabase();
