from flask import Flask, jsonify, request
from pymongo import MongoClient
import os
import random
import time
import threading
from datetime import datetime
import signal
import sys

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Configuration
app = Flask(__name__)
port = 5000
mongo_uri = os.getenv('MONGO_URI')
db_name = os.getenv('DB_NAME')
collection_name = os.getenv('C_NAME')

# Check if environment variables are set
FETCH_INTERVAL_SEC = 1  # Fetch every 1 seconds

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

def generate_sensor_data():
    """
    Generate current "sensor data". Easily extendable to add new parameters - Arduinio Hardware Programming.
    """

    return {
        "cost": random.uniform(0, 100),
        "load": random.uniform(0, 10),
        "angle": random.uniform(0, 360),
        "lengthbar": random.uniform(0, 100),
        "frequency": random.uniform(0, 1000),
        "pressure": random.uniform(0, 10000),
        "acceleration": random.uniform(0, 100),
        # Add more fields as needed
        # "temperature": random.uniform(0, 100),
        # "humidity": random.uniform(0, 100),
        # "vibration": random.uniform(0, 100),
        # "speed": random.uniform(0, 100),
        # "torque": random.uniform(0, 100),
        # "power": random.uniform(0, 100),
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
        old_docs = collection.find({"_id": {"$ne": result.inserted_id}})

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
                new_data = generate_sensor_data()
                post_data(new_data)
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
    print(f"Server running at http://localhost:{port}")
    start_periodic_data_posting()
    app.run(port=port)
