const express = require('express'); // framework to create server
const http = require('http'); //moule to create http server
const bodyParser = require('body-parser');
const socketIo = require('socket.io'); // websocketing
const admin = require('firebase-admin'); //firebase servises - database
const path = require('path'); // to transform file path
const { Parser } = require('json2csv'); // convert json to csv to save

// initialize express app
const app = express();
app.use(bodyParser.json());

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

app.post('/sensorData', (req, res) => {
    console.log('Received sensor data via HTTP POST:', req.body);
    const sessionId = req.body.sessionId; // Expecting sessionId to be part of the POST data

    if (!sessionId || !sessionCounters[sessionId]) {
        return res.status(400).send({ success: false, message: 'Invalid or missing sessionId' });
    }

    let sensorDataId = sessionCounters[sessionId]++; // Use the same session counter for sensor data

    db.collection(sessionId).doc(`sensorData-${sensorDataId}`).set({
        lux: req.body.lux,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    })
        .then(docRef => {
            console.log(`Sensor data added with ID: sensorData-${sensorDataId}`);
            res.send({ success: true });
        })
        .catch(error => {
            console.error('Error adding document:', error);
            res.status(500).send({ success: false, error: error.toString() });
        });
});

// Route for downloading the CSV file
app.get('/download-csv', async (req, res) => {
    const sessionId = req.query.sessionId;
    if (!sessionId) {
        return res.status(400).send('Session ID is required');
    }

    try {
        const collectionRef = db.collection(sessionId);
        const snapshot = await collectionRef.orderBy('timestamp').get();

        if (snapshot.empty) {
            return res.status(404).send('No data found for this session');
        }

        // Transform the data to match the desired CSV structure
        const locations = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                latitude: data.latitude, // Assuming latitude is stored in the document
                longitude: data.longitude, // Assuming longitude is stored in the document
                timestamp: data.timestamp ? data.timestamp.toDate().toISOString() : null // Format timestamp
            };
        });

        // Define the fields to be included in the CSV
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