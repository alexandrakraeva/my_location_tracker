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

// to download the file as csv
app.get('/download-csv', async (req, res) => {
    const sessionId = req.query.sessionId; // session ID
    // check if session id is provided
    if (!sessionId) {
        return res.status(400).send('Session ID is required');
    }
    // we create new collectionn each time user opens the app
    try {
        const locationsCollection = db.collection(sessionId); // ref to firebase collection
        const snapshot = await locationsCollection.get(); // to get all doc from collection
        // check if collection is empty
        if (snapshot.empty) {
            console.log('No matching documents.');
            return res.status(404).send('No locations found for this session');
        }

        const locations = []; // array to hold location data
        let index = 0; // to rewrite index from random one from firebase to [0,1,2...] in .csv
        snapshot.forEach(doc => {
            let data = doc.data();
            data.id = index++;
            if (data.timestamp) {
                const timestampDate = data.timestamp.toDate(); // convert firebase timestamp to js
                data.timestamp = timestampDate.toISOString(); // convert to DateTime string in ISO format  
            }
            // add loc data to array
            locations.push(data);
        });

        const fields = ['id', 'latitude', 'longitude', 'timestamp']; // .csv fields

        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(locations); // conver .json to .csv

        // headers to prompt download
        res.header('Content-Type', 'text/csv');
        res.attachment('locations.csv');
        return res.send(csv);
    } catch (error) {
        console.error('Error fetching data from Firestore:', error);
        res.status(500).send('Error generating CSV file');
    }
});

// init socket.io (WebSocket) on the server
const io = socketIo(server);

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
