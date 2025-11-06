# server/index.py

from flask import Flask, Response, request, jsonify
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
PORT = int(os.getenv("PORT", 5000))
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
def get_items():
    """Return documents from the configured collection.

    Query params:
      - limit: optional integer to limit number of returned documents (safe bounds).
    """
    try:
        # Initialize client lazily and get collection
        mongo = get_mongo_client()
        db = mongo[db_name]
        collection = db[collection_name]

        # Optional safe limit param
        try:
            limit = int(request.args.get("limit", 100))
        except (TypeError, ValueError):
            limit = 100
        limit = max(1, min(limit, 1000))

        # Prefer returning recent documents if a timestamp field exists, otherwise just limit
        try:
            cursor = collection.find().sort("timestamp", -1).limit(limit)
        except Exception:
            cursor = collection.find().limit(limit)

        # Serialize using bson.json_util to handle ObjectId and datetimes
        docs = list(cursor)
        return Response(json_util.dumps(docs), mimetype="application/json")
    except Exception:
        app.logger.exception("Error fetching data")
        return jsonify({"message": "Internal server error"}), 500


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    app.run(host="0.0.0.0", port=int(PORT))
