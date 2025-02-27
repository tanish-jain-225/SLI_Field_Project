const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB connection variables
const url = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;
const collectionName = process.env.C_NAME;

// Connection cache for performance (so we don't reconnect every request)
let cachedClient = null;
let cachedDb = null;

// Function to establish/reuse MongoDB connection
async function connectToDatabase() {
    if (cachedDb) {
        // Use cached connection if available (for warm starts)
        return { client: cachedClient, db: cachedDb };
    }

    const client = new MongoClient(url);

    try {
        await client.connect();
        console.log("✅ Connected to MongoDB");

        const db = client.db(dbName);
        cachedClient = client;
        cachedDb = db;

        return { client, db };
    } catch (err) {
        console.error("❌ MongoDB Connection Error:", err.message);
        throw err;
    }
}

// API Route Handler
app.get("/", async (req, res) => {
    try {
        const { db } = await connectToDatabase();
        const items = await db.collection(collectionName).find().toArray();
        res.json(items);
    } catch (err) {
        console.error("❌ Error Fetching Data:", err.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Health check endpoint (optional, useful for debugging on Vercel)
app.get("/health", async (req, res) => {
    try {
        const { db } = await connectToDatabase();
        res.json({ status: "ok", dbConnected: !!db });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});

// Important: No app.listen(), Vercel automatically handles this
module.exports = app;
