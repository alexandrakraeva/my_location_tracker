const express = require('express'); // framework to create web server
const http = require('http'); // module to create http server

const socketIo = require('socket.io'); // websocketing
const admin = require('firebase-admin'); //firebase servises - database
const path = require('path'); // to transform file path
const { Parser } = require('json2csv'); // convert json to csv to save

// initialize express app
const app = express();

// create http server with express
const server = http.createServer(app);

// initialize websocketing
const io = socketIo(server);

// initialize firebasecredentials
const serviceAccount = require('./xref-location-tracker-firebase-adminsdk-9hsrk-a1c6fe5af5.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
// initialise Firestore database
const db = admin.firestore();

// define the prot to listen on (for Heroku, otherwise default 3000)
const port = process.env.PORT || 3000;
// start the server
server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

// to serve index.html, styles.css, script.js files from 'public' directory
app.use(express.static('public'));

// to maintain session counters for each user session
let sessionCounters = {};

io.on('connection', (socket) => {
    console.log('A user connected');
    // generate new session ID for each connection
    const sessionId = require('uuid').v4();
    socket.emit('sessionInit', { sessionId });
    // Initialize the counter for this session
    sessionCounters[sessionId] = 0;

    // listen for th elocation updates from client side
    socket.on('locationUpdate', (data) => {
        console.log(data);
        // generate a unique location ID for this session
        let locationId = sessionCounters[sessionId]++;
        // reference which collection to save locatations to in firebase
        const locationsCollection = db.collection(sessionId);
        // add received location data to firebase, using location ID as document ID
        locationsCollection.doc(locationId.toString()).set({
            ...data,
            // add server-generated time-stamp
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        })
            .then(() => console.log('Data was added to Firestore successfully.'))
            .catch((error) => console.error('Error adding document to Firestore:', error));
    });

    // listen for disconnect events
    socket.on('disconnect', () => {
        // Clean up the session counter when the user disconnects
        delete sessionCounters[sessionId];
    });
});

// Route for downloading the CSV file
app.get('/download-csv', async (req, res) => {
    // get session ID
    const sessionId = req.query.sessionId;
    if (!sessionId) {
        // debug check
        return res.status(400).send('Session ID is required');
    }

    try {
        // reference which collection to save locatations to in firebase
        const locationsCollection = db.collection(sessionId);
        // fetch all docuements from the collection ordered by timestamp
        const snapshot = await locationsCollection.orderBy('timestamp').get(); // Ensure locations are ordered by timestamp

        if (snapshot.empty) {
            // debug check
            console.log('No matching documents.');
            return res.status(404).send('No locations found for this session');
        }

        // array to hold locationn data
        const locations = [];
        snapshot.forEach(doc => {
            let data = doc.data();
            // use Firestore document ID as the location ID
            data.id = doc.id;
            // convert the firebase timestamp to a standard ISO string
            if (data.timestamp) {
                const timestampDate = data.timestamp.toDate();
                data.timestamp = timestampDate.toISOString();
            }
            // add location data to array
            locations.push(data);
        });

        // fields to include in .csv
        const fields = ['id', 'latitude', 'longitude', 'timestamp'];
        // convert locztion data to .csv format
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(locations);

        res.header('Content-Type', 'text/csv');
        res.attachment('locations.csv');
        return res.send(csv);
    } catch (error) {
        // debug check
        console.error('Error fetching data from Firestore:', error);
        res.status(500).send('Error generating CSV file');
    }
});

// Serve the main page for any other route not handled above
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});