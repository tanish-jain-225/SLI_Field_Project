from flask import Flask, jsonify
from pymongo import MongoClient
import os
import random
import time
import threading
from datetime import datetime
import signal
import sys
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
    Generate current "sensor data". Easily extendable to add new parameters
    """
    ip_address = "192.168.134.175"  # To be updated

    try:
        response = requests.get(f"http://{ip_address}")
        response_data = response.json()

        # If response is a list of items, take the first one
        if isinstance(response_data, list) and response_data:
            # Get the last item in the list - Most recent data which was added in backend server will be available at the end of the list
            item = response_data[-1]
        # If response is a dictionary, use it directly
        elif isinstance(response_data, dict):
            item = response_data
        else:
            raise ValueError("Unexpected response format")

        # Process sensor data
        data = {
            "acceleration_x": item["accX"],
            "acceleration_y": item["accY"],
            "acceleration_z": item["accZ"],
            "acceleration_net": int((item["accX"]**2 + item["accY"]**2 + item["accZ"]**2)**0.5),
            "rotation_x": item["rotX"],
            "rotation_y": item["rotY"],
            "rotation_z": item["rotZ"],
            "jerk": item["jerk"],
        }
        return data

    except Exception as e:
        print(f"Error fetching sensor data: {e}")
        return {
            "acceleration_x": random.randint(0, 100),
            "acceleration_y": random.randint(0, 100),
            "acceleration_z": random.randint(0, 100),
            "acceleration_net": random.randint(0, 100),
            "rotation_x": random.randint(0, 100),
            "rotation_y": random.randint(0, 100),
            "rotation_z": random.randint(0, 100),
            "jerk": random.randint(0, 100),
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
        return None

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
    # Total time taken for code to run is 1.5 seconds
