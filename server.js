const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'data.json');
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Global State
let db;
let dbConnected = false;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- DB CONNECTION LOGIC ---
async function connectDB() {
    try {
        console.log('🔄 Connecting to MySQL...');

        // 1. Create DB if needed
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        });
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
        await connection.end();

        // 2. Connect to DB
        db = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        // 3. Create Table
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                studentId VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role ENUM('student', 'admin') DEFAULT 'student',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 4. Create Events Table
        await db.query(`
            CREATE TABLE IF NOT EXISTS events (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                date DATE NOT NULL,
                venue VARCHAR(255) NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 5. Create Event Registrations Table
        await db.query(`
            CREATE TABLE IF NOT EXISTS event_registrations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                event_id INT NOT NULL,
                student_name VARCHAR(255) NOT NULL,
                student_id VARCHAR(50) NOT NULL,
                registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
            )
        `);

        // 6. Create Notices Table
        await db.query(`
            CREATE TABLE IF NOT EXISTS notices (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                date DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('✅ Database connected & synchronized');
        dbConnected = true;
        return true;
    } catch (error) {
        console.error('❌ Database Connection/Sync Failed:', error);
        if (error.sql) console.error('Last SQL attempted:', error.sql);
        dbConnected = false;
        return false;
    }
}

// --- MAINTENANCE MIDDLEWARE ---
// Intercepts all API and Page requests if DB is down
app.use(async (req, res, next) => {
    // If not connected, try to reconnect ONCE before failing
    if (!dbConnected) {
        console.log(`⚠️  Request to ${req.path} while DB is offline. Attempting quick reconnect...`);
        const success = await connectDB();
        if (success) return next();
    } else {
        return next();
    }

    // If still requesting static files (css/js), allow them so error page looks good
    if (req.path.endsWith('.css') || req.path.endsWith('.js') || req.path.endsWith('.png') || req.path.endsWith('.jpg')) {
        return next();
    }

    // API Request -> JSON Error
    if (req.path.startsWith('/api')) {
        return res.status(503).json({ error: 'Database connection failed. Please ensure MySQL is running.' });
    }

    // HTML Request -> Nice Error Page
    res.status(503).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Service Unavailable - CampusConnect</title>
            <style>
                body { font-family: 'Inter', sans-serif; background: #f1f5f9; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; color: #334155; }
                .card { background: white; padding: 2.5rem; border-radius: 1rem; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); max-width: 480px; text-align: center; width: 90%; }
                h1 { color: #ef4444; margin-top: 0; font-size: 1.5rem; }
                p { line-height: 1.6; margin-bottom: 1.5rem; }
                .icon { font-size: 3rem; margin-bottom: 1rem; display: block; }
                .btn { background: #3b82f6; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-size: 1rem; cursor: pointer; transition: background 0.2s; text-decoration: none; display: inline-block; }
                .btn:hover { background: #2563eb; }
                .tips { text-align: left; background: #fef2f2; padding: 1rem; border-radius: 0.5rem; font-size: 0.9rem; border: 1px solid #fecaca; margin-bottom: 1.5rem; }
            </style>
        </head>
        <body>
            <div class="card">
                <span class="icon">🔌</span>
                <h1>Connection Failed</h1>
                <p>CampusConnect cannot reach the database. The application is currently offline.</p>
                <div class="tips">
                    <strong>Troubleshooting:</strong>
                    <ul style="margin: 0.5rem 0 0 1.2rem; padding: 0;">
                        <li>Ensure <strong>MySQL Service</strong> is running.</li>
                        <li>Check if your <code>.env</code> credentials are correct.</li>
                    </ul>
                </div>
                <button class="btn" onclick="location.reload()">Retry Connection</button>
            </div>
        </body>
        </html>
    `);
});

// --- ROUTES (Same as before) ---
app.get('/api/config/google-maps', (req, res) => {
    res.json({ apiKey: process.env.GOOGLE_MAPS_API_KEY });
});
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

app.post('/api/auth/register', async (req, res) => {
    const { name, email, studentId, password } = req.body;
    if (!name || !email || !studentId || !password) return res.status(400).json({ error: 'All fields are required' });
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.query('INSERT INTO users (name, email, studentId, password) VALUES (?, ?, ?, ?)', [name, email, studentId, hashedPassword]);
        res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
    } catch (error) {
        console.error('Register Error:', error);
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'User/Email already exists' });
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { loginId, password } = req.body;
    if (!loginId || !password) return res.status(400).json({ error: 'Missing credentials' });
    try {
        const [users] = await db.query('SELECT * FROM users WHERE email = ? OR studentId = ?', [loginId, loginId]);
        if (users.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ message: 'Login successful', token, user: { id: user.id, name: user.name, email: user.email, role: user.role, studentId: user.studentId } });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/auth/me', authenticateToken, (req, res) => res.json({ user: req.user }));

// --- RBAC MIDDLEWARE ---
const isAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access Denied: Admins only.' });
    }
    next();
};

// --- EVENT ROUTES ---

// Get all events (Public)
app.get('/api/events', async (req, res) => {
    try {
        const [events] = await db.query('SELECT * FROM events ORDER BY date ASC');
        res.json(events);
    } catch (error) {
        console.error('❌ Error fetching events:', error);
        res.status(500).json({ error: 'Failed to fetch events: ' + error.message });
    }
});

// Add a new event (Admin Only)
app.post('/api/events', authenticateToken, isAdmin, async (req, res) => {
    const { name, date, venue, description } = req.body;
    console.log(`📬 [ADMIN: ${req.user.name}] Adding new event:`, { name, date, venue });

    if (!name || !date || !venue) {
        return res.status(400).json({ error: 'Name, date, and venue are required.' });
    }

    try {
        const [result] = await db.query(
            'INSERT INTO events (name, date, venue, description) VALUES (?, ?, ?, ?)',
            [name, date, venue, description]
        );
        console.log('✅ Event added with ID:', result.insertId);
        res.status(201).json({ message: 'Event added successfully', id: result.insertId });
    } catch (error) {
        console.error('❌ Error adding event:', error);
        res.status(500).json({ error: 'Failed to add event: ' + error.message });
    }
});

// Delete an event (Admin Only)
app.delete('/api/events/:id', authenticateToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    console.log(`🗑️ [ADMIN: ${req.user.name}] Deleting event ID: ${id}`);
    try {
        const [result] = await db.query('DELETE FROM events WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Event not found.' });
        }
        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error('❌ Error deleting event:', error);
        res.status(500).json({ error: 'Failed to delete event: ' + error.message });
    }
});

// Register for an event (Public/Student)
app.post('/api/events/register', async (req, res) => {
    const { event_id, student_name, student_id } = req.body;
    console.log(`📝 Attempting registration for Student: ${student_id}, Event ID: ${event_id}`);

    if (!event_id || !student_name || !student_id) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    try {
        const query = 'INSERT INTO event_registrations (event_id, student_name, student_id) VALUES (?, ?, ?)';
        console.log(`🔍 Executing SQL: ${query} with [${event_id}, ${student_name}, ${student_id}]`);

        const [result] = await db.query(query, [event_id, student_name, student_id]);

        console.log(`✅ Registration successful. ID: ${result.insertId}, affectedRows: ${result.affectedRows}`);
        res.status(201).json({ message: 'Registration successful', id: result.insertId });
    } catch (error) {
        console.error('❌ Error registering for event:', error);
        res.status(500).json({ error: 'Failed to register: ' + error.message });
    }
});

// Get registrations for a student
app.get('/api/registrations/:studentId', async (req, res) => {
    const { studentId } = req.params;
    console.log(`🔍 Fetching registrations for Student ID: ${studentId}`);

    try {
        const query = `
            SELECT r.*, e.name, e.date, e.venue, e.description 
            FROM event_registrations r 
            JOIN events e ON r.event_id = e.id 
            WHERE r.student_id = ?
        `;
        console.log(`🔍 Executing SQL: ${query} with [${studentId}]`);

        const [registrations] = await db.query(query, [studentId]);

        console.log(`✅ Found ${registrations.length} registrations for ${studentId}`);
        res.json(registrations);
    } catch (error) {
        console.error('❌ Error fetching registrations:', error);
        res.status(500).json({ error: 'Failed to fetch registrations: ' + error.message });
    }
});


// Legacy Data Helpers
const readData = () => { try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return { notices: [], events: [], faqs: [] }; } };
const writeData = (data) => { try { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8'); } catch (e) { console.error(e); } };

app.get('/api/notices', async (req, res) => {
    try {
        const [notices] = await db.query('SELECT * FROM notices ORDER BY date DESC');
        res.json(notices);
    } catch (error) {
        console.error('❌ Error fetching notices:', error);
        res.status(500).json({ error: 'Failed to fetch notices' });
    }
});

app.post('/api/notices', authenticateToken, isAdmin, async (req, res) => {
    const { title, description, date } = req.body;
    if (!title || !description || !date) return res.status(400).json({ error: 'Missing required fields' });
    try {
        const [result] = await db.query(
            'INSERT INTO notices (title, description, date) VALUES (?, ?, ?)',
            [title, description, date]
        );
        console.log(`✅ [ADMIN: ${req.user.name}] Notice added result:`, result);
        res.status(201).json({ message: 'Notice added successfully', id: result.insertId });
    } catch (error) {
        console.error('❌ Error adding notice:', error);
        res.status(500).json({ error: 'Failed to add notice' });
    }
});

app.delete('/api/notices/:id', authenticateToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    console.log(`🗑️ [ADMIN: ${req.user.name}] Attempting to delete notice with ID: ${id}`);
    try {
        const [result] = await db.query('DELETE FROM notices WHERE id = ?', [id]);
        console.log(`✅ Notice delete result for ID ${id}: affectedRows = ${result.affectedRows}`);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Notice not found.' });
        }
        res.json({ message: 'Notice deleted successfully', affectedRows: result.affectedRows });
    } catch (error) {
        console.error('❌ Error deleting notice:', error);
        res.status(500).json({ error: 'Failed to delete notice: ' + error.message });
    }
});


// FAQ Route
app.get('/api/faqs', (req, res) => {
    const data = readData();
    res.json(data.faqs || []);
});

// Global Search Route
app.get('/api/search', async (req, res) => {
    const query = req.query.q?.toLowerCase() || '';
    if (!query) return res.json({ notices: [], events: [], faqs: [] });

    try {
        const [notices] = await db.query('SELECT * FROM notices WHERE LOWER(title) LIKE ? OR LOWER(description) LIKE ?', [`%${query}%`, `%${query}%`]);
        const [events] = await db.query('SELECT * FROM events WHERE LOWER(name) LIKE ? OR LOWER(description) LIKE ?', [`%${query}%`, `%${query}%`]);
        const data = readData();
        const faqs = (data.faqs || []).filter(faq => 
            faq.question.toLowerCase().includes(query) || 
            faq.answer.toLowerCase().includes(query)
        );

        res.json({ notices, events, faqs });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

// Contacts Route
app.get('/api/contacts', (req, res) => {
    const data = readData();
    res.json(data.contacts || []);
});

// Start Server
app.listen(PORT, async () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    await connectDB();
});
