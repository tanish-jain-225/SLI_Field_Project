// Imports
const express = require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config(); // Environment Variables - Secret

// Configurations
const app = express();
const port = 5000; 
const url = process.env.MONGO_URI; // Default MongoDB URI
const dbName = process.env.DB_NAME; // Default database name
const collectionName = process.env.C_NAME; // Default collection name

// Middleware to parse JSON request bodies
app.use(express.json());

// Global MongoDB Client (Reused for efficiency)
let client;

// Function to connect to MongoDB (Reusing client)
const connectToMongoDB = async () => {
    if (!client) {
        client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
        await client.connect();
    }
    return client.db(dbName);
};

// Arduino Data to Variable (Simulated data generation)
const ardiunoToVar = async () => {
    const loadData = Math.random() * 10; // Random load value
    const loadCost = Math.random() * 100; // Random cost value
    const loadAngle = Math.random() * 360; // Random angle value
    const loadLengthbar = Math.random() * 100; // Random length value

    return { loadData, loadCost, loadAngle, loadLengthbar };
};

// Function to generate random data and post to MongoDB
const sendData = async () => {
    try {
        const db = await connectToMongoDB();
        const collection = db.collection(collectionName);

        // Arduino to variable
        const { loadData, loadCost, loadAngle, loadLengthbar } = await ardiunoToVar();

        // Data to be saved
        const data = {
            load: loadData,
            cost: loadCost,
            angle: loadAngle,
            lengthbar: loadLengthbar,
            timestamp: new Date().toISOString(), // Include timestamp for when the data was recorded
        };

        // Insert the data into MongoDB
        const result = await collection.insertOne(data);
        console.log(`Data inserted with ID: ${result.insertedId}`);
    } catch (error) {
        console.error('Error inserting data:', error.message);
    }
};

// Call the sendData function every 2 seconds
setInterval(sendData, 2000);

// Graceful Shutdown for MongoDB Connection
process.on('SIGINT', async () => {
    console.log('Shutting down server...');
    if (client) {
        await client.close();
        console.log('MongoDB connection closed.');
    }
    process.exit(0);
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
