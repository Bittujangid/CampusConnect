CREATE DATABASE IF NOT EXISTS campus_connect;
USE campus_connect;

CREATE TABLE IF NOT EXISTS notices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    venue VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS event_registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    student_name VARCHAR(255) NOT NULL,
    student_id VARCHAR(50) NOT NULL,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS faqs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    map_link TEXT
);

CREATE TABLE IF NOT EXISTS contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL
);

-- Insert some sample data
INSERT INTO notices (title, description, date) VALUES 
('Holiday Announcement', 'The campus will be closed on Friday for the public holiday.', CURDATE()),
('Exam Schedule Released', 'The final exam schedule has been published on the portal.', CURDATE());

INSERT INTO events (name, date, venue, description) VALUES 
('Tech Hackathon 2025', '2025-03-15', 'Main Auditorium', 'A 24-hour coding hackathon for all students.'),
('Cultural Fest', '2025-04-10', 'Open Grounds', 'Annual cultural festival with music and dance.');

INSERT INTO faqs (question, answer, category) VALUES 
('How do I reset my password?', 'Go to the student portal and click on Forgot Password.', 'General'),
('Where is the library?', 'The library is located in Block B, 2nd Floor.', 'Facilities');

INSERT INTO locations (name, description, map_link) VALUES 
('Library', 'Main Campus Library', 'https://maps.google.com/?q=Library'),
('Cafeteria', 'Student Canteen', 'https://maps.google.com/?q=Cafeteria');

INSERT INTO contacts (name, role, phone_number) VALUES 
('Admin Office', 'Administration', '+1234567890'),
('Security Desk', 'Security', '+0987654321');
