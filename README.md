# 🎓 CampusConnect - Your Smart Campus Assistant

![CampusConnect Banner](public/favicon.ico) <!-- Placeholder icon/banner -->

**CampusConnect** is a modern, high-performance web application designed to bridge the gap between students and campus information. Built with a sleek **Glassmorphism UI**, it offers a professional and interactive experience for managing events, notices, and registrations in real-time.

---

## ✨ Key Features

### 📊 **Dynamic Dashboard Stats**
Get instant insights with a real-time summary of:
- **Total Events**: Live count of all upcoming campus activities.
- **My Registrations**: Personalized tracking of events you've signed up for.
- **Latest Notices**: Quick count of the most recent announcements.

### 🔔 **Real-Time Notification System**
Stay updated with a smart **Notification Bell** that pushes alerts for:
- New events added to the system.
- Recently posted notices.
- Removals/Deletions (with persistence logic that remembers what you've dismissed).

### 🌙 **Advanced Theme Support**
Switch between a vibrant **Light Mode** and a deep, glass-based **Dark Mode** with a single click. Your preference is saved locally for your next visit!

### 🔍 **Dual-Mode Deep Search**
Filter through the dashboard instantly or perform a **Deep API Search** to find specific details within notices, events, and FAQs with zero latency.

### 🛡️ Admin Control Panel
Secure admin modes across Events and Notices pages (Accessible to users with the 'admin' role) to add or remove data on the fly.


## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3 (Custom Grid & Flexbox).
- **Styling**: Modern CSS variables & animations (Glassmorphism & Dark Mode).
- **Backend**: [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/).
- **Database**: [MySQL](https://www.mysql.com/) (using `mysql2` with Promise support).
- **Authentication**: JWT-based secure sessions.

---

## 🚀 Quick Setup

### 1. **Prerequisites**
Make sure you have [Node.js](https://nodejs.org/) and [MySQL](https://www.mysql.com/) installed on your system.

### 2. **Clone the Project**
```bash
git clone https://github.com/Bittujangid/CampusConnect.git
cd CampusConnect
```

### 3. **Install Dependencies**
```bash
npm install
```

### 4. **Database Configuration**
Create a `.env` file in the root directory and add your MySQL credentials:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=campusconnect
JWT_SECRET=your_jwt_secret
```

### 5. **Run the Application**
```bash
node server.js
```
The app will be available at `http://localhost:3000`.

---

## 💻 Screenshots
*(Add your own screenshots here to wow visitors!)*

---
**Developed with ❤️ by Bittu Jangid & CampusConnect Team**
