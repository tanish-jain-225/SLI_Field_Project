# sensor/data.py

# Chained imports
from flask import Flask, jsonify
from pymongo import MongoClient
from datetime import datetime
from dotenv import load_dotenv

# Standard library imports
import os
import random
import time
import threading
import requests

# Load environment variables
load_dotenv()

# Configuration
app = Flask(__name__)

# Environment Variables (with sensible defaults and parsing)
mongo_uri = os.getenv('MONGO_URI')
db_name = os.getenv('DB_NAME')
collection_name = os.getenv('C_NAME')
PORT = int(os.getenv('PORT'))
INTERVAL = float(os.getenv('INTERVAL'))

# Global MongoDB Client (reused for efficiency)
client = None

# ======================== MongoDB Connection ========================


def connect_to_mongodb():
    global client
    if not client:
        try:
            # Use short timeouts so failures are detected quickly
            client = MongoClient(
                mongo_uri,
                serverSelectionTimeoutMS=5000,
                socketTimeoutMS=5000,
            )
            print("Connected to MongoDB.")
        except Exception as e:
            # Don't exit the entire process here; raise so caller can decide how to handle
            print(f"MongoDB Connection Failed: {e}")
            raise
    return client[db_name]

# ======================== Data Handling Functions ========================


def post_sensor_data():
    """
    Generate current "sensor data". Easily extendable to add new parameters
    """
    # Fetch real sensor data from the device
    # ip_address = "192.168.134.175"  # To be updated

    # try:
    #     response = requests.get(f"http://{ip_address}")
    #     response_data = response.json()

    #     # If response is a list of items, take the first one
    #     if isinstance(response_data, list) and response_data:
    #         # Get the last item in the list - Most recent data which was added in backend server will be available at the end of the list
    #         item = response_data[-1]
    #     # If response is a dictionary, use it directly
    #     elif isinstance(response_data, dict):
    #         item = response_data
    #     else:
    #         raise ValueError("Unexpected response format")

    #     # Process sensor data
    #     data = {
    #         "acceleration_x": item["accX"],
    #         "acceleration_y": item["accY"],
    #         "acceleration_z": item["accZ"],
    #         "acceleration_net": int((item["accX"]**2 + item["accY"]**2 + item["accZ"]**2)**0.5),
    #         "rotation_x": item["rotX"],
    #         "rotation_y": item["rotY"],
    #         "rotation_z": item["rotZ"],
    #         "jerk": item["jerk"],
    #     }
    #     return data

    # except Exception as e:
    #     print(f"Error fetching sensor data: {e}")
    #     return {
    #         "acceleration_x": random.randint(0, 10),
    #         "acceleration_y": random.randint(0, 10),
    #         "acceleration_z": random.randint(0, 10),
    #         "acceleration_net": random.randint(0, 10),
    #         "rotation_x": random.randint(0, 10),
    #         "rotation_y": random.randint(0, 10),
    #         "rotation_z": random.randint(0, 10),
    #         "jerk": random.randint(0, 10),
    #     }

    # Fallback to random data generation
    return {
        "acceleration_x": random.randint(0, 10),
        "acceleration_y": random.randint(0, 10),
        "acceleration_z": random.randint(0, 10),
        "acceleration_net": random.randint(0, 10),
        "rotation_x": random.randint(0, 10),
        "rotation_y": random.randint(0, 10),
        "rotation_z": random.randint(0, 10),
        "jerk": random.randint(0, 10),
        # "angle": random.randint(0, 10),  # Example of adding new parameter
    }


def post_data(data):
    """
    Posts sensor data to MongoDB, logs it, and deletes all older documents.
    Keeps only the latest inserted data.
    """
    try:
        db = connect_to_mongodb()
        collection = db[collection_name]

        # Use UTC ISO timestamp (string) to preserve portability
        data["timestamp"] = datetime.utcnow().isoformat()  # Add timestamp

        # Insert new data
        result = collection.insert_one(data)
        print("Inserted New Data:", data)

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
    Posts new sensor data every 1 seconds.
    """
    def post_data_periodically():
        # Use a resilient loop that posts immediately then sleeps the remainder of the interval.
        min_interval = max(0.1, float(INTERVAL))
        backoff = 1.0
        while True:
            start_time = time.time()
            try:
                new_data = post_sensor_data()
                post_data(new_data)
                # Reset backoff on success
                backoff = 1.0
            except Exception as e:
                # Log and apply exponential backoff, but keep the thread alive
                print(f"Failed to post data periodically: {e}")
                time.sleep(min(5, backoff))
                backoff = min(60, backoff * 2)
                # after backoff, continue to next iteration
            # Sleep the remainder of the interval (if any)
            elapsed = time.time() - start_time
            to_sleep = min_interval - elapsed
            if to_sleep > 0:
                time.sleep(to_sleep)

    thread = threading.Thread(target=post_data_periodically, daemon=True)
    thread.start()

# ======================== Graceful Shutdown ========================


# Shutdown mechanism intentionally removed so the sensor keeps posting data
# The script is designed to run continuously and will not exit on signals.

# ======================== Health Check Endpoint (Optional) ========================


@app.route("/", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "message": "Server is running smoothly."}), 200

# ======================== Start Server ========================


if __name__ == "__main__":
    print(f"Server running at http://localhost:{PORT}")
    start_periodic_data_posting()
    app.run(port=int(PORT))
    # Total time taken for code to run is 1.5 seconds
