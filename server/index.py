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


# Routes 
@app.route("/", methods=["GET"])
def get_items():
    try:
        # Connect to MongoDB each time the route is called
        mongo_uri = os.getenv("MONGO_URI")
        db_name = os.getenv("DB_NAME")
        collection_name = os.getenv("C_NAME")

        client = MongoClient(mongo_uri)
        db = client[db_name]
        collection = db[collection_name]

        # Fetch and serialize items
        items = list(collection.find())
        for item in items:
            item["_id"] = str(item["_id"])  # Convert ObjectId to string for JSON - Takes 0.5 seconds
        return jsonify(items) # Return the items as JSON - Takes 0.5 seconds
    except Exception as e:
        print(f"Error fetching data: {e}")
        return jsonify({"message": "Internal server error"}), 500

# Start the Server Only After Database is Initialized
if __name__ == "__main__":
    app.run(port=PORT) # Time taken to start the server is 0.5 seconds
    # Total time taken for code to run is 1.5 seconds
