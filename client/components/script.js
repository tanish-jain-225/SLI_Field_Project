const fetchLink = 'https://sli-field-project-backend.vercel.app/';

async function fetchData() {
    try {
        const response = await fetch(fetchLink);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        // Safely handle the data structure
        const latestData = data[data.length - 1];

        // Dynamically create the content sections - Sends All Parametrs dynamically 
        createOrUpdateSection('Load', latestData.load);
        createOrUpdateSection('Cost', latestData.cost);
        createOrUpdateSection('Angle', latestData.angle);
        createOrUpdateSection('Length', latestData.lengthbar);
    } catch (error) {
        console.error('Error fetching data:', error);
        // Display default values in case of error - handles the error dynamically
        createOrUpdateSection('Load', '--');
        createOrUpdateSection('Cost', '--');
        createOrUpdateSection('Angle', '--');
        createOrUpdateSection('Length', '--');
    }
}

// Function to create or update a section dynamically
function createOrUpdateSection(title, value) {
    // Check if the section already exists
    let section = document.querySelector(`#${title.toLowerCase()}-section`);

    // If the section doesn't exist, create it
    if (!section) {
        const container = document.querySelector('#dynamic-data-container');

        // Create the new section container
        const newSection = document.createElement('div');
        newSection.id = `${title.toLowerCase()}-section`;
        newSection.classList.add('mb-3');
        newSection.innerHTML = `
            <h5 class="fw-bold">${title}</h5>
            <p class="${title.toLowerCase()}-data border p-2 bg-light">${value}</p>
        `;

        // Append the new section to the container
        container.appendChild(newSection);
    } else {
        // If the section exists, update its value
        const dataElement = section.querySelector(`.${title.toLowerCase()}-data`);
        dataElement.textContent = value;
    }
}

// Call the function initially
fetchData();

// Fetch data every 2 seconds
setInterval(fetchData, 2000);
