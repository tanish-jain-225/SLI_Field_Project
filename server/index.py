# server/index.py

from flask import Flask, Response, request, jsonify, render_template
from pymongo import MongoClient
from flask_cors import CORS
from dotenv import load_dotenv
from bson import json_util

import os
import logging

# Load environment variables
load_dotenv()

# App configuration
app = Flask(__name__)
CORS(app)

# Read environment variables once
PORT = int(os.getenv("PORT"))
mongo_uri = os.getenv("MONGO_URI")
db_name = os.getenv("DB_NAME")
collection_name = os.getenv("C_NAME")

# Global lazy MongoDB client
client = None


def get_mongo_client():
    """Return a singleton MongoClient with sensible timeouts."""
    global client
    if client is None:
        if not mongo_uri:
            raise RuntimeError("MONGO_URI not set in environment")
        # Use short timeouts so failures are fast (adjust as needed)
        client = MongoClient(
            mongo_uri,
            serverSelectionTimeoutMS=5000,
            socketTimeoutMS=5000,
        )
    return client


@app.route("/", methods=["GET"])
def serve_index():
    """Serve the frontend index.html from the server folder.

    If you need the JSON API, use the `/data` endpoint.
    """
    try:
        return render_template("index.html")
    except Exception:
        app.logger.exception("Error serving index.html")
        return jsonify({"message": "Not found"}), 404


@app.route("/data", methods=["GET"])
def get_items():
    """Return documents from the configured collection as JSON.

    This was previously exposed at `/`. It is intentionally available at
    `/data` so the root can serve the frontend.
    """
    try:
        # Initialize client lazily and get collection
        mongo = get_mongo_client()
        db = mongo[db_name]
        collection = db[collection_name]

        # Return all documents (no limit) — prefer most recent if timestamp exists
        try:
            cursor = collection.find().sort("timestamp", -1)
        except Exception:
            cursor = collection.find()

        # Serialize using bson.json_util to handle ObjectId and datetimes
        docs = list(cursor)
        return Response(json_util.dumps(docs), mimetype="application/json")
    except Exception:
        app.logger.exception("Error fetching data")
        return jsonify({"message": "Internal server error"}), 500

@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint to verify server is running."""
    try:
        return jsonify({"status": "ok"}), 200
    except Exception:
        return jsonify({"status": "error"}), 500

if __name__ == "__main__":
    app.run(port=int(PORT))
