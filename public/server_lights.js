const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const port = process.env.PORT || 3000;
// start the server
server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

app.use(express.static('public'));

app.get('/updateLux', (req, res) => {
    const lux = req.query.lux; // Get the lux value from the query string
    console.log(`Lux value received: ${lux}`);
    io.emit('lux', { value: lux }); // Emit the lux value to all connected WebSocket clients
    res.sendStatus(200);
});


