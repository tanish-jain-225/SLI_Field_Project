// Configurable Fetch URL
// const fetchLink = "http://localhost:3000/";
const fetchLink = "https://sli-field-project-backend.vercel.app/";

// Fetch Interval Controller
let fetchInterval;

// HTML Element References
const toggleButton = document.getElementById("toggle-button");
const container = document.querySelector("#dynamic-data-container");

// List of Data Fields - Add more fields easily here
// Case Sensitive: key must match the key in the JSON data
// Add more fields as needed with the same structure (key, title, unit) 
const dataFields = [
    { key: "load", title: "Load", unit: "kg" },
    { key: "cost", title: "Cost", unit: "USD" },
    { key: "angle", title: "Angle", unit: "Deg" },
    { key: "lengthbar", title: "Length", unit: "m" },
    { key: "frequency", title: "Frequency", unit: "hz" }, 
    { key: "pressure", title: "Pressure", unit: "bar" }, 
];

// Initialize UI with default values (0) for all fields
function initializeDataSections() {
    container.innerHTML = ""; // Clear previous data
    dataFields.forEach(field => createDataSection(field));
}

// Create a section for each data field
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
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error("No valid data received");
        }

        // Get the latest data entry
        const latestData = data[data.length - 1];

        // Update UI for all fields dynamically
        dataFields.forEach(({ key, unit }) => {
            updateDataSection(key, latestData[key] ?? 0, unit);
        });

    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

// Update a data section for a specific field
function updateDataSection(key, value, unit = "") {
    const section = document.querySelector(`#${key}-section`);
    if (section) {
        const dataElement = section.querySelector(`.${key}-data`);
        dataElement.textContent = `${value} ${unit}`;
    }
}

// Toggle start/stop fetching data
toggleButton.addEventListener("click", () => {
    if (fetchInterval) {
        // Stop fetching
        clearInterval(fetchInterval);
        fetchInterval = null;

        // Reset all data to 0 when stopped
        initializeDataSections();

        toggleButton.textContent = "Start";
        toggleButton.classList.replace("btn-danger", "btn-success");
        console.log("Fetching stopped. Data reset to 0.");
    } else {
        // First reset all data to zero BEFORE starting
        initializeDataSections();

        // Fetch immediately after reset
        fetchData();

        // Start periodic fetching every 2 seconds
        fetchInterval = setInterval(fetchData, 2000);

        toggleButton.textContent = "Stop Reading";
        toggleButton.classList.replace("btn-success", "btn-danger");
        console.log("Fetching started...");
    }
});


// Initialize UI on page load
initializeDataSections();
