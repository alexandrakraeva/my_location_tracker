const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const axios = require('axios'); // Add axios for HTTP requests

// Initialize express app and create http server with express
const app = express();
const server = http.createServer(app);

// Initialize socket.io (WebSocket) on the server
const io = socketIo(server);

// Define the port to listen on (useful for Heroku deployment or local testing)
const port = process.env.PORT || 3000;

// Start the server
server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

// Serve static files (index.html, styles.css, script.js) from 'public' directory
app.use(express.static('public'));

// ThingSpeak Settings - Replace with your actual Channel ID and Write API Key
const thingSpeakChannel = 2435543;
const thingSpeakWriteAPIKey = 'RKJ773VUWA0MM5GF';

// Listen for new connections on WebSocket
io.on('connection', (socket) => {
    console.log('A user connected');
    // Generate a unique session id using UUID
    const sessionId = require('uuid').v4();
    // Send session id to the connected client
    socket.emit('sessionInit', { sessionId });

    // Listen for location updates from the client
    socket.on('locationUpdate', (data) => {
        console.log(data);

        // Send data to ThingSpeak using a GET request
        const url = `https://api.thingspeak.com/update?api_key=${thingSpeakWriteAPIKey}&field1=${data.latitude}&field2=${data.longitude}`;
        axios.get(url)
            .then(() => console.log('Data sent to ThingSpeak successfully.'))
            .catch((error) => console.error('Error sending data to ThingSpeak:', error));
    });
});

// Serve the main page for any other route not handled above
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
