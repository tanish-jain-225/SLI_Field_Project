from flask import Flask, jsonify
from pymongo import MongoClient
import os
import random
import time
import threading
from datetime import datetime
import signal
import sys

import json
import requests

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Configuration
app = Flask(__name__)
PORT = 5000
mongo_uri = os.getenv('MONGO_URI')
db_name = os.getenv('DB_NAME')
collection_name = os.getenv('C_NAME')

# Check if environment variables are set
FETCH_INTERVAL_SEC = 1  # Fetch every 1 seconds - Used for testing

# Global MongoDB Client (reused for efficiency)
client = None

# ======================== MongoDB Connection ========================


def connect_to_mongodb():
    global client
    if not client:
        try:
            client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
            print("Connected to MongoDB.")
        except Exception as e:
            print(f"MongoDB Connection Failed: {e}")
            sys.exit(1)
    return client[db_name]

# ======================== Data Handling Functions ========================


def post_sensor_data():
    """
    Generate current "sensor data". Easily extendable to add new parameters - Arduino Hardware Programming.
    Returns data from localhost if available, otherwise generates random data as fallback.
    """

    # Try to get data from localhost - Localhost Version
    
    # Fallback to random data if localhost request fails
    return {
        "acceleration-x": random.uniform(0, 100),
        "acceleration-y": random.uniform(0, 100),
        "acceleration-z": random.uniform(0, 100),
        "acceleration-net": random.uniform(0, 100),
        "jerk": random.uniform(0, 100),
        # Add more fields as needed if required
    }


def post_data(data):
    """
    Posts sensor data to MongoDB, logs it, and deletes all older documents.
    Keeps only the latest inserted data.
    """
    try:
        db = connect_to_mongodb()
        collection = db[collection_name]

        data["timestamp"] = datetime.utcnow().isoformat()  # Add timestamp

        # Insert new data
        result = collection.insert_one(data)
        print("Data Inserted:", data)

        # Fetch and delete all previous documents
        # old_docs = collection.find({"_id": {"$ne": result.inserted_id}})

        # Optionally remove the old documents
        # Uncomment the next lines to delete all previous documents
        # old_docs_list = list(old_docs)
        # if old_docs_list:
        #     print("Deleting Previous Documents:")
        #     for doc in old_docs_list:
        #         print(doc)
        #     delete_result = collection.delete_many({"_id": {"$ne": result.inserted_id}})
        #     print(f"Deleted {delete_result.deleted_count} old document(s).")
        # else:
        #     print("No previous documents to delete.")

    except Exception as e:
        print(f"Error inserting data: {e}")

# ======================== Initialization & Periodic Data Posting ========================


def start_periodic_data_posting():
    """
    Posts new sensor data every 2 seconds.
    """
    def post_data_periodically():
        while True:
            try:
                new_data = post_sensor_data()
                post_data(new_data)
                # Can be removed to make it faster - Later if needed
                time.sleep(FETCH_INTERVAL_SEC)
            except Exception as e:
                print(f"Failed to post data periodically: {e}")
                sys.exit(1)

    thread = threading.Thread(target=post_data_periodically, daemon=True)
    thread.start()

# ======================== Graceful Shutdown ========================


def shutdown(reason):
    print(f"Shutting down server: {reason}")
    if client:
        client.close()
        print("MongoDB connection closed.")
    sys.exit(0)


def signal_handler(sig, frame):
    shutdown(f"Signal {sig} received")


signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

# ======================== Health Check Endpoint (Optional) ========================


@app.route("/", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "message": "Server is running smoothly."}), 200

# ======================== Start Server ========================


if __name__ == "__main__":
    print(f"Server running at http://localhost:{PORT}")
    start_periodic_data_posting()
    app.run(port=PORT)
