// Supabase configuration
const supabaseUrl = "https://vfzyenkbmccasevhgypr.supabase.co";
const supabaseKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmenllbmtibWNjYXNldmhneXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDY1NTAyMDUsImV4cCI6MjAyMjEyNjIwNX0.DHkrqOGJjb4QAXaqayUfis4CtPjBW-0cnzDYg3IGubc";

const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Global variables
let salaryChart;
let salaryData = [];
let isDarkTheme = false;

// Initialize app
document.addEventListener("DOMContentLoaded", function () {
    loadTheme();
    loadDataFromSupabase();
});

// Theme toggle
function toggleTheme() {
    isDarkTheme = !isDarkTheme;
    document.body.setAttribute(
        "data-theme",
        isDarkTheme ? "dark" : "light"
    );
    document.querySelector(".theme-toggle").textContent = isDarkTheme
        ? "☀️"
        : "🌙";
    localStorage.setItem("theme", isDarkTheme ? "dark" : "light");

    if (salaryChart) {
        updateChartTheme();
    }
}

function loadTheme() {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
        isDarkTheme = savedTheme === "dark";
        document.body.setAttribute(
            "data-theme",
            isDarkTheme ? "dark" : "light"
        );
        document.querySelector(".theme-toggle").textContent = isDarkTheme
            ? "☀️"
            : "🌙";
    }
}

// Calculate salary with Supabase integration
async function calculateSalary() {
    const calculateBtn = document.querySelector(".calculate-btn");
    const calculateText = document.getElementById("calculateText");
    const calculateLoader = document.getElementById("calculateLoader");

    // Show loading state
    calculateText.style.display = "none";
    calculateLoader.style.display = "inline-block";
    calculateBtn.disabled = true;

    try {
        const sum = parseFloat(document.getElementById("sum").value) || 0;
        const hours = parseFloat(document.getElementById("hours").value) || 0;
        const additionalValue =
            parseFloat(document.getElementById("additionalValue").value) || 0;

        // Validate inputs
        if (sum < 0 || hours < 0 || additionalValue < 0) {
            throw new Error("Values cannot be negative.");
        }

        // Calculate values
        let brut, result, com;

        if (sum === 0 && hours === 0) {
            brut = 38.5 * 16.1;
            result = brut - 0.21 * brut;
            com = 0;
        } else {
            const y = hours * 16.1;
            const z = y * 2;
            const t = sum - z;
            com = Math.max(0, t - 0.6 * t);
            const w = com + y;
            brut = w;
            result = w - 0.21 * w;
        }

        const additionalResult = additionalValue + result;
        const additionalBrut = additionalValue + brut;
        const additionalNalog = additionalValue + 0.21 * brut + result;

        let hourlySalary = 0;
        if (sum === 0 && hours === 0) {
            hourlySalary = 16.1;
        } else if (hours > 0) {
            hourlySalary = brut / hours;
        }

        const calculationResult = {
            sum,
            hours,
            additionalValue,
            brut,
            result,
            com,
            hourlySalary,
            additionalResult,
            additionalBrut,
            additionalNalog,
            bigtotal: hourlySalary + additionalNalog,
            date: new Date().toLocaleString(),
        };

        // Save to Supabase
        await saveDataToSupabase(calculationResult);

        // Reload data from Supabase
        await loadDataFromSupabase();

        // Show sections
        document.getElementById("statsGrid").style.display = "grid";
        document.getElementById("resultsGrid").style.display = "grid";
        document.getElementById("chartSection").style.display = "block";

        // Add animation
        document.getElementById("statsGrid").classList.add("fade-in-up");
        document.getElementById("resultsGrid").classList.add("fade-in-up");
        document.getElementById("chartSection").classList.add("fade-in-up");

        // Clear form
        document.getElementById("sum").value = "";
        document.getElementById("hours").value = "";
        document.getElementById("additionalValue").value = "";
    } catch (error) {
        console.error("Calculation error:", error);
        showError(error.message);
    } finally {
        // Hide loading state
        calculateText.style.display = "inline";
        calculateLoader.style.display = "none";
        calculateBtn.disabled = false;
    }
}

// Save data to Supabase
async function saveDataToSupabase(data) {
    try {
        const { error } = await supabaseClient.from("peon").insert([
            {
                sum: data.sum,
                hours: data.hours,
                result: data.result,
                com: data.com,
                hourlySalary: data.hourlySalary,
                additionalValue: data.additionalValue,
                date: data.date,
                ADtotal: data.additionalResult,
                ADbrut: data.additionalBrut,
                ADnalog: data.additionalNalog,
                bigtotal: data.bigtotal,
            },
        ]);

        if (error) {
            throw error;
        }
    } catch (error) {
        console.error("Error saving to Supabase:", error);
        throw new Error("Error saving data to the database.");
    }
}

// Load data from Supabase
async function loadDataFromSupabase() {
    try {
        const { data, error } = await supabaseClient
            .from("peon")
            .select("*")
            .order("id", { ascending: false })
            .limit(10);

        if (error) {
            throw error;
        }

        if (data && data.length > 0) {
            // Convert Supabase data to our format
            salaryData = data.map((entry) => ({
                id: entry.id,
                sum: entry.sum,
                hours: entry.hours,
                additionalValue: entry.additionalValue,
                brut: entry.ADbrut - entry.additionalValue, // Calculate brut
                result: entry.result,
                com: entry.com,
                hourlySalary: entry.hourlySalary,
                additionalResult: entry.ADtotal,
                additionalBrut: entry.ADbrut,
                additionalNalog: entry.ADnalog,
                bigtotal: entry.bigtotal,
                date: entry.date,
            }));

            // Update display
            if (salaryData.length > 1) {
                // If there's data for "Current Week" (index 1), display it in the main stats grid
                updateStats(salaryData[1]);
            } else if (salaryData.length > 0) {
                // Otherwise, if only "Next Week" data exists, display that
                updateStats(salaryData[0]);
            }

            updateResults(); // This function handles the 3 cards based on their specific index labels
            updateChart();

            // Show sections
            document.getElementById("statsGrid").style.display = "grid";
            document.getElementById("resultsGrid").style.display = "grid";
            document.getElementById("chartSection").style.display = "block";
        }
    } catch (error) {
        console.error("Error loading from Supabase:", error);
        showError("Error loading data from the database.");
    }
}

// Update stats cards
function updateStats(data) {
    document.getElementById("currentHourlyRate").textContent =
        data.hourlySalary.toFixed(2) + "₽";
    document.getElementById("totalEarnings").textContent =
        data.additionalResult.toFixed(2) + "₽";
    document.getElementById("commission").textContent = data.com.toFixed(2) + "₽";
    document.getElementById("netSalary").textContent =
        data.result.toFixed(2) + "₽";
}

// Update results display
function updateResults() {
    const resultsGrid = document.getElementById("resultsGrid");
    resultsGrid.innerHTML = "";

    salaryData.slice(0, 3).forEach((entry, index) => {
        const resultCard = document.createElement("div");
        resultCard.className = "result-card";

        let iconClass = "";
        let iconText = "";
        let cardTitle = "";

        // Adjusting titles based on the desired order: 0=Next, 1=Current, 2=Last
        if (index === 0) {
            iconClass = "current";
            iconText = "📊";
            cardTitle = "Next Week";
        } else if (index === 1) {
            iconClass = "previous";
            iconText = "📈";
            cardTitle = "Current Week";
        } else if (index === 2) {
            iconClass = "older";
            iconText = "📋";
            cardTitle = "Last Week";
        }

        resultCard.innerHTML = `
                    <div class="result-header">
                        <div class="result-icon ${iconClass}">${iconText}</div>
                        <div>
                            <div class="result-title">${cardTitle}</div>
                            <div class="result-label">${entry.date}</div>
                        </div>
                    </div>
                    <div class="result-details">
                        <div class="result-item">
                            <span class="result-label">Amount:</span>
                            <span class="result-value">${entry.sum.toFixed(
            2
        )}₽</span>
                        </div>
                        <div class="result-item">
                            <span class="result-label">Hours:</span>
                            <span class="result-value">${entry.hours.toFixed(
            1
        )}h</span>
                        </div>
                        <div class="result-item">
                            <span class="result-label">Commission:</span>
                            <span class="result-value">${entry.com.toFixed(
            2
        )}₽</span>
                        </div>
                        <div class="result-item">
                            <span class="result-label">Net Salary:</span>
                            <span class="result-value">${entry.result.toFixed(
            2
        )}₽</span>
                        </div>
                        <div class="result-item">
                            <span class="result-label">Total Income:</span>
                            <span class="result-value highlight">${entry.additionalResult.toFixed(
            2
        )}₽</span>
                        </div>
                        <div class="result-item">
                            <span class="result-label">Rate/Hour:</span>
                            <span class="result-value">${entry.hourlySalary.toFixed(
            2
        )}₽</span>
                        </div>
                    </div>
                `;

        resultsGrid.appendChild(resultCard);
    });
}

// Update chart
function updateChart() {
    const ctx = document.getElementById("salaryChart").getContext("2d");

    if (salaryChart) {
        salaryChart.destroy();
    }

    const chartData = salaryData.slice(0, 10).reverse();
    const labels = chartData.map((entry, index) => `#${index + 1}`);

    salaryChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Total Income",
                    data: chartData.map((entry) => entry.additionalResult),
                    borderColor: "#ec4899",
                    backgroundColor: "rgba(236, 72, 153, 0.1)",
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                },
                {
                    label: "Net Salary",
                    data: chartData.map((entry) => entry.result),
                    borderColor: "#3b82f6",
                    backgroundColor: "rgba(59, 130, 246, 0.1)",
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                },
                {
                    label: "Additional Value",
                    data: chartData.map((entry) => entry.additionalValue),
                    borderColor: "#f59e0b",
                    backgroundColor: "rgba(245, 158, 11, 0.1)",
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: "index",
            },
            plugins: {
                legend: {
                    display: false, // Set to false to hide legend (e.g., "Total Income", "Net Salary")
                    position: "top",
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            size: 12,
                            weight: "500",
                        },
                    },
                },
                tooltip: {
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    titleColor: "#fff",
                    bodyColor: "#fff",
                    borderColor: "#ec4899",
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        label: function (context) {
                            return `${
                                context.dataset.label
                            }: ${context.parsed.y.toFixed(2)}₽`; // Changed from € to ₽
                        },
                    },
                },
            },
            scales: {
                x: {
                    // Hide X-axis ticks (labels)
                    ticks: {
                        display: false
                    },
                    // Hide X-axis grid lines
                    grid: {
                        display: false,
                    },
                },
                y: {
                    beginAtZero: true,
                    // Hide Y-axis ticks (labels)
                    ticks: {
                        display: false
                    },
                    // Hide Y-axis grid lines
                    grid: {
                        display: false
                    },
                },
            },
        },
    });
}
// Update chart theme
function updateChartTheme() {
    if (salaryChart) {
        const textColor = isDarkTheme ? "#f9fafb" : "#1f2937";
        const gridColor = isDarkTheme
            ? "rgba(255, 255, 255, 0.1)"
            : "rgba(0, 0, 0, 0.1)";

        salaryChart.options.plugins.legend.labels.color = textColor;
        salaryChart.options.scales.x.ticks.color = textColor;
        salaryChart.options.scales.y.ticks.color = textColor;
        salaryChart.options.scales.y.grid.color = gridColor;
        salaryChart.update();
    }
}

// Show error
function showError(message) {
    const errorDiv = document.createElement("div");
    errorDiv.className = "error";
    errorDiv.textContent = message;

    const container = document.querySelector(".container");
    container.insertBefore(errorDiv, container.firstChild);

    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Load sample data for demo (kept for fallback purposes)
function loadSampleData() {
    console.log("Loading sample data...");
}

// Input validation
document.querySelectorAll(".styled-input").forEach((input) => {
    input.addEventListener("input", function () {
        this.style.borderColor = "var(--gray-200)";
        this.style.backgroundColor = "var(--gray-50)";
    });
});

// Form submission on Enter
document.addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
        calculateSalary();
    }
});

// Add ripple effect to buttons
document.querySelectorAll(".calculate-btn").forEach((button) => {
    button.addEventListener("click", function (e) {
        const ripple = document.createElement("span");
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        ripple.style.width = ripple.style.height = size + "px";
        ripple.style.left = x + "px";
        ripple.style.top = y + "px";
        ripple.classList.add("ripple");

        this.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 600);
    });
});

// Smooth scroll for better UX
function smoothScrollTo(element) {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Auto-focus next input
document
    .querySelectorAll(".styled-input")
    .forEach((input, index, inputs) => {
        input.addEventListener("keypress", function (e) {
            if (e.key === "Enter" && index < inputs.length - 1) {
                inputs[index + 1].focus();
            }
        });
    });

// Connection status indicator
function checkSupabaseConnection() {
    supabaseClient
        .from("peon")
        .select("count", { count: "exact" })
        .then(({ error }) => {
            if (error) {
                console.warn("Supabase connection issue:", error);
                showError("Problems connecting to the database.");
            }
        });
}

// Initialize connection check
setTimeout(checkSupabaseConnection, 1000);