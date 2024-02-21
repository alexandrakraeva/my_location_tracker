const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const admin = require('firebase-admin');
const path = require('path');
const { Parser } = require('json2csv');
const { v4: uuidv4 } = require('uuid');

// Initialize Express app and create an HTTP server
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with the HTTP server
const io = socketIo(server);

// Firebase Admin SDK initialization
const serviceAccount = require('./path-to-your-firebase-adminsdk.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Port configuration
const PORT = process.env.PORT || 3000;

// Session counters for WebSocket sessions
let sessionCounters = {};

io.on('connection', (socket) => {
    console.log('A user connected');
    const sessionId = uuidv4();
    socket.emit('sessionInit', { sessionId });
    sessionCounters[sessionId] = 0;

    socket.on('locationUpdate', (data) => {
        let locationId = sessionCounters[sessionId]++;
        const locationsCollection = db.collection(sessionId);
        locationsCollection.doc(locationId.toString()).set({
            ...data,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        })
            .then(() => console.log('Data was added to Firestore successfully.'))
            .catch((error) => console.error('Error adding document to Firestore:', error));
    });

    socket.on('disconnect', () => {
        delete sessionCounters[sessionId];
    });
});

// Endpoint for sending light value and lux value
app.post('/send-data', async (req, res) => {
    const { lightValue, lux, latitude, longitude } = req.body;
    console.log(`Received data - Light: ${lightValue}, Lux: ${lux}, Latitude: ${latitude}, Longitude: ${longitude}`);

    const docRef = db.collection('sensorData').doc();
    await docRef.set({
        lightValue,
        lux,
        latitude,
        longitude,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).send('Data received and stored in Firebase');
});

// Endpoint to retrieve sensor data
app.get('/sensor-data', async (req, res) => {
    const snapshot = await db.collection('sensorData').orderBy('timestamp').get();
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.status(200).json(data);
});

// Serve the main page for any other route not handled above
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
