const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// Environment Variables
require('dotenv').config();
const PORT = process.env.PORT_NAME;
const url = process.env.MONGO_URI;
const dbName = process.env.DB_NAME; // Your MongoDB database name
const collectionName = process.env.C_NAME; // The collection where data will be saved
const client = new MongoClient(url);

let db;

async function initializeDatabase() {
    try {
        await client.connect();
        console.log("Connected to MongoDB!");
        db = client.db(dbName);
    } catch (err) {
        console.error("Failed to connect to MongoDB:", err.message);
        process.exit(1); // Exit the process if database connection fails
    }
}

app.get("/", async (req, res) => {
    if (!db) {
        return res.status(500).json({ message: "Database not initialized yet" });
    }
    try {
        const items = await db.collection(collectionName).find().toArray();
        res.json(items);
    } catch (err) {
        console.error("Error fetching data:", err.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Start the Server Only After Database is Initialized
initializeDatabase()
    .then(() => {
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch((err) => {
        console.error("Error during server startup:", err.message);
    });
