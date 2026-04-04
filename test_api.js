const fetch = require('http');

const data = JSON.stringify({
    title: 'Test Node Script',
    description: 'Testing directly via Node.js',
    date: '2026-02-14'
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/notices',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = fetch.request(options, (res) => {
    console.log(`statusCode: ${res.statusCode}`);

    res.on('data', (d) => {
        process.stdout.write(d);
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.write(data);
req.end();
