## SLI Field Project

This repository contains a small field-data web application used for collecting, storing, and visualizing sensor-like data (crane/example data). It includes three main components:

- `server/` — Flask-based backend that serves stored MongoDB documents over a GET `/` endpoint.
- `sensor/` — A small Python service (`data.py`) that simulates or reads sensor data and posts it to MongoDB periodically.
- `client/` — Static frontend (HTML/JS) that displays live data, a chart, and operator/cost analysis.

This README documents how to run the components locally, the environment variables they use, and recent improvements made to the code.

---

## Repository layout

```
Readme.md
client/
  index.html
  vercel.json
  components/
    script.js
sensor/
  data.py
  requirements.txt
server/
  index.py
  requirements.txt
  vercel.json
```

## Quick start (recommended)

Prerequisites:

- Python 3.8+ (for `server/` and `sensor/`)
- A running MongoDB instance (local or Atlas)
- Optional: a browser to open `client/index.html` or a simple static server

1. Create a `.env` file in `server/` and `sensor/` (or set environment variables) with at least:

```
MONGO_URI=mongodb://<user>:<pass>@host:port/?retryWrites=true&w=majority
DB_NAME=<your_db_name>
C_NAME=<collection_name>
PORT=5000         # optional override
INTERVAL=1        # (sensor) seconds between posts, default 1
```

2. Install server dependencies and run the backend:

```powershell
cd server
python -m pip install -r requirements.txt
python index.py
```

By default the server listens on `0.0.0.0:5000` (or the port you set in `PORT`). The server exposes a single GET `/` endpoint which returns recent documents (supports a `?limit=` query parameter).

3. Install and run the sensor (simulator/uploader):

```powershell
cd sensor
python -m pip install -r requirements.txt
python data.py
```

The sensor script periodically posts simulated sensor documents into the configured MongoDB collection. INTERVAL controls how often (seconds). Logs show inserted document ids.

4. Run the client frontend:

- Quick (static): open `client/index.html` directly in a browser — useful for layout checks.
- Better (emulate server environment & fetch): serve the client folder so fetch requests work:

```powershell
# from repo root
python -m http.server 5500
# then open http://localhost:5500/client/index.html
```

The frontend's fetch URL (`client/components/script.js`) will point to the deployed backend by default. If you run locally, the script auto-detects `localhost` and uses `http://localhost:3000` for legacy setups; update `fetchLink` if your backend is on another port.

---

## Environment variables (summary)

- MONGO_URI — MongoDB connection string (required for server & sensor).
- DB_NAME — Database name to use.
- C_NAME — Collection name.
- PORT — Port to run the Flask apps on (default 5000 in both `server/index.py` and `sensor/data.py`).
- INTERVAL — (sensor) Seconds between posts (default 1.0).

Store these in `.env` files in `server/` and `sensor/` or provide them as environment variables.

## Recent code analysis & improvements

While reviewing this project the following key optimizations and best-practice improvements were implemented or recommended:

- server/index.py

  - Uses a singleton (lazy) `MongoClient` with sensible timeouts (serverSelectionTimeoutMS/socketTimeoutMS) — avoids reconnecting per request.
  - Serializes MongoDB results using `bson.json_util.dumps()` (handles ObjectId and datetimes) instead of manual per-document conversion.
  - Supports `?limit=` query parameter with safe bounds to avoid returning huge datasets.

- sensor/data.py

  - Parses `INTERVAL` as a float and defaults it to 1.0 seconds.
  - Posts data immediately and sleeps the remainder of the interval (previously it slept before posting, adding an extra delay).
  - Uses MongoClient timeouts and no longer exits the process on transient DB errors — thread uses exponential backoff and keeps retrying.
  - Logs only minimal info for high-frequency runs (inserted id instead of full payload).

- client/
  - `client/index.html` has been updated to a fully responsive layout (fluid containers, responsive chart container, lazy-loaded image, deferred scripts to avoid blocking page parse).
  - `client/components/script.js` implements a robust fetch loop, UI initialization, chart updates, and operator skill calculation (jerk and acceleration are used as inputs for skill percentage).

These changes improve performance (lower latency, reduced CPU work), robustness (timeouts, retry/backoff), and UX (responsive frontend, non-blocking scripts).

## Notes, diagnostics & troubleshooting

- If you see long delays when calling the server endpoint, ensure MongoDB is reachable and not returning extremely large result sets. Use `?limit=50` during testing.
- If the sensor thread doesn't insert data:
  - Check `MONGO_URI` and that the DB is reachable.
  - Confirm `INTERVAL` is set to a sensible value (e.g., 1).
- For production usage consider:
  - Using authentication and restricted network access for MongoDB.
  - Enabling pagination or cursor-based requests in the API for large datasets.
  - Replacing the sensor insert pattern with `replace_one(..., upsert=True)` if you only need one current document.

## Suggested next steps

- Add simple integration tests that create a temporary test database, run the sensor to insert a few documents, then call the server endpoint to verify responses.
- Add a small README per component (server/ and sensor/) describing env variables and examples.
- Consider adding Dockerfiles for each component to make local testing reproducible.

---

If you'd like, I can also:

- Add pagination/NDJSON streaming to the server endpoint for very large datasets.
- Patch `client/components/script.js` to add fetch timeouts and a temporary offline indicator.
- Add a `README` in `server/` and `sensor/` with step-by-step local dev instructions.

Happy to make any of those follow-ups — tell me which you'd prefer.
