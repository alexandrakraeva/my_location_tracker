const fs = require('fs'); // to read html and replace placeholders with apis
require('dotenv').config();
const express = require('express'); // framework to create server
const http = require('http'); //moule to create http server
const socketIo = require('socket.io'); // websocketing
const admin = require('firebase-admin'); //firebase servises - database
const path = require('path'); // to transform file path
const { Parser } = require('json2csv'); // convert json to csv to save


// initialize express app
const app = express();

// create http server with express
const server = http.createServer(app);

const io = socketIo(server);

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
app.use(express.static('public'));



// from .env
app.get('/', (req, res) => {
    fs.readFile('public/index.html', 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading index.html', err);
            return res.status(500).send('An error occurred');
        }
        const result = data.replace('YOUR_API_KEY_PLACEHOLDER', process.env.GOOGLE_MAPS_API_KEY);
        res.send(result);
    });
});

// to maintain session counters
let sessionCounters = {};

io.on('connection', (socket) => {
    console.log('A user connected');
    const sessionId = require('uuid').v4();
    socket.emit('sessionInit', { sessionId });

    sessionCounters[sessionId] = 0; // Initialize the counter for this session


    socket.on('locationUpdate', (data) => {
        let updateId = sessionCounters[sessionId]++;
        const updatesCollection = db.collection(sessionId);
        updatesCollection.doc(updateId.toString()).set({
            latitude: data.lat,
            longitude: data.lng,
            lux: data.lux,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        })
            .then(() => console.log('Location and lux data added to Firestore successfully.'))
            .catch((error) => console.error('Error adding document to Firestore:', error));
    });

    socket.on('disconnect', () => {
        delete sessionCounters[sessionId]; // Clean up the session counter when the user disconnects
    });
});

// Endpoint for updating lux values (specific to Project 1)
app.get('/updateLux', (req, res) => {
    const lux = req.query.lux;
    io.emit('lux', { value: lux });
    res.sendStatus(200);
});

// Route for downloading the CSV file
app.get('/download-csv', async (req, res) => {
    const sessionId = req.query.sessionId;
    if (!sessionId) {
        return res.status(400).send('Session ID is required');
    }

    try {
        const updatesCollection = db.collection(sessionId);
        const snapshot = await updatesCollection.orderBy('timestamp').get();

        if (snapshot.empty) {
            return res.status(404).send('No data found for this session');
        }

        const updates = [];
        snapshot.forEach(doc => {
            let data = doc.data();
            data.id = doc.id;
            if (data.timestamp) {
                data.timestamp = data.timestamp.toDate().toISOString();
            }
            updates.push(data);
        });

        const fields = ['id', 'latitude', 'longitude', 'lux', 'timestamp'];
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(updates);

        res.header('Content-Type', 'text/csv');
        res.attachment('locations.csv');
        return res.send(csv);
    } catch (error) {
        console.error('Error fetching data from Firestore:', error);
        res.status(500).send('Error generating CSV file');
    }
});

// Serve the main page for any other route not handled above
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});