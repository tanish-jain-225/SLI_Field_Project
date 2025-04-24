from flask import Flask, jsonify
from pymongo import MongoClient
from flask_cors import CORS
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
app = Flask(__name__)
CORS(app)  # Enable CORS
PORT = 3000
mongo_uri = os.getenv("MONGO_URI")
db_name = os.getenv("DB_NAME")  # Your MongoDB database name
collection_name = os.getenv("C_NAME")  # The collection where data will be saved
client = MongoClient(mongo_uri)

db = None

# Initialize Database
def initialize_database():
    global db
    try:
        client.admin.command('ping')  # Test MongoDB connection
        print("Connected to MongoDB!")
        db = client[db_name]
    except Exception as e:
        print(f"Failed to connect to MongoDB: {e}")
        exit(1)  # Exit the process if database connection fails

# Routes
@app.route("/", methods=["GET"])
def get_items():
    if db is None:  # Explicitly check if db is None
        return jsonify({"message": "Database not initialized yet"}), 500
    try:
        items = list(db[collection_name].find())
        for item in items:
            item["_id"] = str(item["_id"])  # Convert ObjectId to string for JSON serialization
        return jsonify(items)
    except Exception as e:
        print(f"Error fetching data: {e}")
        return jsonify({"message": "Internal server error"}), 500

# Start the Server Only After Database is Initialized
if __name__ == "__main__":
    initialize_database()
    app.run(port=PORT)
