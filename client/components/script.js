// Configurable Fetch URL - auto switch based on environment
const fetchLink = window.location.hostname === "localhost" ?
    "http://localhost:3000" : // Localhost URL
    "https://sli-field-project-backend.vercel.app"; // Production URL

// Fetch Interval Controller
let fetchInterval;
const FETCH_INTERVAL_MS = 1000; // Fetch every 1 second

// HTML Element References
const toggleButton = document.getElementById("toggle-button");
const container = document.querySelector("#dynamic-data-container");
const lastUpdatedElement = document.getElementById("last-updated");
const costReceiptElement = document.getElementById("cost-receipt");
const operatorFeedbackElement = document.getElementById("operator-feedback");

// Time and cost tracking
let startTime = null;
let usageData = [];
const HOURLY_RATE = 1000; // Rs. 150 per hour crane rental
const MINIMUM_CHARGE = 500; // Rs. 50 minimum charge

// List of Data Fields - Add more fields here easily
const dataFields = [
    // Sensor Data
    { key: "acceleration_x", title: "Acceleration-X", unit: "m/s²" },
    { key: "acceleration_y", title: "Acceleration-Y", unit: "m/s²" },
    { key: "acceleration_z", title: "Acceleration-Z", unit: "m/s²" },
    { key: "acceleration_net", title: "Net Acceleration", unit: "m/s²" },
    { key: "rotation_x", title: "Rotation-X", unit: "m/s" },
    { key: "rotation_y", title: "Rotation-Y", unit: "m/s" },
    { key: "rotation_z", title: "Rotation-Z", unit: "m/s" },
    { key: "jerk", title: "Jerk", unit: "m/s" },

    // Add more fields as needed - Optional
    // { key: "cost", title: "Cost", unit: "USD" },
    // { key: "load", title: "Load", unit: "kg" },
    // { key: "angle", title: "Angle", unit: "Deg" },
    // { key: "lengthbar", title: "Length", unit: "m" },
    // { key: "frequency", title: "Frequency", unit: "hz" },
    // { key: "pressure", title: "Pressure", unit: "bar" },
];

// Graph Configuration
const maxDataPoints = 20; // Maximum number of points on the graph
let chartData = {
    labels: [],
    datasets: dataFields.map((field, index) => ({
        label: field.title,
        data: [],
        borderColor: getChartColor(index),
        backgroundColor: getChartColor(index, 0.2),
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 2
    }))
};

// Chart instance
let chart;

// Get color based on index
function getChartColor(index, alpha = 1) {
    const colors = [
        `rgba(255, 99, 132, ${alpha})`,   // Red
        `rgba(54, 162, 235, ${alpha})`,   // Blue
        `rgba(255, 206, 86, ${alpha})`,   // Yellow
        `rgba(75, 192, 192, ${alpha})`,   // Green
        `rgba(153, 102, 255, ${alpha})`,  // Purple
        `rgba(255, 159, 64, ${alpha})`,   // Orange
        `rgba(199, 199, 199, ${alpha})`   // Grey
    ];
    return colors[index % colors.length];
}

// Initialize UI with default (0) values
function initializeDataSections() {
    container.innerHTML = ""; // Clear existing
    dataFields.forEach(field => {
        createDataSection(field);
        updateDataSection(field.key, 0, field.unit); // Explicitly reset data to 0
    });
    updateLastUpdated("Never");
}

// Create a data section
function createDataSection({ key, title, unit }) {
    const section = document.createElement("div");
    section.id = `${key}-section`;
    section.classList.add("mb-2", "border", "p-2", "rounded", "bg-light");

    section.innerHTML = `
        <h5 class="fw-bold">${title}</h5>
        <p class="${key}-data fs-5">0 ${unit}</p>
    `;

    container.appendChild(section);
}

// Update a data section's value
function updateDataSection(key, value, unit = "") {
    const section = document.querySelector(`#${key}-section`);
    if (section) {
        const dataElement = section.querySelector(`.${key}-data`);
        dataElement.textContent = `${value} ${unit}`;
    }
}

// Update the "Last Updated" timestamp
function updateLastUpdated(timestamp) {
    if (lastUpdatedElement) {
        lastUpdatedElement.textContent = `Last Updated: ${timestamp}`;
    }
}

// Initialize chart
function initializeChart() {
    const ctx = document.getElementById('dataChart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (chart) {
        chart.destroy();
    }

    // Reset chart data
    chartData.labels = [];
    chartData.datasets.forEach(dataset => {
        dataset.data = [];
    });

    // Create new chart
    chart = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            animation: {
                duration: 200 // Short animation time - in milliseconds
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Sensor Data Visualization'
                },
                legend: {
                    position: 'top'
                }
            }
        }
    });
}

// Update chart with new data
function updateChart(latestData) {
    // Add timestamp as label
    const now = new Date();
    const timeString = now.getHours().toString().padStart(2, '0') + ':' +
                       now.getMinutes().toString().padStart(2, '0') + ':' +
                       now.getSeconds().toString().padStart(2, '0');
    
    chartData.labels.push(timeString);
    
    // Limit the number of data points
    if (chartData.labels.length > maxDataPoints) {
        chartData.labels.shift();
    }
    
    // Update each dataset with new values
    dataFields.forEach((field, index) => {
        const value = latestData[field.key] ?? 0;
        chartData.datasets[index].data.push(value);
        
        // Limit the number of data points
        if (chartData.datasets[index].data.length > maxDataPoints) {
            chartData.datasets[index].data.shift();
        }
    });
    
    // Store usage data for analysis
    usageData.push({
        timestamp: new Date(),
        ...latestData
    });
    
    // Update chart
    if (chart) {
        chart.update();
    }
}

// Generate cost receipt based on usage time
function generateCostReceipt() {
    if (!startTime) return;
    
    const endTime = new Date();
    const usageTimeMs = endTime - startTime;
    const usageTimeMinutes = usageTimeMs / (1000 * 60);
    const usageTimeHours = usageTimeMinutes / 60;
    
    // Calculate cost (minimum charge or hourly rate)
    const calculatedCost = Math.max(MINIMUM_CHARGE, usageTimeHours * HOURLY_RATE);
    const formattedCost = calculatedCost.toFixed(2);
    
    // Format dates for receipt
    const startTimeFormatted = startTime.toLocaleString();
    const endTimeFormatted = endTime.toLocaleString();
    
    // Create receipt HTML with flexbox layout
    const receiptHTML = `
        <div class="mt-3 border p-2 rounded bg-light">
            <h4 class="text-center border-bottom pb-2 mb-3">Crane Usage Receipt</h4>
            
            <div class="d-flex flex-wrap justify-content-between">
                <div class="flex-fill mb-2 w-[100%] p-1">
                    <div class="p-2 border rounded h-100 w-[100%]">
                        <div class="fw-bold mb-1">Start Time</div>
                        <div class="text-break">${startTimeFormatted}</div>
                    </div>
                </div>
                <div class="flex-fill mb-2 w-[100%] p-1">
                    <div class="p-2 border rounded h-100 w-[100%]">
                        <div class="fw-bold mb-1">End Time</div>
                        <div class="text-break">${endTimeFormatted}</div>
                    </div>
                </div>
            </div>
            
            <div class="d-flex flex-wrap mt-2 justify-content-between">
                <div class="flex-fill mb-2 w-[100%] p-1">
                    <div class="p-2 border rounded h-100 w-[100%]">
                        <div class="fw-bold mb-1">Total Usage</div>
                        <div>${usageTimeHours.toFixed(2)} hours</div>
                    </div>
                </div>
                <div class="flex-fill mb-2 w-[100%] p-1">
                    <div class="p-2 border rounded h-100 w-[100%]">
                        <div class="fw-bold mb-1">Rate</div>
                        <div>Rs. ${HOURLY_RATE.toFixed(2)}/hour</div>
                    </div>
                </div>
            </div>
            
            <div class="mt-3 p-2 border rounded text-center">
                <div class="fw-bold">Total Cost</div>
                <div class="fs-4 text-success">Rs. ${formattedCost}</div>
                <div class="text-muted small mt-2">
                    <em>Note: Minimum charge of Rs. ${MINIMUM_CHARGE.toFixed(2)} applies</em>
                </div>
            </div>
        </div>
    `;
    
    // Display receipt in the designated element
    if (costReceiptElement) {
        costReceiptElement.innerHTML = receiptHTML;
    }
}

// Generate operator feedback based on usage data
function generateOperatorFeedback() {
    if (usageData.length === 0) return;
    
    // Analyze acceleration and jerk data
    const accelerationStats = analyzeAccelerationData();
    const jerkStats = analyzeJerkData();
    
    // Determine operator skill level based on analysis
    const skillLevel = calculateSkillLevel(accelerationStats, jerkStats);
    
    // Create feedback HTML with flexbox layout
    const feedbackHTML = `
        <div class="mt-3 border p-2 rounded bg-light">
            <h4 class="text-center border-bottom pb-2 mb-3">Operator Performance</h4>
            <div class="row mb-3">
                <div class="col-12">
                    <div class="progress">
                        <div class="progress-bar bg-${getSkillColor(skillLevel)}" 
                             role="progressbar" 
                             style="width: ${skillLevel}%" 
                             aria-valuenow="${skillLevel}" 
                             aria-valuemin="0" 
                             aria-valuemax="100">
                            ${skillLevel}%
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="d-flex flex-wrap">
                <div class="flex-fill mb-2 me-2">
                    <div class="p-2 border rounded h-100">
                        <div class="fw-bold mb-1">Skill Rating</div>
                        <div class="fs-5 text-${getSkillColor(skillLevel)}">${getSkillRating(skillLevel)}</div>
                    </div>
                </div>
                <div class="flex-fill mb-2 me-2">
                    <div class="p-2 border rounded h-100">
                        <div class="fw-bold mb-1">Max Acceleration</div>
                        <div class="fs-5">${accelerationStats.max.toFixed(2)} m/s²</div>
                    </div>
                </div>
                <div class="flex-fill mb-2">
                    <div class="p-2 border rounded h-100">
                        <div class="fw-bold mb-1">Max Jerk</div>
                        <div class="fs-5">${jerkStats.max.toFixed(2)} m/s³</div>
                    </div>
                </div>
            </div>
            
            <div class="row mt-3">
                <div class="col-12">
                    <div class="p-2 border rounded">
                        <strong>Feedback:</strong> ${generateFeedbackText(skillLevel, accelerationStats, jerkStats)}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Display feedback in the designated element
    if (operatorFeedbackElement) {
        operatorFeedbackElement.innerHTML = feedbackHTML;
    }
}

// Analyze acceleration data from usage
function analyzeAccelerationData() {
    if (usageData.length === 0) return { max: 0, avg: 0, sudden: 0 };
    
    // Extract net acceleration values
    const accelerations = usageData.map(data => data['acceleration-net'] || 0);
    
    // Calculate statistics
    const max = Math.max(...accelerations);
    const avg = accelerations.reduce((sum, val) => sum + val, 0) / accelerations.length;
    
    // Count sudden changes (values above threshold)
    const threshold = avg * 1.5;
    const sudden = accelerations.filter(value => value > threshold).length;
    
    return { max, avg, sudden };
}

// Analyze jerk data from usage
function analyzeJerkData() {
    if (usageData.length === 0) return { max: 0, avg: 0, sudden: 0 };
    
    // Extract jerk values
    const jerks = usageData.map(data => data['jerk'] || 0);
    
    // Calculate statistics
    const max = Math.max(...jerks);
    const avg = jerks.reduce((sum, val) => sum + val, 0) / jerks.length;
    
    // Count sudden changes (values above threshold)
    const threshold = avg * 1.5;
    const sudden = jerks.filter(value => value > threshold).length;
    
    return { max, avg, sudden };
}

// Calculate operator skill level based on acceleration and jerk statistics
function calculateSkillLevel(accelerationStats, jerkStats) {
    // Base score starts at 100 (perfect)
    let score = 100;
    
    // Reduce score based on sudden accelerations (harsh movements)
    score -= Math.min(30, accelerationStats.sudden * 2);
    
    // Reduce score based on max acceleration relative to average
    const accelRatio = accelerationStats.max / accelerationStats.avg;
    score -= Math.min(20, (accelRatio - 1) * 10);
    
    // Reduce score based on jerk statistics (smoothness of operation)
    score -= Math.min(30, jerkStats.sudden * 2);
    
    // Reduce score based on max jerk relative to average
    const jerkRatio = jerkStats.max / jerkStats.avg;
    score -= Math.min(20, (jerkRatio - 1) * 10);
    
    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, Math.round(score)));
}

// Get color for skill level progress bar
function getSkillColor(skillLevel) {
    if (skillLevel < 40) return 'danger';
    if (skillLevel < 60) return 'warning';
    if (skillLevel < 80) return 'info';
    return 'success';
}

// Get text rating based on skill level
function getSkillRating(skillLevel) {
    if (skillLevel < 40) return 'Needs Training';
    if (skillLevel < 60) return 'Adequate';
    if (skillLevel < 80) return 'Skilled';
    if (skillLevel < 95) return 'Expert';
    return 'Master Operator';
}

// Generate feedback text based on skill level and stats
function generateFeedbackText(skillLevel, accelerationStats, jerkStats) {
    let feedback = '';
    
    if (skillLevel < 40) {
        feedback = 'Operator shows signs of inexperience with jerky and sudden movements. Additional training recommended.';
    } else if (skillLevel < 60) {
        feedback = 'Operator handled the crane with adequate control but could improve on smoothness of operation.';
    } else if (skillLevel < 80) {
        feedback = 'Skilled operation demonstrated with good control. Minor improvements could be made in acceleration management.';
    } else if (skillLevel < 95) {
        feedback = 'Expert handling shown with very smooth operation and excellent control.';
    } else {
        feedback = 'Outstanding crane operation with perfect control and extremely smooth movements.';
    }
    
    // Add specific feedback if there were issues
    if (accelerationStats.sudden > 5) {
        feedback += ' Reduce sudden accelerations for safer operation.';
    }
    
    if (jerkStats.max > jerkStats.avg * 2) {
        feedback += ' Work on maintaining more consistent movement speeds.';
    }
    
    return feedback;
}

// Fetch data from backend and update UI
async function fetchData() {
    // Strict check at the beginning of the function
    if (fetchInterval === null) {
        // console.log("Fetching is stopped. Skipping fetchData call.");
        return;
    }

    try {
        const response = await fetch(fetchLink);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        // Double check again after fetch to ensure we're still supposed to update UI
        if (fetchInterval === null) {
            // console.log("Fetching was stopped during request. Discarding results.");
            return;
        }

        const data = await response.json();
        const latestData = Array.isArray(data) ? data[data.length - 1] : data;

        // Update all fields dynamically
        dataFields.forEach(({ key, unit }) => {
            updateDataSection(key, latestData[key] ?? 0, unit);
        });

        // Update chart with new data
        updateChart(latestData);

        // Update last updated timestamp
        updateLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
        console.error("Error fetching data:", error);
        updateLastUpdated("Error fetching data");
    }
}

// Toggle start/stop fetching
toggleButton.addEventListener("click", async () => {
    toggleButton.disabled = true; // Disable button temporarily

    if (fetchInterval) {
        // Stop fetching - do this FIRST before any other operations
        clearInterval(fetchInterval);
        fetchInterval = null;
        // console.log("Interval cleared:", fetchInterval);

        // Generate cost receipt and operator feedback
        generateCostReceipt();
        generateOperatorFeedback();

        toggleButton.textContent = "Start Reading";
        toggleButton.classList.replace("btn-danger", "btn-success");
        // console.log("Fetching stopped. Data reset to 0.");
    } else {
        // Clear previous reports
        if (costReceiptElement) costReceiptElement.innerHTML = '';
        if (operatorFeedbackElement) operatorFeedbackElement.innerHTML = '';
        
        // Reset usage data and start time
        usageData = [];
        startTime = new Date();
        
        // Reset UI before starting
        initializeDataSections();
        initializeChart();

        // Set interval flag BEFORE first fetch to prevent race conditions
        fetchInterval = true; // Temporary value to indicate fetching is active

        // Default message while fetching data
        operatorFeedbackElement.innerHTML = `<div class="text-center">Analysing Operator Data</div>`; // Show fetching message
        costReceiptElement.innerHTML = `<div class="text-center">Analysing Cost Data</div>`; // Show fetching message

        // Now do the first fetch 
        await fetchData();

        // Only set up the interval if fetching wasn't stopped during the first fetch
        if (fetchInterval !== null) {
            fetchInterval = setInterval(fetchData, FETCH_INTERVAL_MS);
            // console.log("Starting new interval:", fetchInterval);


            toggleButton.textContent = "Stop Reading";
            toggleButton.classList.replace("btn-success", "btn-danger");
            // console.log("Fetching started...");
        }
    }

    toggleButton.disabled = false; // Re-enable button
});

// Initialize everything on page load
function initialize() {
    initializeDataSections();
    initializeChart();
}

// Start everything when the page is loaded
window.addEventListener('DOMContentLoaded', initialize);