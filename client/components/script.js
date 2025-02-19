const fetchLink = "https://sli-field-project-backend.vercel.app/";
// const fetchLink = "http://localhost:3000/";

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

    // Safely handle the latest data
    const latestData = data[data.length - 1];

    // Update dynamic sections
    createOrUpdateSection("Load", latestData.load);
    createOrUpdateSection("Cost", latestData.cost);
    createOrUpdateSection("Angle", latestData.angle);
    createOrUpdateSection("Length", latestData.lengthbar);

  } catch (error) {
    console.error("Error fetching data:", error);

    // Handle error by showing default values
    createOrUpdateSection("Load", "0");
    createOrUpdateSection("Cost", "0");
    createOrUpdateSection("Angle", "0");
    createOrUpdateSection("Length", "0");
  }
}

// Function to create or update a section dynamically
function createOrUpdateSection(title, value) {
  let section = document.querySelector(`#${title.toLowerCase()}-section`);

  if (!section) {
    const container = document.querySelector("#dynamic-data-container");

    // Create new section
    const newSection = document.createElement("div");
    newSection.id = `${title.toLowerCase()}-section`;
    newSection.classList.add("mb-3");
    newSection.innerHTML = `
            <h5 class="fw-bold">${title}</h5>
            <p class="${title.toLowerCase()}-data border p-2 bg-light">${value}</p>
        `;

    container.appendChild(newSection);
  } else {
    // Update existing section
    const dataElement = section.querySelector(`.${title.toLowerCase()}-data`);
    dataElement.textContent = value;
  }
}

// Fetch data initially
fetchData();

// Fetch data every 2 seconds
setInterval(fetchData, 2000);
