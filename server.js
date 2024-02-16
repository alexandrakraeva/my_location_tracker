const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const path = require('path');

const app = express();
app.use(bodyParser.json());

const server = http.createServer(app);
const io = socketIo(server);

const serviceAccount = require('./xref-location-tracker-firebase-adminsdk-9hsrk-a1c6fe5af5.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

app.use(express.static('public'));

app.post('/api/light-intensity', (req, res) => {
    const { lux, timestamp } = req.body;
    io.emit('lightIntensityUpdate', { lux, timestamp });
    res.json({ message: 'Light intensity updated' });
});

app.post('/api/location-update', (req, res) => {
    const { lat, lng, timestamp } = req.body;
    const collection = db.collection('locations');
    collection.add({ latitude: lat, longitude: lng, timestamp: admin.firestore.Timestamp.fromDate(new Date(timestamp)) })
        .then(docRef => res.status(200).json({ message: 'Data added successfully', id: docRef.id }))
        .catch(error => res.status(500).json({ error: error.toString() }));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
    console.log('A user connected');
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});
