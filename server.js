const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const admin = require('firebase-admin');
const path = require('path');
const { Parser } = require('json2csv'); // Add json2csv package to convert JSON to CSV
const server = http.createServer(app);


// Initialize Firebase Admin with your project's credentials
const serviceAccount = require('./xref-location-tracker-firebase-adminsdk-9hsrk-a1c6fe5af5.json'); // Replace with the path to your Firebase service account key
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore(); // Get a Firestore instance

// Initialize express app
const app = express();
const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

// Serve static files from 'public' directory
app.use(express.static('public'));

// Endpoint to download locations as CSV
app.get('/download-csv', async (req, res) => {
    const sessionId = req.query.sessionId; // Get the session ID from query parameters

    if (!sessionId) {
        return res.status(400).send('Session ID is required');
    }

    try {
        const locationsCollection = db.collection(sessionId);
        const snapshot = await locationsCollection.get();

        if (snapshot.empty) {
            // Handle the case where there are no documents
            console.log('No matching documents.');
            return res.status(404).send('No locations found for this session');
        }

        const locations = [];
        let index = 0;
        snapshot.forEach(doc => {
            let data = doc.data();
            data.id = index++;; // Optionally include document ID
            if (data.timestamp) {
                const timestampDate = data.timestamp.toDate(); // Convert to JavaScript Date object
                data.timestamp = timestampDate.toISOString(); // Convert to DateTime string in ISO format  
            }

            locations.push(data);
        });

        // Specify fields if you want to ensure the CSV has headers even when no data is present
        const fields = ['id', 'latitude', 'longitude', 'timestamp']; // Adjust according to your data structure

        // Convert JSON to CSV
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(locations);

        // Set headers to prompt download
        res.header('Content-Type', 'text/csv');
        res.attachment('locations.csv');
        return res.send(csv);
    } catch (error) {
        console.error('Error fetching data from Firestore:', error);
        res.status(500).send('Error generating CSV file');
    }
});

// Create HTTP server and bind the express app to it, along with websocket
const server = http.createServer(app);
const io = socketIo(server);

// Listen for new connections on WebSocket
io.on('connection', (socket) => {
    console.log('A user connected');

    // Generate a unique session ID, e.g., using UUID
    const sessionId = require('uuid').v4();  // Ensure you have 'uuid' installed or use another method to generate unique IDs

    // Send this session ID to the connected client
    socket.emit('sessionInit', { sessionId });


    // Listen for location updates from the user
    socket.on('locationUpdate', (data) => {
        console.log(data);

        // Add received data to Firestore
        const locationsCollection = db.collection(sessionId); // Use session ID as collection name
        locationsCollection.add({
            ...data,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        })
            .then(() => console.log('Data was added to Firestore successfully.'))
            .catch((error) => console.error('Error adding document to Firestore:', error));
    });
});

// Serve the main page for any other route not handled above
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
server.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
