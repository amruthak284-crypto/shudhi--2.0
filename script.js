
// ==========================================
// SHUDHI 2.0 - SMART WASHROOM SYSTEM
// ==========================================

let readings = {
    water: 80,
    floor: false,
    dust: false,
    dustbin: 30,
    air: 50,
    soap: 80
};

let manualAlerts = [];
let historyRecords = [];

let robotTimer = null;
let chargeTimer = null;

let robotProgress = 0;
let robotRunning = false;
let robotTask = "No task assigned";
let robotMode = "none";

let battery = 100;
let isCharging = false;
let isReturning = false;
let automaticTask = false;

const robotPositions = [
    [8, 40],
    [25, 15],
    [45, 15],
    [65, 15],
    [78, 40],
    [65, 65],
    [45, 65],
    [25, 65],
    [8, 40]
];

function updateSensor(id, value, status) {
    const valueElement = document.getElementById(id + "Value");
    const statusElement = document.getElementById(id + "Status");

    if (valueElement) valueElement.textContent = value;
    if (statusElement) statusElement.textContent = status;
}

function setActionStatus(id, description, status) {
    const descriptionElement = document.getElementById(id + "Description");
    const statusElement = document.getElementById(id + "Status");

    if (descriptionElement) descriptionElement.textContent = description;
    if (statusElement) statusElement.textContent = status;
}

function addHistory(activity, status = "Completed") {
    historyRecords.unshift({
        time: new Date().toLocaleTimeString(),
        activity,
        status
    });

    renderHistory();
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function renderHistory() {
    const historyList = document.getElementById("historyList");

    if (!historyList) return;

    if (historyRecords.length === 0) {
        historyList.innerHTML =
            "<tr><td colspan='3'>No activities recorded yet.</td></tr>";
        return;
    }

    historyList.innerHTML = historyRecords.map(record => `
        <tr>
            <td>${escapeHTML(record.time)}</td>
            <td>${escapeHTML(record.activity)}</td>
            <td>${escapeHTML(record.status)}</td>
        </tr>
    `).join("");
}

function renderAlerts(sensorAlerts = []) {
    const alertList = document.getElementById("alertList");

    if (!alertList) return;

    const allAlerts = [...sensorAlerts, ...manualAlerts];

    if (allAlerts.length === 0) {
        alertList.innerHTML = "<p>No active alerts. Washroom condition is good! 💗</p>";
        return;
    }

    alertList.innerHTML = allAlerts.map(alert => `
        <div class="alert-item">
            🔔 ${escapeHTML(alert)}
        </div>
    `).join("");
}

// ==========================================
// SENSOR MONITORING
// ==========================================

function updateDashboard() {
    const alerts = [];

    updateSensor("water", readings.water + "%",
        readings.water < 30 ? "Low water level" : "Normal");

    updateSensor("floor", readings.floor ? "WET" : "DRY",
        readings.floor ? "Wet floor detected" : "No wet area");

    updateSensor("dustbin", readings.dustbin + "%",
        readings.dustbin >= 80 ? "Dustbin nearly full" : "Normal");

    updateSensor("air", readings.air,
        readings.air >= 150 ? "Poor air quality" : "Good air quality");

    updateSensor("soap", readings.soap + "%",
        readings.soap < 30 ? "Soap refill required" : "Available");

    if (readings.water < 30) alerts.push("Low water level. Refill required.");
    if (readings.floor) alerts.push("Wet floor detected.");
    if (readings.dust) alerts.push("Dusty floor detected.");
    if (readings.dustbin >= 80) alerts.push("Dustbin is nearly full.");
    if (readings.air >= 150) alerts.push("Poor air quality. Ventilation activated.");
    if (readings.soap < 30) alerts.push("Soap dispenser requires refill.");

    const overall = document.getElementById("overall");
    const alertCount = document.getElementById("alertCount");

    const problemCount = alerts.length + manualAlerts.length;

    if (overall) overall.textContent =
        problemCount > 0 ? "NEEDS ATTENTION" : "GOOD";

    if (alertCount) alertCount.textContent = problemCount;

    updateAutomation();
    renderAlerts(alerts);
}

// ==========================================
// AUTOMATIC SYSTEM RESPONSES
// ==========================================

function updateAutomation() {
    if (readings.air >= 150) {
        setActionStatus("fan",
            "Poor air quality detected. Ventilation running automatically.",
            "VENTILATION ON");
    } else {
        setActionStatus("fan",
            "Air quality is good. Ventilation is in standby.",
            "VENTILATION OFF");
    }

    if (readings.water < 30) {
        setActionStatus("waterControl",
            "Low water level detected. Refill notification generated.",
            "REFILL ALERT");
    } else {
        setActionStatus("waterControl",
            "Water supply level is normal.",
            "NORMAL");
    }

    if (robotRunning) {
        setActionStatus("cleaning",
            "Cleaning robot is performing its assigned task.",
            "CLEANING");
    } else if (readings.floor || readings.dust) {
        setActionStatus("cleaning",
            "Dirty floor detected. A cleaning task is available.",
            "TASK READY");
    } else {
        setActionStatus("cleaning",
            "Floor is clean. Robot is in standby.",
            "STANDBY");
    }

    if (
        readings.water < 30 ||
        readings.dustbin >= 80 ||
        readings.soap < 30 ||
        readings.air >= 150 ||
        manualAlerts.length > 0
    ) {
        setActionStatus("notification",
            "Maintenance staff notification generated in dashboard.",
            "NOTIFICATION SENT");
    } else {
        setActionStatus("notification",
            "No new maintenance notification.",
            "READY");
    }
}

// ==========================================
// FLOOR APPEARANCE
// ==========================================

function updateFloorAppearance() {
    const dustPatch = document.getElementById("dustPatch");
    const wetPatch = document.getElementById("wetPatch");

    if (dustPatch) {
        dustPatch.classList.toggle("cleaned", !readings.dust);
    }

    if (wetPatch) {
        wetPatch.classList.toggle("cleaned", !readings.floor);
    }
}

function makeFloorDirty(type) {
    if (type === "dust" || type === "both") readings.dust = true;
    if (type === "wet" || type === "both") readings.floor = true;

    updateFloorAppearance();
    updateDashboard();
}

// ==========================================
// BATTERY DISPLAY
// ==========================================

function updateBattery() {
    const batteryText = document.getElementById("batteryText");
    const batteryFill = document.getElementById("batteryFill");
    const chargingStatus = document.getElementById("chargingStatus");

    if (batteryText) batteryText.textContent = battery + "%";

    if (batteryFill) batteryFill.style.width = battery + "%";

    if (chargingStatus) {
        chargingStatus.textContent = isCharging
            ? "Charging..."
            : isReturning ? "Returning to dock" : "Battery available";
    }

    const dock = document.getElementById("chargingStation");

    if (dock) {
        dock.classList.toggle("charging", isCharging);
    }
}

// ==========================================
// ROBOT DISPLAY
// ==========================================

function updateRobotDisplay() {
    const status = document.getElementById("robotStatus");
    const message = document.getElementById("robotMessage");
    const task = document.getElementById("robotTask");
    const progressText = document.getElementById("robotProgressText");
    const progressBar = document.getElementById("robotProgress");
    const summary = document.getElementById("robotSummary");
    const summaryText = document.getElementById("robotSummaryText");

    if (status) {
        status.textContent = isCharging ? "CHARGING" :
            isReturning ? "RETURNING TO DOCK" :
            robotRunning ? "CLEANING" : "IDLE";
    }

    if (message) {
        message.textContent = isCharging
            ? "Robot is recharging at its docking station."
            : isReturning
            ? "Cleaning completed. Returning to charging station."
            : robotRunning
            ? "Robot is cleaning the floor."
            : "Waiting for a cleaning task.";
    }

    if (task) task.textContent = robotTask;

    if (progressText) progressText.textContent = robotProgress + "%";

    if (progressBar) progressBar.style.width = robotProgress + "%";

    if (summary) {
        summary.textContent = isCharging ? "CHARGING" :
            isReturning ? "RETURNING" :
            robotRunning ? "ACTIVE" : "IDLE";
    }

    if (summaryText) {
        summaryText.textContent = isCharging ? "Battery recharging" :
            isReturning ? "Going to dock" :
            robotRunning ? "Cleaning in progress" : "Waiting for task";
    }

    updateBattery();
}

// ==========================================
// ROBOT POSITION
// ==========================================

function resetRobotPosition() {
    const robot = document.getElementById("robotModel");

    if (robot) {
        robot.classList.remove("moving");
        robot.style.left = "8%";
        robot.style.top = "40%";
    }
}

function moveRobotToDock() {
    const robot = document.getElementById("robotModel");

    if (!robot) return;

    robot.style.left = "5%";
    robot.style.top = "68%";
}

// ==========================================
// AUTOMATIC TASK ASSIGNMENT
// ==========================================

function checkAutomaticTask() {
    if (
        !robotRunning &&
        !isReturning &&
        !isCharging &&
        (readings.floor || readings.dust) &&
        automaticTask
    ) {
        startRobot();
    }
}

// ==========================================
// START CLEANING
// ==========================================

function startRobot() {
    if (robotRunning || isCharging || isReturning) return;

    if (!readings.floor && !readings.dust) {
        alert("The floor is already clean! Choose a dirty floor scenario first.");
        return;
    }

    if (battery < 30) {
        alert("Battery is low! Robot needs charging before cleaning.");
        return;
    }

    robotMode = readings.floor && readings.dust
        ? "both"
        : readings.dust ? "dust" : "wet";

    robotTask =
        robotMode === "both" ? "Dust + Wet Cleaning" :
        robotMode === "dust" ? "Dust Cleaning" :
        "Wet Floor Cleaning";

    robotProgress = 0;
    robotRunning = true;
    isReturning = false;

    const robot = document.getElementById("robotModel");

    if (robot) robot.classList.add("moving");

    updateRobotDisplay();
    updateDashboard();

    addHistory("Robot started: " + robotTask, "In progress");

    let positionIndex = 0;

    robotTimer = setInterval(() => {
        robotProgress += 5;
        battery = Math.max(0, battery - 1);

        if (robot) {
            const position = robotPositions[positionIndex % robotPositions.length];

            robot.style.left = position[0] + "%";
            robot.style.top = position[1] + "%";

            positionIndex++;
        }

        if (robotProgress >= 35 && robotMode === "dust") {
            readings.dust = false;
        }

        if (robotProgress >= 35 && robotMode === "wet") {
            readings.floor = false;
        }

        if (robotProgress >= 35 && robotMode === "both") {
            readings.dust = false;
        }

        if (robotProgress >= 65 && robotMode === "both") {
            readings.floor = false;
        }

        updateFloorAppearance();
        updateRobotDisplay();
        updateDashboard();

        if (robotProgress >= 100 || battery <= 0) {
            finishCleaning();
        }

    }, 250);
}

// ==========================================
// FINISH CLEANING AND RETURN TO DOCK
// ==========================================

function finishCleaning() {
    clearInterval(robotTimer);
    robotTimer = null;

    robotRunning = false;
    robotProgress = 100;

    readings.floor = false;
    readings.dust = false;

    updateFloorAppearance();

    const robot = document.getElementById("robotModel");

    if (robot) robot.classList.remove("moving");

    updateDashboard();

    addHistory("Floor cleaning completed", "Successful");

    returnToDock();
}

function returnToDock() {
    isReturning = true;
    updateRobotDisplay();

    const robot = document.getElementById("robotModel");

    if (robot) {
        robot.classList.add("moving");
        robot.style.left = "5%";
        robot.style.top = "68%";
    }

    setTimeout(() => {
        isReturning = false;
        startCharging();
    }, 1200);
}

// ==========================================
// CHARGING SYSTEM
// ==========================================

function startCharging() {
    isCharging = true;

    const robot = document.getElementById("robotModel");

    if (robot) {
        robot.classList.remove("moving");
    }

    updateRobotDisplay();

    addHistory("Robot connected to charging station", "Charging");

    chargeTimer = setInterval(() => {
        battery = Math.min(100, battery + 5);

        updateRobotDisplay();

        if (battery >= 100) {
            clearInterval(chargeTimer);
            chargeTimer = null;

            isCharging = false;

            robotTask = "Waiting for next task";

            updateRobotDisplay();

            addHistory("Robot battery fully charged", "Ready");

            checkAutomaticTask();
        }
    }, 350);
}

// ==========================================
// STOP ROBOT
// ==========================================

function stopRobot(recordEvent = true) {
    if (robotTimer) {
        clearInterval(robotTimer);
        robotTimer = null;
    }

    if (chargeTimer) {
        clearInterval(chargeTimer);
        chargeTimer = null;
    }

    const wasActive = robotRunning || isReturning || isCharging;

    robotRunning = false;
    isReturning = false;
    isCharging = false;

    const robot = document.getElementById("robotModel");

    if (robot) robot.classList.remove("moving");

    if (wasActive) {
        robotTask = "Cleaning paused";
        updateRobotDisplay();

        if (recordEvent) {
            addHistory("Robot stopped", "Paused");
        }
    }

    updateDashboard();
}

// ==========================================
// SIMULATION SCENARIOS
// ==========================================

function setScenario(condition) {
    stopRobot(false);

    automaticTask = false;
    manualAlerts = [];

    if (condition === "normal" || condition === "reset") {
        readings = {
            water: 80,
            floor: false,
            dust: false,
            dustbin: 30,
            air: 50,
            soap: 80
        };

        robotProgress = 0;
        robotTask = "No task assigned";
        robotMode = "none";

        resetRobotPosition();

        addHistory("Normal condition restored", "Completed");
    }

    if (condition === "poor") {
        readings = {
            water: 50,
            floor: true,
            dust: true,
            dustbin: 95,
            air: 180,
            soap: 15
        };

        robotTask = "Dust + Wet Cleaning";
        robotMode = "both";

        addHistory("Poor hygiene scenario activated", "Attention required");
    }

    if (condition === "water") {
        readings = {
            water: 10,
            floor: false,
            dust: false,
            dustbin: 30,
            air: 50,
            soap: 80
        };

        robotTask = "No cleaning required";
        robotMode = "none";

        addHistory("Low water scenario activated", "Alert generated");
    }

    if (condition === "dust") {
        readings = {
            water: 80,
            floor: false,
            dust: true,
            dustbin: 30,
            air: 50,
            soap: 80
        };

        robotTask = "Dust Cleaning";
        robotMode = "dust";

        addHistory("Dusty floor scenario activated", "Cleaning required");
    }

    if (condition === "wet") {
        readings = {
            water: 80,
            floor: true,
            dust: false,
            dustbin: 30,
            air: 50,
            soap: 80
        };

        robotTask = "Wet Floor Cleaning";
        robotMode = "wet";

        addHistory("Wet floor scenario activated", "Cleaning required");
    }

    updateFloorAppearance();
    updateDashboard();
    updateRobotDisplay();
}

// ==========================================
// MANUAL REPORT FORM
// ==========================================

document.getElementById("reportForm").addEventListener("submit", function(event) {
    event.preventDefault();

    const problem = document.getElementById("problemType").value;
    const description = document.getElementById("reportDescription").value.trim();

    if (!problem || !description) return;

    manualAlerts.push(problem + ": " + description);

    addHistory("Problem reported: " + problem, "Notification generated");

    document.getElementById("reportMessage").textContent =
        "Report submitted successfully! 💗";

    this.reset();

    updateDashboard();
});

// ==========================================
// BUTTON EVENTS
// ==========================================

document.getElementById("startRobotBtn").addEventListener("click", () => {
    automaticTask = false;
    startRobot();
});

document.getElementById("stopRobotBtn").addEventListener("click", () => {
    stopRobot(true);
});

// ==========================================
// NAVIGATION
// ==========================================

document.querySelectorAll(".sidebar nav a").forEach(link => {
    link.addEventListener("click", function() {
        document.querySelectorAll(".sidebar nav a").forEach(item => {
            item.classList.remove("active");
        });

        this.classList.add("active");
    });
});

// ==========================================
// INITIALIZE
// ==========================================

updateFloorAppearance();
updateDashboard();
updateRobotDisplay();
renderHistory();

addHistory("SHUDHI 2.0 simulation started", "System online");
