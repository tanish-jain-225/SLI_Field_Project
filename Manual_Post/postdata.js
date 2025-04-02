// Imports
const express = require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config(); // Load environment variables

// Configuration
const app = express();
const port = 5000;
const url = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;
const collectionName = process.env.C_NAME;

app.use(express.json());

// Global MongoDB Client (reused for efficiency)
let client;

// ======================== MongoDB Connection ========================

const connectToMongoDB = async () => {
    if (!client) {
        client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
        try {
            await client.connect();
            console.log('Connected to MongoDB.');
        } catch (err) {
            console.error('MongoDB Connection Failed:', err.message);
            process.exit(1);
        }
    }
    return client.db(dbName);
};

// ======================== Data Handling Functions ========================

/*
 * Generate current "sensor data". Easily extendable to add new parameters - Arduino sensor data, etc.
 */
const generateSensorData = () => {
    return {
        load: Math.random() * 10,
        cost: Math.random() * 100,
        angle: Math.random() * 360,
        lengthbar: Math.random() * 100,
        frequency: Math.random() * 1000,
        pressure: Math.random() * 10000,
        // Add more fields as needed
        // temperature: Math.random() * 100,
        // humidity: Math.random() * 100,
        // vibration: Math.random() * 100,
        // speed: Math.random() * 100,
        // acceleration: Math.random() * 100,
        // torque: Math.random() * 100,
        // power: Math.random() * 100
    };
};

/*
 * Posts sensor data to MongoDB, logs it, and deletes all older documents.
 * Keeps only the latest inserted data.
 */
const postData = async (data) => {
    try {
        const db = await connectToMongoDB();
        const collection = db.collection(collectionName);

        data.timestamp = new Date().toISOString(); // Add timestamp

        // Insert new data
        const result = await collection.insertOne(data);
        console.log('Data Inserted:', JSON.stringify(data, null, 2));

        // Fetch and delete all previous documents
        const oldDocs = await collection.find({ _id: { $ne: result.insertedId } }).toArray();

        // Optionally remove the old documents
        // Uncomment the next line to delete all previous documents
        // if (oldDocs.length > 0) {
        //     console.log('Deleting Previous Documents:');
        //     oldDocs.forEach(doc => console.log(JSON.stringify(doc, null, 2)));
        //     const deleteResult = await collection.deleteMany({ _id: { $ne: result.insertedId } });
        //     // console.log(`Deleted ${deleteResult.deletedCount} old document(s).`);
        // } else {
        //     console.log('No previous documents to delete.');
        // }

    } catch (error) {
        console.error('Error inserting data:', error.message);
    }
};

// ======================== Initialization & Periodic Data Posting ========================

/*
 * Posts new sensor data every 2 seconds.
 */
const FETCH_INTERVAL_MS = 2000; // Fetch every 2 seconds

const startPeriodicDataPosting = async () => {
    try {
        setInterval(async () => {
            const newData = generateSensorData();
            await postData(newData);
        }, FETCH_INTERVAL_MS);
    } catch (error) {
        console.error('Failed to start periodic data posting:', error.message);
        process.exit(1);
    }
};

// ======================== Graceful Shutdown ========================

const shutdown = async (reason) => {
    console.log(`Shutting down server: ${reason}`);
    if (client) {
        await client.close();
        console.log('MongoDB connection closed.');
    }
    process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT (Ctrl+C)'));
process.on('SIGTERM', () => shutdown('SIGTERM (Process Termination)'));

// ======================== Health Check Endpoint (Optional) ========================

app.get('/', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Server is running smoothly.' });
});

// ======================== Start Server ========================

app.listen(port, async () => {
    console.log(`Server running at http://localhost:${port}`);
    await startPeriodicDataPosting();
});
