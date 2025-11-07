## SLI Field Project

This repository collects, stores and visualizes simple sensor-like (crane) data. It contains three cooperating pieces:

- `server/` — Flask backend that serves the frontend (static files under `server/static/`) and provides a `/data` JSON endpoint.
- `sensor/` — Small Python process (`data.py`) that posts simulated sensor documents to MongoDB periodically.
- `server/static/` — Frontend files (HTML, CSS, JS). The client fetches `/data` from the same origin to show live updates.

This README explains how to run the components locally, what changed recently, and how to deploy the frontend on Vercel.

---

## Repository layout (current)

```
Readme.md
server/
  index.py
  requirements.txt
  vercel.json
  static/
    components/
      script.js
      styles.css
    index.html  # frontend entry (also present at server/templates/index.html)
sensor/
  data.py
  requirements.txt
```

## Quick start (local)

Prerequisites:

- Python 3.8+
- A running MongoDB instance (local or Atlas)

1) Create `.env` files (or export env vars) for both `server/` and `sensor/` with at least:

```
MONGO_URI=mongodb://<user>:<pass>@host:port/?retryWrites=true&w=majority
DB_NAME=<your_db_name>
C_NAME=<collection_name>
PORT=5000         # optional override for Flask server
INTERVAL=1        # (sensor) seconds between posts, default 1.0
```

2) Install and run the server (serves frontend and `/data`):

```powershell
cd server
python -m pip install -r requirements.txt
python index.py
```

Open http://localhost:5000/ — the page will fetch `/data` from the same origin and show live sensor posts.

3) Install and run the sensor poster (simulates or reads sensors and writes to MongoDB):

```powershell
cd sensor
python -m pip install -r requirements.txt
python data.py
```

The sensor posts documents at the configured `INTERVAL`. Ensure the sensor's `.env` (or environment) points to the same `MONGO_URI`, `DB_NAME`, `C_NAME` used by the server.

---

## Key changes since earlier drafts

- Frontend moved into `server/static/` (the Flask server can serve the app at `/`). The client now uses a same-origin `/data` fetch URL by default.
- `server/requirements.txt` trimmed (removed unused `requests`).
- `sensor/data.py` runs as a standalone poster process that only needs `pymongo` + `python-dotenv` (no Flask required). The sensor defaults `INTERVAL` to 1.0s and reuses a single `MongoClient` with short timeouts.
- `vercel.json` at the repo root can route `/` to `server/index.html` so Vercel will serve the static frontend; note that a serverless API (e.g., `api/data.py`) is still needed on Vercel to provide `/data` unless you host the API elsewhere.

## Deployment notes — Vercel

- Vercel serves static files and serverless functions, it does not run persistent Flask processes. To deploy the frontend on Vercel and keep live `/data` working you have two main options:
  1. Deploy the frontend statically on Vercel and add a Python serverless function (e.g., `api/data.py`) that queries MongoDB and returns the latest document(s). Include a root `requirements.txt` so Vercel installs `pymongo`.
  2. Host the Flask server on a VM/container (or another platform that can run persistent servers) and deploy the frontend on Vercel or serve it from the same host.

- The repository contains a `vercel.json` that routes `/` to `server/index.html`. That makes Vercel serve the frontend, but you still need an API function to back `/data`.

Recommendations for a production-friendly API:
- Return only what the client needs (for live UI prefer `find_one(sort=[('timestamp', -1)])` to get the latest document).
- Add pagination or NDJSON streaming if you intend to return large histories.
- Cache or reuse MongoDB connections between warm invocations in serverless functions.

---

## Troubleshooting

- If the client shows no updates, verify that:
  - The sensor is running and inserting documents into the configured collection.
  - The server `/data` endpoint returns JSON (try `curl http://localhost:5000/data`).
- If you see slow responses, use `?limit=50` while debugging to avoid returning huge datasets.

## Next steps (suggested)

- Add `api/data.py` (serverless) and a root-level `requirements.txt` if you want to deploy the API on Vercel.
- Add small per-component READMEs under `server/` and `sensor/` describing env vars and run steps (I can add those).
- Add lightweight integration tests that run the sensor to insert a few documents, then exercise the server `/data` endpoint.

---

If you want, I can implement the Vercel serverless handler (`api/data.py`) and a root `requirements.txt` next so the site on Vercel can fetch live data from MongoDB. Which would you like me to do?
