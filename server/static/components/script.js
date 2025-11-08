// Configurable Fetch URL - use same-origin `/data` in production or when served
// by your Flask server. Fallback to localhost Flask if developing locally.
const FETCH_LINK = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://localhost:5000/data" // Local Flask server URL when developing locally
    : "https://sli-field-project-web.vercel.app/data"; // Work with your deployed backend URL here

// Configurable Fetch URL - auto switch based on environment

// Get configurable constants from environment or use defaults - Converted to numbers
const FETCH_INTERVAL_MS = 1000; // Fetch interval in milliseconds
const HOURLY_RATE = 1000;      // Hourly rate in Rs.
const MINIMUM_CHARGE = 500;    // Minimum charge in Rs.

// Fetch control state
let isFetching = false;          // boolean flag indicating fetching state
let fetchTimerId = null;        // interval id returned by setInterval
let fetchController = null;     // AbortController for the current fetch
let inFlight = false;           // prevent overlapping fetches


// HTML Element References
const toggleButton = document.getElementById("toggle-button");
const container = document.querySelector("#dynamic-data-container");
const lastUpdatedElement = document.getElementById("last-updated");
const costReceiptElement = document.getElementById("cost-receipt");
const operatorFeedbackElement = document.getElementById("operator-feedback");

// Time and cost tracking
let startTime = null;
let usageData = [];

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
    // { key: "load", title: "Load", unit: "kg" },
    // { key: "angle", title: "Angle", unit: "Deg" },
    // { key: "lengthbar", title: "Length", unit: "m" },
    // { key: "frequency", title: "Frequency", unit: "hz" },
    // { key: "pressure", title: "Pressure", unit: "bar" },
];

// Graph Configuration
// NOTE: removed hard limits on data points so the client will accumulate all data
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
    // Use the app's lightweight `.field-row` card style to avoid relying on Bootstrap
    const section = document.createElement("div");
    section.id = `${key}-section`;
    section.className = 'field-row';

    section.innerHTML = `
        <div class="label">${title}</div>
        <div class="value ${key}-data">0 ${unit}</div>
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

    // No limit on labels — keep all timestamps

    // Update each dataset with new values
    dataFields.forEach((field, index) => {
        const value = latestData[field.key] ?? 0;
        chartData.datasets[index].data.push(value);

        // No limit on dataset length — accumulate all points
    });

    // Store usage data for analysis
    usageData.push({
        timestamp: new Date(),
        ...latestData
    });

    // No cap on usageData — keep full history (be cautious with memory growth)

    // Update chart
    if (chart) {
        chart.update();
    }
}

// Generate cost receipt based on usage time
// Generate cost receipt off the main tick to keep UI responsive
function generateCostReceipt() {
    if (!startTime || !costReceiptElement) return;

    const work = () => {
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

        // Create receipt HTML using flexbox-friendly wrappers for responsive layout
        const receiptHTML = `
            <div class="report-card receipt-card">
                <div class="receipt-body">
                    <div class="receipt-header">
                        <div class="report-title">Crane Usage Receipt</div>
                        <div class="report-sub">Usage period and billing summary</div>
                    </div>
                    <div class="receipt-grid">
                        <div class="receipt-col">
                            <div class="report-item">
                                <div class="label">Start Time</div>
                                <div class="value">${startTimeFormatted}</div>
                            </div>
                            <div class="report-item">
                                <div class="label">Total Usage</div>
                                <div class="value">${usageTimeHours.toFixed(2)} hours</div>
                            </div>
                        </div>

                        <div class="receipt-col">
                            <div class="report-item">
                                <div class="label">End Time</div>
                                <div class="value">${endTimeFormatted}</div>
                            </div>
                            <div class="report-item">
                                <div class="label">Rate</div>
                                <div class="value">Rs. ${HOURLY_RATE.toFixed(2)}/hour</div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <div class="receipt-footer">
                        <div class="footer-left">
                            <div class="label">Total Cost</div>
                            <div class="value total-cost">Rs. ${formattedCost}</div>
                        </div>
                        <div class="footer-right">
                            <div class="report-sub">Minimum charge applies: Rs. ${MINIMUM_CHARGE.toFixed(2)}</div>
                        </div>
                    </div>
                </div>
                </div>

                
            </div>
        `;

        costReceiptElement.innerHTML = receiptHTML;
    };

    // Prefer requestIdleCallback to avoid janking; fallback to setTimeout
    if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(work, { timeout: 200 });
    } else {
        setTimeout(work, 0);
    }
}

// Analyze acceleration data from usage - Optimized version
function analyzeAccelerationData() {
    if (usageData.length === 0) return { max: 0, avg: 0, sudden: 0, variations: 0 };

    // Extract net acceleration values
    const accelerations = usageData.map(data => Number(data.acceleration_net) || 0);

    // Calculate statistics in single pass for better performance
    let max = -Infinity;
    let sum = 0;
    let variations = 0;
    let prevValue = accelerations[0];

    for (let i = 0; i < accelerations.length; i++) {
        const value = accelerations[i];
        max = Math.max(max, value);
        sum += value;

        // Calculate variations (changes in direction)
        if (i > 0 && Math.sign(value - prevValue) !== Math.sign(prevValue - (accelerations[i - 2] || 0))) {
            variations++;
        }
        prevValue = value;
    }

    const avg = sum / accelerations.length;

    // Count sudden changes (values above threshold)
    const threshold = avg * 1.5;
    const sudden = accelerations.filter(value => value > threshold).length;

    return { max, avg, sudden, variations };
}

// Analyze jerk data from usage - Optimized version
function analyzeJerkData() {
    if (usageData.length === 0) return { max: 0, avg: 0, sudden: 0, consistency: 0 };

    // Extract jerk values with proper error handling
    const jerks = usageData.map(data => Number(data.jerk) || 0);

    // Calculate statistics in single pass
    let max = -Infinity;
    let sum = 0;
    let prevDiffs = [];

    for (const value of jerks) {
        max = Math.max(max, value);
        sum += value;
    }

    const avg = sum / jerks.length;

    // Calculate consistency score
    let consistencyScore = 0;
    if (jerks.length > 1) {
        // Calculate standard deviation for consistency measurement
        const squaredDiffs = jerks.map(value => Math.pow(value - avg, 2));
        const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / jerks.length;
        const stdDev = Math.sqrt(variance);

        // Lower standard deviation = higher consistency
        consistencyScore = Math.max(0, 100 - (stdDev / avg * 100));
    }

    // Count sudden changes (values above threshold) - more nuanced threshold
    const threshold = avg * 1.5;
    const sudden = jerks.filter(value => value > threshold).length;

    return {
        max,
        avg,
        sudden,
        consistency: consistencyScore
    };
}

// Calculate operator skill level based on acceleration and jerk statistics - Enhanced version
function calculateSkillLevel(accelerationStats, jerkStats) {
    // Base score starts at 100 (perfect)
    let score = 100;

    // Calculate penalties with diminishing returns for fairer scoring

    // Penalty for sudden accelerations (harsh movements)
    const suddenAccelPenalty = Math.min(25, accelerationStats.sudden * 1.5);

    // Penalty for high acceleration variation
    const accelRatio = accelerationStats.max / (accelerationStats.avg || 1); // Prevent division by zero
    const accelVariationPenalty = Math.min(20, (accelRatio - 1) * 8);

    // Penalty for jerky operation
    const jerkPenalty = Math.min(25, jerkStats.sudden * 1.5);

    // Bonus for consistent operation
    const consistencyBonus = jerkStats.consistency / 10;

    // Calculate final score with all factors
    score -= suddenAccelPenalty;
    score -= accelVariationPenalty;
    score -= jerkPenalty;
    score += consistencyBonus;

    // Add penalty for excessive movement variations
    if (accelerationStats.variations > 0) {
        score -= Math.min(15, accelerationStats.variations * 0.5);
    }

    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, Math.round(score)));
}

// Get color for skill level progress bar - Enhanced with more granular levels
function getSkillColor(skillLevel) {
    if (skillLevel < 30) return 'danger';
    if (skillLevel < 50) return 'warning';
    if (skillLevel < 70) return 'info';
    if (skillLevel < 90) return 'primary';
    return 'success';
}

// Get text rating based on skill level - Enhanced with more levels
function getSkillRating(skillLevel) {
    if (skillLevel < 30) return 'Needs Training';
    if (skillLevel < 50) return 'Adequate';
    if (skillLevel < 70) return 'Skilled';
    if (skillLevel < 85) return 'Expert';
    if (skillLevel < 95) return 'Advanced Expert';
    return 'Master Operator';
}

// Generate feedback text based on skill level and stats - Enhanced with more detailed feedback
function generateFeedbackText(skillLevel, accelerationStats, jerkStats) {
    // Base feedback by skill level
    let feedbackPoints = [];

    if (skillLevel < 30) {
        feedbackPoints.push('Operator shows signs of inexperience with jerky movements.');
        feedbackPoints.push('Additional training is strongly recommended.');
    } else if (skillLevel < 50) {
        feedbackPoints.push('Operator handled the crane with adequate control.');
        feedbackPoints.push('Significant improvements needed in smoothness of operation.');
    } else if (skillLevel < 70) {
        feedbackPoints.push('Skilled operation with good basic control demonstrated.');
        feedbackPoints.push('Some improvements could be made in acceleration management.');
    } else if (skillLevel < 85) {
        feedbackPoints.push('Expert handling shown with smooth operation.');
        feedbackPoints.push('Minor refinements would perfect the technique.');
    } else if (skillLevel < 95) {
        feedbackPoints.push('Advanced expert level operation with excellent control.');
    } else {
        feedbackPoints.push('Outstanding crane operation with perfect control and extremely smooth movements.');
    }

    // Add specific feedback based on metrics
    if (accelerationStats.sudden > 3) {
        feedbackPoints.push(`Reduce sudden accelerations (${accelerationStats.sudden} detected) for safer operation.`);
    }

    if (jerkStats.max > jerkStats.avg * 2) {
        feedbackPoints.push('Work on maintaining more consistent movement speeds.');
    }

    if (accelerationStats.variations > 5) {
        feedbackPoints.push('Too many direction changes detected. Focus on smoother transitions.');
    }

    if (jerkStats.consistency < 50) {
        feedbackPoints.push('Improve motion consistency for better load control.');
    }

    // Join all feedback points with spaces
    return feedbackPoints.join(' ');
}

// Generate operator feedback based on usage data - Optimized UI generation
// Generate operator feedback off the main tick to keep UI responsive
function generateOperatorFeedback() {
    if (usageData.length === 0 || !operatorFeedbackElement) return;

    const work = () => {
        // Analyze acceleration and jerk data
        const accelerationStats = analyzeAccelerationData();
        const jerkStats = analyzeJerkData();

        // Determine operator skill level based on analysis
        const skillLevel = calculateSkillLevel(accelerationStats, jerkStats);
        const skillRatingText = getSkillRating(skillLevel);
        const feedbackText = generateFeedbackText(skillLevel, accelerationStats, jerkStats);

        // Build a consistent, flexbox-friendly feedback card
        const progressColor = skillLevel < 50 ? '#dc3545' : (skillLevel < 70 ? '#ffc107' : (skillLevel < 85 ? '#0dcaf0' : '#198754'));

        const feedbackHTML = `
            <div class="report-card">
                <div class="report-header">
                    <div class="report-title">Operator Performance Analysis</div>
                    <div class="report-sub">Summary of handling smoothness and consistency</div>
                </div>

                <div class="feedback-progress" style="width:100%;margin-top:8px;">
                    <div class="progress" aria-hidden="true">
                        <div class="progress-bar" style="width: ${skillLevel}%; background:${progressColor}"></div>
                    </div>
                    <div class="feedback-meta" style="text-align:left;margin-top:8px;font-weight:700">${skillLevel}% — ${skillRatingText}</div>
                </div>

                <!-- Metrics laid out with flexbox; items will wrap on narrow viewports -->
                <div class="feedback-metrics" style="display:flex;gap:12px;flex-wrap:wrap;margin-top:12px; width:100%; justify-content:space-between;">
                    <div class="metric" style="flex:1 1 160px;display:flex;justify-content:space-between;align-items:center;padding:8px 12px;box-sizing:border-box; background:#fbfdff; border-radius:4px; gap:8px;">
                        <div class="label">Max Acceleration</div>
                        <div class="value">${accelerationStats.max.toFixed(2)} m/s²</div>
                    </div>
                    <div class="metric" style="flex:1 1 160px;display:flex;justify-content:space-between;align-items:center;padding:8px 12px;box-sizing:border-box; background:#fbfdff; border-radius:4px; gap:8px;">
                        <div class="label">Consistency</div>
                        <div class="value">${Math.round(jerkStats.consistency)}%</div>
                    </div>
                </div>

                <div class="feedback-text" style="margin-top:12px;width:100%">
                    <div style="width:100%;padding:10px 12px;box-sizing:border-box;">
                        <div class="label">Performance Feedback</div>
                        <div class="value" style="margin-top:6px;color:var(--muted);font-weight:400">${feedbackText}</div>
                    </div>
                </div>
            </div>
        `;

        operatorFeedbackElement.innerHTML = feedbackHTML;
    };

    if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(work, { timeout: 200 });
    } else {
        setTimeout(work, 0);
    }
}

// Fetch data from backend and update UI
async function fetchData() {
    // If fetching was stopped while waiting for interval, skip
    if (!isFetching) return;

    // Prevent overlapping fetches
    if (inFlight) return;
    inFlight = true;

    // AbortController with timeout to avoid long hanging requests
    const controller = new AbortController();
    fetchController = controller;
    const FETCH_TIMEOUT_MS = 5000; // configurable timeout for fetch
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
        const response = await fetch(FETCH_LINK, { signal: controller.signal });
        clearTimeout(timeoutId);
        fetchController = null;

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        if (!isFetching) {
            // stopped while request was in-flight
            return;
        }

        const data = await response.json();
        // Choose the most recent document from the response.
        // If server returned an array, prefer the document with the newest timestamp
        // (ISO string or numeric). Fallback to last element if no timestamps.
        function parseTimestamp(v) {
            if (!v) return -Infinity;
            if (typeof v === 'number') return v;
            const t = Date.parse(v);
            return isNaN(t) ? -Infinity : t;
        }

        function getLatestFromArray(arr) {
            if (!arr || arr.length === 0) return {};
            // If items have a timestamp field, pick the max
            let best = null;
            let bestTs = -Infinity;
            for (const item of arr) {
                const ts = parseTimestamp(item && (item.timestamp || item.time || item.created_at));
                if (ts > bestTs) {
                    bestTs = ts;
                    best = item;
                }
            }
            if (best) return best;
            // fallback to last element
            return arr[arr.length - 1] || {};
        }

        let latestData;
        if (Array.isArray(data)) {
            latestData = getLatestFromArray(data);
            if (data.length === 0) console.warn('fetchData: server returned an empty array');
        } else {
            latestData = data || {};
        }

        // Update all fields dynamically (single DOM writes per field)
        dataFields.forEach(({ key, unit }) => {
            updateDataSection(key, latestData[key] ?? 0, unit);
        });

        // Update chart with new data
        updateChart(latestData);

        // Update last updated timestamp
        updateLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
        if (error.name === 'AbortError') {
            console.warn('Fetch aborted due to timeout or stop signal');
            updateLastUpdated('Fetch aborted');
        } else {
            console.error('Error fetching data:', error);
            updateLastUpdated('Error fetching data');
        }
    } finally {
        clearTimeout(timeoutId);
        fetchController = null;
        inFlight = false;
    }
}

// Toggle start/stop fetching
toggleButton.addEventListener("click", async () => {
    toggleButton.disabled = true; // Disable button temporarily

    if (isFetching) {
        // Stop fetching: abort any in-flight request and clear interval
        isFetching = false;
        if (fetchController) {
            try { fetchController.abort(); } catch (e) { /* ignore */ }
            fetchController = null;
        }
        if (fetchTimerId) {
            clearInterval(fetchTimerId);
            fetchTimerId = null;
        }

        // Generate cost receipt and operator feedback (off main tick)
        generateCostReceipt();
        generateOperatorFeedback();

        toggleButton.textContent = "Start Reading";
        toggleButton.classList.replace("btn-danger", "btn-success");
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

        // Mark fetching as active
        isFetching = true;

        // Default message while fetching data
        if (operatorFeedbackElement) operatorFeedbackElement.innerHTML = `<div style="text-align:center">Analysing Operator Data</div>`;
        if (costReceiptElement) costReceiptElement.innerHTML = `<div style="text-align:center">Analysing Cost Data</div>`;

        // Now do the first fetch
        await fetchData();

        // Only set up the interval if fetching wasn't stopped during the first fetch
        if (isFetching) {
            fetchTimerId = setInterval(fetchData, FETCH_INTERVAL_MS);

            toggleButton.textContent = "Stop Reading";
            toggleButton.classList.replace("btn-success", "btn-danger");
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