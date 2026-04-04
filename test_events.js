const http = require('http');

const data = JSON.stringify({
    name: 'Robotics Workshop',
    date: '2026-03-20',
    venue: 'Lab 101',
    description: 'Intro to Arduino'
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/events',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    console.log(`POST STATUS: ${res.statusCode}`);
    res.on('data', d => process.stdout.write(d));
});

req.on('error', error => console.error(error));
req.write(data);
req.end();
