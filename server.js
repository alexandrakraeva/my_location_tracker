server.js
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

// to maintain session counters
let sessionCounters = {};

io.on('connection', (socket) => {
    console.log('A user connected');
    const sessionId = require('uuid').v4();
    socket.emit('sessionInit', { sessionId });

    sessionCounters[sessionId] = 0; // Initialize the counter for this session

    socket.on('locationUpdate', (data) => {
        console.log(data);

        let locationId = sessionCounters[sessionId]++; // Increment the session counter for sequential IDs

        const locationsCollection = db.collection(sessionId);
        locationsCollection.doc(locationId.toString()).set({
            ...data,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        })
            .then(() => console.log('Data was added to Firestore successfully.'))
            .catch((error) => console.error('Error adding document to Firestore:', error));
    });

    socket.on('disconnect', () => {
        delete sessionCounters[sessionId]; // Clean up the session counter when the user disconnects
    });
});


app.get('/updateLux', (req, res) => {
    const lux = req.query.lux; // Get the lux value from the query string
    console.log(`Lux value received: ${lux}`);
    io.emit('lux', { value: lux }); // Emit the lux value to all connected WebSocket clients
    res.sendStatus(200);
});


// Route for downloading the CSV file
app.get('/download-csv', async (req, res) => {
    const sessionId = req.query.sessionId;
    if (!sessionId) {
        return res.status(400).send('Session ID is required');
    }

    try {
        const locationsCollection = db.collection(sessionId);
        const snapshot = await locationsCollection.orderBy('timestamp').get(); // Ensure locations are ordered by timestamp

        if (snapshot.empty) {
            console.log('No matching documents.');
            return res.status(404).send('No locations found for this session');
        }

        const locations = [];
        snapshot.forEach(doc => {
            let data = doc.data();
            data.id = doc.id; // Use Firestore document ID as the location ID
            if (data.timestamp) {
                const timestampDate = data.timestamp.toDate();
                data.timestamp = timestampDate.toISOString();
            }
            locations.push(data);
        });

        const fields = ['id', 'latitude', 'longitude', 'timestamp'];
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(locations);

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