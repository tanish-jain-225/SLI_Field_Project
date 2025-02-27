// Imports
const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");
require('dotenv').config();

// Configurations
const app = express();
const PORT = 3000; // Use env PORT if provided, fallback to 3000
const url = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;
const collectionName = process.env.C_NAME;

// Middleware
app.use(express.json());
app.use(cors());

// Global MongoDB Client
const client = new MongoClient(url);
let db = null;

// Initialize Database Connection
async function initializeDatabase() {
    try {
        await client.connect();
        console.log("✅ Connected to MongoDB");
        db = client.db(dbName);
    } catch (err) {
        console.error("❌ MongoDB Connection Error:", err.message);
        process.exit(1); // Stop app if DB connection fails
    }
}

// Middleware to ensure DB connection is ready
function checkDatabaseReady(req, res, next) {
    if (!db) {
        return res.status(500).json({ message: "Database not initialized yet" });
    }
    next();
}

// Root Route - Fetch All Data
app.get("/", checkDatabaseReady, async (req, res) => {
    try {
        const items = await db.collection(collectionName).find().toArray();
        res.json(items);
    } catch (err) {
        console.error("❌ Error Fetching Data:", err.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Health Check Route (Renamed to /health2)
app.get("/health2", (req, res) => {
    res.json({ status: "UP", databaseConnected: !!db });
});

// Start Server After Successful Database Initialization
initializeDatabase()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error("❌ Error During Server Startup:", err.message);
    });

// Graceful Shutdown - Close MongoDB connection
process.on('SIGINT', async () => {
    console.log("🔻 Shutting down server...");
    await client.close();
    console.log("✅ MongoDB connection closed.");
    process.exit(0);
});
