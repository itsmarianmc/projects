// script.js
let currentAmount = 0;
let goal = 3000;
let history = [];
let lastDate = localStorage.getItem('lastDate') || new Date().toISOString().slice(0, 10);
let firstTimeSettingGoal = localStorage.getItem('firstTimeSettingGoal') !== 'false';
let animatedProgress = 0;
const currentUrl = window.location.href;

const getColor = (percentage) => `hsl(${120 * (percentage / 100)}, 70%, 45%)`;

// Event bindings
document.getElementById("setFirstGoal").addEventListener("click", firstUpdateGoal);
document.getElementById("addCustomValue").addEventListener("click", addDrink);
document.getElementById("removeCustomValue").addEventListener("click", removeDrink);
document.querySelectorAll('[data-add-value]').forEach(button => {
    button.addEventListener('click', () => {
        const value = parseInt(button.getAttribute('data-add-value')) || 0;
        if (value > 0) addAmount(value);
    });
});

function removeDrink() {
    const amount = parseInt(document.getElementById('removeAmount').value) || 0;
    if (amount > 0) subtractAmount(amount);
    document.getElementById('removeAmount').value = "";
}

function subtractAmount(amount) {
    if (currentAmount <= 0 || amount <= 0) return;
    const newAmount = currentAmount - amount;
    if (newAmount < 0) return;

    currentAmount = newAmount;
    saveData();
    updateDisplay();
    animateChange(-amount);
}

function addDrink() {
    const amount = parseInt(document.getElementById('amount').value) || 0;
    if (amount > 0) addAmount(amount);
}

function addAmount(amount) {
    currentAmount += amount;
    saveData();
    updateDisplay();
    animateChange(amount);
}

function animateChange(amount) {
    const anim = document.createElement('div');
    anim.textContent = `${amount > 0 ? '+' : ''}${amount}ml`;
    anim.style.cssText = `
        position: absolute;
        color: ${amount > 0 ? getColor((currentAmount / goal) * 100) : '#ff0000'};
        animation: floatUp 1s ease-out;
        font-weight: bold;
        pointer-events: none;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10000;
    `;
    document.body.appendChild(anim);
    setTimeout(() => anim.remove(), 1000);
}

function loadData() {
    const today = new Date().toISOString().slice(0, 10);
    const saved = JSON.parse(localStorage.getItem('hydroData')) || {
        current: 0,
        goal: 3000,
        date: today,
        history: []
    };

    if (saved.date !== today) {
        if (saved.current > 0) {
            history = saved.history || [];
            history.push({ date: saved.date, amount: saved.current, goal: saved.goal });
        }
        currentAmount = 0;
        saved.date = today;
    } else {
        currentAmount = saved.current;
        history = saved.history || [];
    }

    goal = saved.goal || 3000;

    if (firstTimeSettingGoal) {
        document.getElementById('setup-overlay').style.display = 'block';
        document.getElementById('firstGoalInput').style.display = 'block';
    } else {
        document.querySelector('.bg-blur').style.display = 'none';
        setTimeout(() => {
            document.getElementById('setup-overlay')?.remove();
        }, 2000);
    }

    saveData();
    updateDisplay();
    updateHistory();
}

function saveData() {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem('hydroData', JSON.stringify({
        current: currentAmount,
        goal: goal,
        date: today,
        history: history
    }));

    localStorage.setItem('lastDate', lastDate);
}

function updateGoal() {
    const newGoal = parseInt(document.getElementById('goalInput').value) || 3000;
    goal = Math.max(newGoal, 500);
    saveData();
    updateDisplay();

    const element = document.getElementById("event-action-tooltip");
    element.innerText = `Updated successfully`;
    element.style.color = '#28a745';
    setTimeout(() => {
        element.innerText = ``;
        element.style = '';
    }, 3000);
}

function firstUpdateGoal(event) {
    event.preventDefault();
    const value = parseInt(document.getElementById('firstGoalInput').value);
    if (!isNaN(value) && value > 0) {
        goal = Math.max(value, 500);
        localStorage.setItem('firstTimeSettingGoal', 'false');
        saveData();
        updateDisplay();
        setTimeout(() => location.reload(), 200);
    } else {
        alert('Please enter a positive/valid number.');
    }
}

function updateDisplay() {
    const targetProgress = Math.min((currentAmount / goal) * 100, 100);
    document.getElementById('currentProgress').textContent = currentAmount;
    document.getElementById('currentGoal').textContent = goal;
    document.getElementById('progressText').textContent = `${targetProgress.toFixed(1)}%`;
    animateProgress(animatedProgress, targetProgress);
}

function animateProgress(start, end) {
    const duration = 500;
    const startTime = performance.now();

    function step(timestamp) {
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const current = start + (end - start) * progress;
        const circle = document.getElementById('progressCircle');

        if (circle) {
            const color = getColor(current);
            circle.style.background = `conic-gradient(${color} ${current}%, #e9ecef ${current}% 100%)`;
        }

        if (progress < 1) {
            requestAnimationFrame(step);
        } else {
            animatedProgress = end;
        }
    }

    requestAnimationFrame(step);
}

function updateHistory() {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;

    const uniqueHistory = new Map();
    history.forEach(entry => {
        if (!uniqueHistory.has(entry.date)) {
            uniqueHistory.set(entry.date, entry);
        }
    });

    const entries = Array.from(uniqueHistory.values())
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    historyList.innerHTML = entries.length > 0
        ? entries.map(entry => `
            <div class="history-item" data-date="${entry.date}">
                <div>${entry.date}</div>
                <div>${entry.amount}ml / ${entry.goal}ml</div>
            </div>
        `).join('')
        : `<a>No history yet!</a><br><a>Keep tracking your drinks to get a list, or import an existing one below.</a>`;
}

document.addEventListener('visibilitychange', () => {
    if (!document.hidden) loadData();
});

document.addEventListener('DOMContentLoaded', loadData);

if (currentUrl.endsWith("?") || currentUrl.endsWith("/?")) {
    const cleanedUrl = currentUrl.replace(/\?$/, "");
    window.location.replace(cleanedUrl);
}

// Import and Export
document.getElementById("fileExport").addEventListener("click", function() {
    exportData();
})
document.getElementById("versionFileExport").addEventListener("click", function() {
    exportData();
})

document.getElementById("fileImport").addEventListener("click", function() {
    document.getElementById("importAction").style.display = "block";
    document.getElementById("import-action").innerText = `Your current data will be overwritten when importing!`;
    setTimeout(() => {
        document.getElementById('importFile').click()
        setTimeout(() => {
            document.getElementById("importAction").style.display = "none";
            document.getElementById("import-action").innerText = ``;
        }, 2500);
    }, 500);
})

function exportData() {
    const data = localStorage.getItem('hydroData');
    if (!data) return;

    const today = new Date().toISOString().slice(0, 10);
    const fileName = `HydroTrack_Data_${today}.json`;

    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (
                typeof importedData.current === 'number' &&
                typeof importedData.goal === 'number' &&
                typeof importedData.date === 'string' &&
                Array.isArray(importedData.history)
            ) {
                localStorage.setItem('hydroData', JSON.stringify(importedData));
                location.reload();
            } else {
                alert('Ungültiges Datenformat.');
            }
        } catch (error) {
            alert('Fehler beim Importieren der Datei.');
        }
    };
    reader.readAsText(file);
}

document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('themeToggle');
    const root = document.documentElement;

    const darkModePreference = localStorage.getItem('darkMode');
    if (darkModePreference === 'enabled') {
        root.classList.add('dark');
        root.classList.remove('light');
        themeToggle.classList.remove('light');
        themeToggle.classList.add('dark');
    } else {
        root.classList.add('light');
        root.classList.remove('dark');
        themeToggle.classList.remove('dark');
        themeToggle.classList.add('light');
    }

    updateDisplay();

    themeToggle.addEventListener('click', () => {
        const isDark = root.classList.contains('dark');

        if (isDark) {
            root.classList.remove('dark');
            root.classList.add('light');
            themeToggle.classList.remove('dark');
            themeToggle.classList.add('light');
            localStorage.setItem('darkMode', 'disabled');
        } else {
            root.classList.add('dark');
            root.classList.remove('light');
            themeToggle.classList.remove('light');
            themeToggle.classList.add('dark');
            localStorage.setItem('darkMode', 'enabled');
        }

        updateDisplay();
    });
});