// Configurable Fetch URL
// const fetchLink = "https://sli-field-project-backend.vercel.app/";
const fetchLink = "http://localhost:3000/";

// Fetch Interval Controller
let fetchInterval;

// HTML Element References
const toggleButton = document.getElementById("toggle-button");
const container = document.querySelector("#dynamic-data-container");

// List of Data Fields - Add more fields easily here
const dataFields = [
    { key: "load", title: "Load", unit: "kg" },
    { key: "cost", title: "Cost", unit: "USD" },
    { key: "angle", title: "Angle", unit: "°" },
    { key: "lengthbar", title: "Length", unit: "m" },
    { key: "frequency", title: "Frequency", unit: "hz" }
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
        clearInterval(fetchInterval);
        fetchInterval = null;

        // Reset all data to 0 when stopped
        initializeDataSections();

        toggleButton.textContent = "Start";
        toggleButton.classList.replace("btn-danger", "btn-success");
        console.log("Fetching stopped. Data reset to 0.");
    } else {
        fetchData(); // Fetch immediately on start
        fetchInterval = setInterval(fetchData, 2000); // Fetch every 2 seconds

        toggleButton.textContent = "Stop Reading";
        toggleButton.classList.replace("btn-success", "btn-danger");
        console.log("Fetching started...");
    }
});

// Initialize UI on page load
initializeDataSections();
