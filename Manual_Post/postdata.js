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

/**
 * Generate current "sensor data". Easily extendable to add new parameters.
 */
const generateSensorData = () => {
    return {
        load: Math.random() * 10,
        cost: Math.random() * 100,
        angle: Math.random() * 360,
        lengthbar: Math.random() * 100,
        frequency: Math.random() * 1000,
        pressure: Math.random() * 10000,
    };
};

/**
 * Posts sensor data to MongoDB, logs it, and deletes all older documents.
 * Keeps only the latest inserted data.
 */
const postData = async (data) => {
    const db = await connectToMongoDB();               // Ensure MongoDB connection is established
    const collection = db.collection(collectionName);  // Access the specific collection

    const session = client.startSession();             // Start a new session (required for transactions)

    try {
        session.startTransaction();                     // Start a transaction to group operations atomically

        data.timestamp = new Date().toISOString();      // Add a timestamp field to the sensor data

        // Step 1: Insert the new sensor data document into the collection within the transaction
        const result = await collection.insertOne(data, { session });
        console.log('Data Inserted:', JSON.stringify(data, null, 2));

        // Step 2: Delete all older documents (documents other than the newly inserted one) within the transaction
        const deleteResult = await collection.deleteMany(
            { _id: { $ne: result.insertedId } },        // Filter: Delete all except the newly inserted document
            { session }                                 // Ensure delete happens in the same transaction
        );

        console.log(`Deleted ${deleteResult.deletedCount} old document(s).`);

        // Step 3: Commit the transaction — both insert and delete will be finalized only if this succeeds
        await session.commitTransaction();
    } catch (error) {
        console.error('Error during atomic insert and delete:', error.message);

        // If any error occurs, rollback (undo) all operations performed in the transaction
        await session.abortTransaction();
    } finally {
        session.endSession();                           // End the session (free up resources)
    }
};


// ======================== Initialization & Periodic Data Posting ========================

/**
 * Posts new sensor data every 2 seconds.
 */
const startPeriodicDataPosting = async () => {
    try {
        setInterval(async () => {
            try {
                const newData = generateSensorData();
                await postData(newData);
            } catch (intervalError) {
                console.error('Error during periodic data posting:', intervalError.message);
            }
        }, 2000);
    } catch (error) {
        console.error('Failed to start periodic data posting:', error.message);
        process.exit(1);
    }
};

// ======================== Graceful Shutdown ========================

const shutdown = async (reason) => {
    console.log(`Shutting down server: ${reason}`);
    if (client) {
        try {
            await client.close();
            console.log('MongoDB connection closed.');
        } catch (closeError) {
            console.error('Error closing MongoDB connection:', closeError.message);
        }
    }
    process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT (Ctrl+C)'));
process.on('SIGTERM', () => shutdown('SIGTERM (Process Termination)'));

// ======================== Health Check Endpoint (Optional) ========================

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Server is running smoothly.' });
});

// ======================== Start Server ========================

app.listen(port, async () => {
    console.log(`Server running at http://localhost:${port}`);
    await startPeriodicDataPosting();
});
