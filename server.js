const express = require('express'); // framework to create server
const http = require('http'); //moule to create http server
const socketIo = require('socket.io'); // websocketing
const bodyParser = require('body-parser'); // To parse JSON bodies
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



app.post('/api/light-intensity', (req, res) => {
    const { lux, timestamp } = req.body;
    const collection = db.collection('light-intensities');
    collection.add({ lux, timestamp: admin.firestore.Timestamp.fromMillis(timestamp) })
        .then(docRef => res.status(200).json({ message: 'Data added successfully', id: docRef.id }))
        .catch(error => res.status(500).json({ error: error.toString() }));
});

app.post('/api/location-update', (req, res) => {
    const { lat, lng, timestamp } = req.body;
    const collection = db.collection('locations');
    collection.add({ latitude: lat, longitude: lng, timestamp: admin.firestore.Timestamp.fromDate(new Date(timestamp)) })
        .then(docRef => res.status(200).json({ message: 'Data added successfully', id: docRef.id }))
        .catch(error => res.status(500).json({ error: error.toString() }));
});



// to download the file as csv
app.get('/download-csv', async (req, res) => {
    try {
        const lightIntensitiesSnapshot = await db.collection('light-intensities').get();
        const locationsSnapshot = await db.collection('locations').get();

        if (lightIntensitiesSnapshot.empty || locationsSnapshot.empty) {
            return res.status(404).send('No data found');
        }

        // Assuming you have a way to correlate the entries (e.g., timestamps within a certain threshold)
        const combinedData = [];
        locationsSnapshot.forEach(locationDoc => {
            const locationData = locationDoc.data();
            const lightIntensityData = lightIntensitiesSnapshot.docs.find(lightDoc => {
                const lightData = lightDoc.data();
                // Here you need a condition to match the location and light intensity entries
                // For example, comparing timestamps (assuming they're close enough)
                return Math.abs(new Date(lightData.timestamp.toDate()) - new Date(locationData.timestamp.toDate())) < 5000; // 5-second threshold
            });

            if (lightIntensityData) {
                combinedData.push({
                    id: locationDoc.id,
                    longitude: locationData.longitude,
                    latitude: locationData.latitude,
                    lightIntensity: lightIntensityData.data().lux,
                    datetime: locationData.timestamp.toDate().toISOString()
                });
            }
        });

        const fields = ['id', 'longitude', 'latitude', 'lightIntensity', 'datetime'];
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(combinedData);

        res.header('Content-Type', 'text/csv');
        res.attachment('data.csv');
        return res.send(csv);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).send('Error generating CSV file');
    }
});


// listen for new connections on WebSocket
io.on('connection', (socket) => {
    console.log('A user connected');
    // generate a unique session id
    const sessionId = require('uuid').v4();
    // send session id to the connected client
    socket.emit('sessionInit', { sessionId });
    // listen for location updates from the user
    socket.on('locationUpdate', (data) => {
        console.log(data);

        // add received data to Firestore
        const locationsCollection = db.collection(sessionId);
        locationsCollection.add({
            ...data,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        })
            .then(() => console.log('Data was added to Firestore successfully.'))
            .catch((error) => console.error('Error adding document to Firestore:', error));
    });
});

// serve the main page for any other route not handled above
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
