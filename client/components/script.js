const fetchLink = "https://sli-field-project-backend.vercel.app/";
// const fetchLink = "http://localhost:3000/";

let fetchInterval;
const toggleButton = document.getElementById("toggle-button");
const dataFields = [
  { title: "Load", unit: "kg" },
  { title: "Cost", unit: "USD" },
  { title: "Angle", unit: "°" },
  { title: "Length", unit: "m" }
];

// Initialize UI with default values (0)
function initializeDataSections() {
  const container = document.querySelector("#dynamic-data-container");
  container.innerHTML = ""; // Clear previous data

  dataFields.forEach(({ title, unit }) => {
    const section = document.createElement("div");
    section.id = `${title.toLowerCase()}-section`;
    section.classList.add("mb-3", "border", "p-3", "rounded", "bg-light");

    section.innerHTML = `
      <h5 class="fw-bold">${title}</h5>
      <p class="${title.toLowerCase()}-data fs-5">0 ${unit}</p>
    `;

    container.appendChild(section);
  });
}

// Fetch data from the backend
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

    // Update UI dynamically
    updateDataSection("Load", latestData.load, "kg");
    updateDataSection("Cost", latestData.cost, "USD");
    updateDataSection("Angle", latestData.angle, "°");
    updateDataSection("Length", latestData.lengthbar, "m");

  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

// Function to update an existing data section
function updateDataSection(title, value, unit = "") {
  const section = document.querySelector(`#${title.toLowerCase()}-section`);
  if (section) {
    const dataElement = section.querySelector(`.${title.toLowerCase()}-data`);
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
    fetchData(); // Fetch immediately
    fetchInterval = setInterval(fetchData, 2000); // Fetch every 2 seconds
    toggleButton.textContent = "Stop Reading";
    toggleButton.classList.replace("btn-success", "btn-danger");
    console.log("Fetching started...");
  }
});

// Initialize cards with default values on page load
initializeDataSections();
