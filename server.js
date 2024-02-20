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
const serviceAccount = require('./xref-lux-values-firebase-adminsdk-puayh-d190ccc1e1.json');
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

    // Listen for lux value updates instead of location updates
    socket.on('luxUpdate', (data) => {
        console.log(data);

        let luxId = sessionCounters[sessionId]++; // Increment the session counter for sequential IDs

        const luxCollection = db.collection(sessionId);
        luxCollection.doc(luxId.toString()).set({
            lux: data.lux,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        })
            .then(() => console.log('Lux data was added to Firestore successfully.'))
            .catch((error) => console.error('Error adding document to Firestore:', error));
    });

    socket.on('disconnect', () => {
        delete sessionCounters[sessionId]; // Clean up the session counter when the user disconnects
    });
});

// Serve the main page for any other route not handled above
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});