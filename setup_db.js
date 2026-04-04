const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'krishna@#11219', // Updated with user password
    multipleStatements: true
};

const connection = mysql.createConnection(dbConfig);

const schemaPath = path.join(__dirname, 'schema.sql');
const schemaSql = fs.readFileSync(schemaPath, 'utf8');

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        process.exit(1);
    }
    console.log('Connected to MySQL.');

    connection.query(schemaSql, (err, results) => {
        if (err) {
            console.error('Error executing schema:', err);
            process.exit(1);
        }
        console.log('Database schema imported successfully.');
        connection.end();
    });
});
