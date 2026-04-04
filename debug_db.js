const mysql = require('mysql2/promise');
require('dotenv').config();

async function debug() {
    console.log('--- Database Diagnostics ---');
    console.log('DB_HOST:', process.env.DB_HOST);
    console.log('DB_NAME:', process.env.DB_NAME);
    console.log('DB_USER:', process.env.DB_USER);

    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });
        console.log('✅ Connection successful');

        const [tables] = await connection.query('SHOW TABLES');
        const tableNames = tables.map(t => Object.values(t)[0]);
        console.log('Tables found:', tableNames.join(', '));

        for (const table of tableNames) {
            console.log(`\n--- Schema for table: ${table} ---`);
            const [columns] = await connection.query(`DESCRIBE ${table}`);
            console.log('Field | Type | Null | Key | Default | Extra');
            columns.forEach(c => {
                console.log(`${c.Field} | ${c.Type} | ${c.Null} | ${c.Key} | ${c.Default} | ${c.Extra}`);
            });
        }

        const [events] = await connection.query('SELECT * FROM events');
        console.log('\n--- Events Count ---');
        console.log(events.length);

    } catch (error) {
        console.error('❌ Diagnostic Error:', error.message);
        if (error.code) console.error('Error Code:', error.code);
        if (error.sqlMessage) console.error('SQL Message:', error.sqlMessage);
    } finally {
        if (connection) await connection.end();
    }
}

debug();
