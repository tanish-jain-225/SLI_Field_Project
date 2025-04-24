// Configurable Fetch URL - auto switch based on environment
const fetchLink = window.location.hostname === "localhost" ?
    "http://localhost:3000" : // Localhost URL
    "https://sli-field-project-backend.vercel.app/"; // Production URL
    

// Fetch Interval Controller
let fetchInterval;
const FETCH_INTERVAL_MS = 1000; // Fetch every 1 seconds

// HTML Element References
const toggleButton = document.getElementById("toggle-button");
const container = document.querySelector("#dynamic-data-container");
const lastUpdatedElement = document.getElementById("last-updated");

// List of Data Fields - Add more fields here easily
const dataFields = [
    { key: "load", title: "Load", unit: "kg" },
    { key: "cost", title: "Cost", unit: "USD" },
    { key: "angle", title: "Angle", unit: "Deg" },
    { key: "lengthbar", title: "Length", unit: "m" },
    { key: "frequency", title: "Frequency", unit: "hz" },
    { key: "pressure", title: "Pressure", unit: "bar" },
    { key: "acceleration", title: "Acceleration", unit: "m/s²" },
    // Add more fields as needed
    // { key: "temperature", title: "Temperature", unit: "°C" },
    // { key: "humidity", title: "Humidity", unit: "%" },
    // { key: "vibration", title: "Vibration", unit: "m/s²" },
    // { key: "speed", title: "Speed", unit: "m/s" },
    // { key: "torque", title: "Torque", unit: "Nm" },
    // { key: "power", title: "Power", unit: "W" }
];

// Initialize UI with default (0) values
function initializeDataSections() {
    container.innerHTML = ""; // Clear existing
    dataFields.forEach(field => createDataSection(field));
}

// Create a data section
function createDataSection({ key, title, unit }) {
    const section = document.createElement("div");
    section.id = `${key}-section`;
    section.classList.add("mb-3", "border", "p-3", "rounded", "bg-light");

    section.innerHTML = `
        <h5 class="fw-bold">${title}</h5>
        <p class="${key}-data fs-5">0 ${unit}</p>
    `;

    container.appendChild(section);
}

// Fetch data from backend and update UI
async function fetchData() {
    try {
        const response = await fetch(fetchLink);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        // Handle both array and object responses
        const latestData = Array.isArray(data) ? data[data.length - 1] : data;

        // Update all fields dynamically
        dataFields.forEach(({ key, unit }) => {
            updateDataSection(key, latestData[key] ?? 0, unit);
        });

    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

// Update a data section's value
function updateDataSection(key, value, unit = "") {
    const section = document.querySelector(`#${key}-section`);
    if (section) {
        const dataElement = section.querySelector(`.${key}-data`);
        dataElement.textContent = `${value} ${unit}`;
    }
}

// Toggle start/stop fetching
toggleButton.addEventListener("click", () => {
    if (fetchInterval) {
        // Stop fetching and reset to zero
        clearInterval(fetchInterval);
        fetchInterval = null;
        initializeDataSections();

        toggleButton.textContent = "Start";
        toggleButton.classList.replace("btn-danger", "btn-success");
        console.log("Fetching stopped. Data reset to 0.");
    } else {
        // Reset UI to zero and start fetching
        initializeDataSections();
        fetchData(); // Fetch immediately
        fetchInterval = setInterval(fetchData, FETCH_INTERVAL_MS);

        toggleButton.textContent = "Stop Reading";
        toggleButton.classList.replace("btn-success", "btn-danger");
        console.log("Fetching started...");
    }
});

// Initialize on page load
initializeDataSections();
