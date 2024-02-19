const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const admin = require('firebase-admin');
const path = require('path');
const { Parser } = require('json2csv');
const bodyParser = require('body-parser');

// initialize express app
const app = express();

// create http server with express
const server = http.createServer(app);

// initialize firebase + project credentials
const serviceAccount = require('./xref-location-tracker-firebase-adminsdk-9hsrk-a1c6fe5af5.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// define the prot to listen on (for Heroku)
const port = process.env.PORT || 3000;
// start the server
server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

// index.html, styles.css, script.js files from 'public' directory
app.use(bodyParser.json());

// Serve static files from 'public' directory
app.use(express.static('public'));

// Route for receiving light intensity data
app.post('/light-intensity', async (req, res) => {
    const { lux, timestamp } = req.body; // Destructure the lux and timestamp from the request body

    try {
        // Use a specific Firestore collection for light intensity data
        const lightIntensityCollection = db.collection('lightIntensities');
        // Add a new document to the collection
        await lightIntensityCollection.add({
            lux: lux,
            timestamp: new Date(parseInt(timestamp)) // Convert timestamp to Date object
        });
        console.log('Light intensity data added to Firestore successfully.');
        res.status(200).send('Data received and stored.');
    } catch (error) {
        console.error('Error adding light intensity data to Firestore:', error);
        res.status(500).send('Server error');
    }
});

// Existing code for handling session initialization and location updates
io.on('connection', (socket) => {
    console.log('A user connected');
    const sessionId = require('uuid').v4();
    socket.emit('sessionInit', { sessionId });

    socket.on('locationUpdate', (data) => {
        console.log(data);
        const locationsCollection = db.collection(sessionId);
        locationsCollection.add({
            ...data,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        })
            .then(() => console.log('Data was added to Firestore successfully.'))
            .catch((error) => console.error('Error adding document to Firestore:', error));
    });
});

// Route for downloading CSV file of locations
app.get('/download-csv', async (req, res) => {
    // Existing code for handling CSV download...
});

// Serve the main page for any other route not handled above
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

// Initialize Socket.IO on the server
const io = socketIo(server);