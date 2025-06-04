let startTime = 0;
let elapsedTime = 0;
let timerInterval = null;
let isRunning = false;
let laps = [];
let lapCount = 1;
const circle = document.querySelector('.progress-ring__circle');
const radius = circle.r.baseVal.value;
const circumference = radius * 2 * Math.PI;

circle.style.strokeDasharray = `${circumference} ${circumference}`;
circle.style.strokeDashoffset = circumference;

function setProgress(percent) {
    const offset = circumference - (percent * circumference);
    circle.style.strokeDashoffset = offset;
}

function formatTime(ms) {
    const totalSeconds = ms / 1000;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const milliseconds = Math.floor((ms % 1000) / 10);
    
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(milliseconds)}`;
}

function pad(num) {
    return num.toString().padStart(2, '0');
}

function updateDisplay() {
    document.querySelector('.time-display').textContent = formatTime(elapsedTime);
    setProgress((elapsedTime % 60000) / 60000);
}

function startStop() {
    if (isRunning) {
        clearInterval(timerInterval);
        document.getElementById('startStop').innerHTML = '<i class="fas fa-play"></i>';
    } else {
        startTime = Date.now() - elapsedTime;
        timerInterval = setInterval(() => {
            elapsedTime = Date.now() - startTime;
            updateDisplay();
        }, 10);
        document.getElementById('startStop').innerHTML = '<i class="fas fa-pause"></i>';
    }
    isRunning = !isRunning;
}

function addLap() {
    if (!isRunning) return;
    
    const lapData = {
        number: lapCount,
        time: elapsedTime,
        timestamp: Date.now(),
        duration: elapsedTime - (laps[laps.length - 1]?.time || 0)
    };

    laps.push(lapData);
    renderLaps();
    lapCount++;
}

function renderLaps() {
    const container = document.getElementById('laps');
    container.innerHTML = '';
    
    laps.forEach(lap => {
        const lapItem = document.createElement('div');
        lapItem.className = 'lap-item';
        lapItem.innerHTML = `
                <div>
            <strong>Runde ${lap.number}</strong>
            <span style="opacity:0.7; margin-left:8px">${formatTime(lap.time)}</span>
                </div>
                <div>+${formatTime(lap.duration)}</div>
            `;
        container.appendChild(lapItem);
    });
}

function sortLaps(type) {
    const sortFunctions = {
        number: (a, b) => b.number - a.number,
        time: (a, b) => b.time - a.time,
        duration: (a, b) => b.duration - a.duration
    };

    laps.sort(sortFunctions[type]);
    renderLaps();
}

function reset() {
    clearInterval(timerInterval);
    isRunning = false;
    elapsedTime = 0;
    lapCount = 1;
    updateDisplay();
    document.getElementById('startStop').innerHTML = '<i class="fas fa-play"></i>';
    document.getElementById('laps').innerHTML = '';
    setProgress(0);
    laps = [];
    renderLaps();
}
const segmentedControl = document.querySelector('.segmented-control');
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');
tabButtons.forEach((button, index) => {
    button.addEventListener('click', () => {
        segmentedControl.setAttribute('data-active-index', index);
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        tabContents.forEach(content => {
            content.classList.toggle('active', content.id === button.dataset.tab);
        });
    });
});
  
function formatTimeForCountDown(cs) {
    const hours = Math.floor(cs / 360000);
    const minutes = Math.floor((cs % 360000) / 6000);
    const seconds = Math.floor((cs % 6000) / 100);
    const centiseconds = cs % 100;
    return String(hours).padStart(2, '0') + ':' +
           String(minutes).padStart(2, '0') + ':' +
           String(seconds).padStart(2, '0') + '.' +
           String(centiseconds).padStart(2, '0');
}
  
function updateWorldClocks() {
    document.querySelectorAll('#world-clock-list li').forEach(item => {
      const timezone = item.dataset.timezone;
      const formatter = new Intl.DateTimeFormat('de-DE', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      item.querySelector('.time').textContent = formatter.format(new Date());
    });
}

setInterval(updateWorldClocks, 1000);
updateWorldClocks();
  
const timerDisplay = document.getElementById('timer-display');
const timerHoursInput = document.getElementById("timer-hours");
const timerMinutesInput = document.getElementById('timer-minutes');
const timerSecondsInput = document.getElementById('timer-seconds');
const startTimerBtn = document.getElementById('start-timer');
const resetTimerBtn = document.getElementById('reset-timer');
let timerRunning = false;
let timerTime = 0;
let timerRAF;
let lastTimerTimestamp = 0;
  
function updateTimerDisplay() {
    timerDisplay.textContent = formatTimeForCountDown(timerTime);
}
  
function updateTimer(timestamp) {
    if (!lastTimerTimestamp) lastTimerTimestamp = timestamp;
    const delta = timestamp - lastTimerTimestamp;
    const deltaCS = Math.floor(delta / 10);
    if (deltaCS > 0) {
      timerTime -= deltaCS;
      lastTimerTimestamp = timestamp;
      if (timerTime <= 0) {
        timerTime = 0;
        updateTimerDisplay();
        timerRunning = false;
        alert('Timer is up!');
        return;
      }
      updateTimerDisplay();
    }
    if (timerRunning) {
      timerRAF = requestAnimationFrame(updateTimer);
    }
}
  
startTimerBtn.addEventListener('click', () => {
    if (timerRunning) {
        document.getElementById("timer-error").innerText = `Timer is already running! Stop the timer and start again`;
        startTimerBtn.style.display = "none";
        setTimeout(() => {
            document.getElementById("timer-error").innerText = ``;
        }, 2500);
        return;
    };
    const hours = parseInt(timerHoursInput.value) || 0;
    const minutes = parseInt(timerMinutesInput.value) || 0;
    const seconds = parseInt(timerSecondsInput.value) || 0;
    timerTime = (hours * 3600 + minutes * 60 + seconds) * 100;
    if (timerTime <= 0) {
        document.getElementById("timer-error").innerText = `No (valid) time entered! Enter a valid number and start again`;
        setTimeout(() => {
            document.getElementById("timer-error").innerText = ``;
        }, 2500);
        return;
    };
    timerRunning = true;
    lastTimerTimestamp = 0;
    timerRAF = requestAnimationFrame(updateTimer);
    startTimerBtn.style.display = "none";
});
  
resetTimerBtn.addEventListener('click', () => {
    timerRunning = false;
    cancelAnimationFrame(timerRAF);
    timerTime = 0;
    lastTimerTimestamp = 0;
    updateTimerDisplay();
    startTimerBtn.style.display = "block";
});