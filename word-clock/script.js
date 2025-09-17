document.getElementById("showGUI").addEventListener("click", function() {
	const controls = document.querySelectorAll(".controls");
	const header = document.querySelector(".cont-header");
	const footer = document.querySelector("footer");
	const guiBtn = document.getElementById("showGUI");

	if (controls[0].style.display === "none") {
		controls.forEach(control => control.style.display = "flex");
		footer.style.display = "flex";
		header.style.display = "block";
		document.body.style.justifyContent = "";
		this.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 -960 960 960" width="16" fill="#fff"><path d="M440-440v240h-80v-160H200v-80h240Zm160-320v160h160v80H520v-240h80Z"/></svg> HIDE GUI`;
	} else {
		controls.forEach(control => control.style.display = "none");
		footer.style.display = "none";
		header.style.display = "none";
		document.body.style.justifyContent = "center";
		this.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 -960 960 960" width="16" fill="#fff"><path d="M200-200v-240h80v160h160v80H200Zm480-320v-160H520v-80h240v240h-80Z"/></svg>`;
	}
});

document.addEventListener('DOMContentLoaded', function() {
	const wordConfig = {
		"ES": {
			positions: [
				[3, 14],
				[3, 15]
			]
		},
		"IST": {
			positions: [
				[4, 7],
				[4, 8],
				[4, 9]
			]
		},
		"EINS": {
			positions: [
				[13, 0],
				[13, 1],
				[13, 2],
				[13, 3]
			]
		},
		"ZWEI": {
			positions: [
				[13, 9],
				[13, 10],
				[13, 11],
				[13, 12]
			]
		},
		"DREI": {
			positions: [
				[13, 5],
				[13, 6],
				[13, 7],
				[13, 8]
			]
		},
		"VIER": {
			positions: [
				[13, 13],
				[13, 14],
				[13, 15]
			]
		},
		"FÜNF": {
			positions: [
				[8, 0],
				[8, 1],
				[8, 2],
				[8, 3]
			]
		},
		"SECHS": {
			positions: [
				[12, 0],
				[12, 1],
				[12, 2],
				[12, 3],
				[12, 4]
			]
		},
		"SIEBEN": {
			positions: [
				[11, 10],
				[11, 11],
				[11, 12],
				[11, 13],
				[11, 14],
				[11, 15]
			]
		},
		"ACHT": {
			positions: [
				[14, 0],
				[14, 1],
				[14, 2],
				[14, 3]
			]
		},
		"NEUN": {
			positions: [
				[12, 5],
				[12, 6],
				[12, 7],
				[12, 8]
			]
		},
		"ZEHN": {
			positions: [
				[7, 0],
				[7, 1],
				[7, 2],
				[7, 3]
			]
		},
		"ELF": {
			positions: [
				[12, 13],
				[12, 14],
				[12, 15]
			]
		},
		"ZWÖLF": {
			positions: [
				[14, 4],
				[14, 5],
				[14, 6],
				[14, 7],
				[14, 8]
			]
		},
		"VIERTEL": {
			positions: [
				[9, 9],
				[9, 10],
				[9, 11],
				[9, 12],
				[9, 13],
				[9, 14],
				[9, 15]
			]
		},
		"ZWANZIG": {
			positions: [
				[5, 8],
				[5, 9],
				[5, 10],
				[5, 11],
				[5, 12],
				[5, 13],
				[5, 14]
			]
		},
		"HALB": {
			positions: [
				[6, 0],
				[6, 1],
				[6, 2],
				[6, 3]
			]
		},
		"HALBNACH": {
			positions: [
				[11, 5],
				[11, 6],
				[11, 7],
				[11, 8]
			]
		},
		"NACH": {
			positions: [
				[11, 0],
				[11, 1],
				[11, 2],
				[11, 3]
			]
		},
		"VOR": {
			positions: [
				[10, 0],
				[10, 1],
				[10, 2]
			]
		},
		"UHR": {
			positions: [
				[14, 13],
				[14, 14],
				[14, 15]
			]
		},
		"GEBURTSTAG": {
			positions: [
				[0, 5],
				[0, 6],
				[0, 7],
				[0, 8],
				[0, 9],
				[0, 10],
				[0, 11],
				[0, 12],
				[0, 13],
				[0, 14]
			]
		},
		"MÜLL": {
			positions: [
				[1, 0],
				[1, 1],
				[1, 2],
				[1, 3],
				[3, 10],
				[3, 11],
				[3, 12],
				[3, 13],
				[4, 0],
				[4, 1],
				[4, 2],
				[4, 3],
				[4, 4],
				[4, 5],
				[4, 6]
			]
		},
		"GELBER": {
			positions: [
				[4, 10],
				[4, 11],
				[4, 12],
				[4, 13],
				[4, 14],
				[4, 15],
				[5, 0],
				[5, 1],
				[5, 2],
				[5, 3]
			]
		},
		"URLAUB": {
			positions: [
				[6, 5],
				[6, 6],
				[6, 7],
				[6, 8],
				[6, 9],
				[6, 10]
			]
		},
		"PLUS": {
			positions: [
				[15, 1]
			]
		},
		"MINUTEN": {
			positions: [
				[15, 8],
				[15, 9],
				[15, 10],
				[15, 11],
				[15, 12],
				[15, 13],
				[15, 14]
			]
		},
		"MINUTE": {
			positions: [
				[15, 8],
				[15, 9],
				[15, 10],
				[15, 11],
				[15, 12],
				[15, 13]
			]
		}
	};

	const letterMatrix = [
		"ALARMGEBURTSTAGW",
		"MÜLLAUTOFEIERTAG",
		"AFORMEL1DOWNLOAD",
		"WLANUPDATERAUSES",
		"BRINGENISTGELBER",
		"SACKZEITZWANZIGF",
		"HALBGURLAUBGENAU",
		"ZEHNWERKSTATTZUM",
		"FÜNFRISEURZOCKEN",
		"WORDCLOCKVIERTEL",
		"VORNEUSTARTERMIN",
		"NACHLHALBVSIEBEN",
		"SECHSNEUNZEHNELF",
		"EINSDREIVIERZWEI",
		"ACHTZWÖLFFÜNFUHR",
		"S+1234OKMINUTENW"
	];

	const clockContainer = document.getElementById('clockContainer');
	const digitalClock = document.getElementById('digitalClock');
	const dateDisplay = document.getElementById('dateDisplay');
	const eventIndicator = document.getElementById('eventIndicator');
	const eventButtons = document.querySelectorAll('.event-btn');
	const settingsPanel = document.getElementById('settingsPanel');
	const saveEventBtn = document.getElementById('saveEvent');
	const clearEventsBtn = document.getElementById('clearEvents');

	let activeEvent = null;
	let customEvents = [];
	let eventsConfig = {};
	let manualEvents = [];

	initClock();
	setupEventsConfig();
	updateTime();
	setInterval(updateTime, 1000);

	eventButtons.forEach(button => {
		button.addEventListener('click', function() {
			const eventType = this.getAttribute('data-event');
			if (eventType === 'custom') {
				settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'block';
			} else {
				triggerEvent(eventType, true);
			}
		});
	});

	clearEventsBtn.addEventListener('click', function() {
		resetEvents();
		manualEvents = [];
		eventIndicator.className = 'event-indicator';
		eventIndicator.textContent = '';
	});

	saveEventBtn.addEventListener('click', function() {
		const eventName = document.getElementById('eventName').value;
		const eventType = document.getElementById('eventType').value;
		const eventDateTime = document.getElementById('eventDateTime').value;

		if (eventName && eventDateTime) {
			const eventDate = new Date(eventDateTime);
			customEvents.push({
				name: eventName,
				type: eventType,
				date: eventDate
			});

			alert(`Event "${eventName}" wurde gespeichert!`);
			document.getElementById('eventName').value = '';
			document.getElementById('eventDateTime').value = '';
			settingsPanel.style.display = 'none';
		} else {
			alert('Bitte füllen Sie alle Felder aus.');
		}
	});

	function initClock() {
		const clearBtn = clockContainer.querySelector('.clear-events');
		clockContainer.innerHTML = '';
		if (clearBtn) {
			clockContainer.appendChild(clearBtn);
		}

		letterMatrix.forEach((row, rowIndex) => {
			const rowElement = document.createElement('div');
			rowElement.className = 'clock-row';

			for (let colIndex = 0; colIndex < row.length; colIndex++) {
				const cell = document.createElement('div');
				cell.className = 'clock-cell';
				cell.textContent = row[colIndex];
				cell.setAttribute('data-row', rowIndex);
				cell.setAttribute('data-col', colIndex);
				rowElement.appendChild(cell);
			}

			clockContainer.appendChild(rowElement);
		});

		if (clearBtn) {
			clockContainer.appendChild(clearBtn);
		}
	}

	function setupEventsConfig() {
		eventsConfig = {
			'birthday': {
				name: 'Geburtstag',
				color: 'event-birthday',
				positions: wordConfig['GEBURTSTAG'].positions
			},
			'trash': {
				name: 'Müll rausbringen',
				color: 'event-trash',
				positions: wordConfig['MÜLL'].positions
			},
			'yellow-bag': {
				name: 'Gelber Sack',
				color: 'event-yellow-bag',
				positions: wordConfig['GELBER'].positions
			},
			'vacation': {
				name: 'Urlaub',
				color: 'event-vacation',
				positions: wordConfig['URLAUB'].positions
			}
		};
	}

	function updateTime() {
		const now = new Date();
		let hours = now.getHours();
		const minutes = now.getMinutes();
		const seconds = now.getSeconds();

		digitalClock.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

		const options = {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		};
		dateDisplay.textContent = now.toLocaleDateString('de-DE', options);

		updateWordClock(hours, minutes);

		if (manualEvents.length === 0) {
			checkEvents(now);
		}
	}

	function updateWordClock(hours, minutes) {
		document.querySelectorAll('.clock-cell').forEach(cell => {
			cell.classList.remove('active');
			cell.classList.remove('minutes');
		});

		activateWord('ES');
		activateWord('IST');

		let hourToShow = hours % 12;
		if (hourToShow === 0) hourToShow = 12;

		let minuteText = '';
		let hourText = '';
		let relationText = '';
		let extraMinutes = minutes % 5;

		if (minutes < 5) {
			minuteText = '';
			relationText = 'UHR';
			hourText = getHourText(hourToShow);
		} else if (minutes < 10) {
			minuteText = 'FÜNF';
			relationText = 'NACH';
			hourText = getHourText(hourToShow);
		} else if (minutes < 15) {
			minuteText = 'ZEHN';
			relationText = 'NACH';
			hourText = getHourText(hourToShow);
		} else if (minutes < 20) {
			minuteText = 'VIERTEL';
			relationText = 'NACH';
			hourText = getHourText(hourToShow);
		} else if (minutes < 25) {
			minuteText = 'ZWANZIG';
			relationText = 'NACH';
			hourText = getHourText(hourToShow);
		} else if (minutes < 30) {
			minuteText = 'FÜNF';
			relationText = 'HALBNACH';
			hourText = getHourText((hourToShow % 12) + 1);
		} else if (minutes < 35) {
			minuteText = 'HALB';
			hourText = getHourText((hourToShow % 12) + 1);
		} else if (minutes < 40) {
			minuteText = 'FÜNF';
			relationText = 'NACH';
			activateWord('HALBNACH');
			hourText = getHourText((hourToShow % 12) + 1);
		} else if (minutes < 45) {
			minuteText = 'ZWANZIG';
			relationText = 'VOR';
			hourText = getHourText((hourToShow % 12) + 1);
		} else if (minutes < 50) {
			minuteText = 'VIERTEL';
			relationText = 'VOR';
			hourText = getHourText((hourToShow % 12) + 1);
		} else if (minutes < 55) {
			minuteText = 'ZEHN';
			relationText = 'VOR';
			hourText = getHourText((hourToShow % 12) + 1);
		} else {
			minuteText = 'FÜNF';
			relationText = 'VOR';
			hourText = getHourText((hourToShow % 12) + 1);
		}

		if (minuteText) activateWord(minuteText);
		if (relationText) activateWord(relationText);
		if (hourText) activateWord(hourText);

		if (extraMinutes > 0) {
			activateMinutes(extraMinutes);
		}

		reapplyManualEvents();
	}

	function getHourText(hour) {
		const hours = {
			1: 'EINS',
			2: 'ZWEI',
			3: 'DREI',
			4: 'VIER',
			5: 'FÜNF',
			6: 'SECHS',
			7: 'SIEBEN',
			8: 'ACHT',
			9: 'NEUN',
			10: 'ZEHN',
			11: 'ELF',
			12: 'ZWÖLF'
		};
		return hours[hour];
	}

	function activateWord(word) {
		if (wordConfig[word] && wordConfig[word].positions) {
			const positions = wordConfig[word].positions;
			positions.forEach(pos => {
				const cell = document.querySelector(`.clock-cell[data-row="${pos[0]}"][data-col="${pos[1]}"]`);
				if (cell) {
					cell.classList.add('active');
				}
			});
		}
	}

	function activateMinutes(minutes) {
		activateWord('PLUS');

		const minutePositions = [
			[15, 2],
			[15, 3],
			[15, 4],
			[15, 5]
		];

		if (minutes >= 1 && minutes <= 4) {
			const pos = minutePositions[minutes - 1];
			const cell = document.querySelector(`.clock-cell[data-row="${pos[0]}"][data-col="${pos[1]}"]`);
			if (cell) {
				cell.classList.add('minutes');
			}
		}

		if (minutes === 1) {
			activateWord('MINUTE');
		} else {
			activateWord('MINUTEN');
		}
	}

	function triggerEvent(eventType, isManual = false) {
		if (isManual) {
			if (!manualEvents.includes(eventType)) {
				manualEvents.push(eventType);
			}
		}

		if (eventsConfig[eventType]) {
			const event = eventsConfig[eventType];
			event.positions.forEach(pos => {
				const cell = document.querySelector(`.clock-cell[data-row="${pos[0]}"][data-col="${pos[1]}"]`);
				if (cell) {
					cell.classList.add(event.color);
					cell.classList.add('event-highlight');
				}
			});

			eventIndicator.textContent = `Aktives Event: ${event.name}`;
			eventIndicator.className = `event-indicator active ${event.color}`;
			activeEvent = eventType;
		}
	}

	function reapplyManualEvents() {
		manualEvents.forEach(eventType => {
			triggerEvent(eventType, false);
		});
	}

	function resetEvents() {
		document.querySelectorAll('.clock-cell').forEach(cell => {
			if (eventsConfig) {
				Object.values(eventsConfig).forEach(event => {
					cell.classList.remove(event.color);
				});
			}
			cell.classList.remove('event-highlight');
		});

		activeEvent = null;
	}

	function checkEvents(now) {
		for (const event of customEvents) {
			const eventDate = new Date(event.date);
			if (
				now.getDate() === eventDate.getDate() &&
				now.getMonth() === eventDate.getMonth() &&
				now.getFullYear() === eventDate.getFullYear()
			) {
				triggerEvent(event.type);
				eventIndicator.textContent = `Heute: ${event.name}`;
				break;
			}
		}
	}
});