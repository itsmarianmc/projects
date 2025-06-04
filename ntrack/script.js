const setupScreen = document.getElementById('setupScreen');
const setupSubjForm = document.getElementById('setupForm');
const setupSubjInput = document.getElementById('setupSubjectInput');
const setupSubjList = document.getElementById('setupSubjectList');
const setupTypeForm = document.getElementById('setupTypeForm');
const setupTypeInput = document.getElementById('setupTypeInput');
const setupTypeWeight = document.getElementById('setupTypeWeight');
const setupTypeList = document.getElementById('setupTypeList');
const startBtn = document.getElementById('startBtn');

const sidebar = document.getElementById('sidebar');
const subjectList = document.getElementById('subjectList');
const subjectInput = document.getElementById('subjectInput');

const main = document.getElementById('main');
const welcome = document.getElementById('welcome');
const notesCard = document.getElementById('notesCard');
const currentSubjectTitle = document.getElementById('currentSubject');
const addNoteForm = document.getElementById('addNoteForm');
const noteTypeSelect = document.getElementById('noteTypeSelect');
const gradeInput = document.getElementById('gradeInput');
const notesTable = document.getElementById('notesTable');
const subjectAverage = document.getElementById('subjectAverage');
const overallAverage = document.getElementById('overallAverage');

const subjectContextMenu = document.getElementById('subjectContextMenu');
const renameSubjectItem = document.getElementById('renameSubject');
const deleteSubjectItem = document.getElementById('deleteSubject');

let types = {};
let subjects = {};
let currentSubject = '';
let contextSubjectName = null;

// Load saved subjects and types from localStorage
function loadData() {
	const raw = localStorage.getItem('gradesApp');
	if (raw) {
		const data = JSON.parse(raw);
		subjects = data.subjects || {};
		types = data.types || {};
	}
}

// Save current state to localStorage
function saveData() {
	localStorage.setItem('gradesApp', JSON.stringify({
		subjects,
		types
	}));
}

// Handle subject setup form submission (add new subject)
setupSubjForm.addEventListener('submit', e => {
	e.preventDefault();
	document.getElementById("setupSubjectList").style.display = "block";
	const name = setupSubjInput.value.trim();
	if (name && !subjects[name]) {
		subjects[name] = [];
		addSetupListItem(setupSubjList, name, () => {
			delete subjects[name];
			toggleStart();
			saveData();
		});
		setupSubjInput.value = '';
		toggleStart();
		saveData();
	}
});

// Handle type setup form submission (add new grading type)
setupTypeForm.addEventListener('submit', e => {
	e.preventDefault();
	document.getElementById("setupTypeList").style.display = "block";
	const name = setupTypeInput.value.trim();
	const w = parseFloat(setupTypeWeight.value);
	if (name && !types[name] && !isNaN(w)) {
		types[name] = w;
		addSetupListItem(setupTypeList, `${name} (Wt. ${w})`, () => {
			delete types[name];
			toggleStart();
			saveData();
		});
		setupTypeInput.value = '';
		setupTypeWeight.value = '';
		toggleStart();
		saveData();
	}
});

// Create interactive list item for setup screens
function addSetupListItem(ul, text, onDelete) {
	const li = document.createElement('li');
	li.style.display = 'flex';
	li.style.gap = '5px';
	li.style.justifyContent = 'space-between';
	li.style.alignItems = 'center';
	li.innerHTML = `<div style="text-align: left; width: 100%"><a>${text}</a></div>`;
	const del = document.createElement('button');
	del.textContent = '✖';
	del.onclick = () => {
		onDelete();
		ul.removeChild(li);
		saveData();
		toggleStart();
	};
	li.appendChild(del);
	ul.appendChild(li);
}

// Enable/disable start button based on setup completion
function toggleStart() {
	startBtn.disabled = !(Object.keys(subjects).length && Object.keys(types).length);
}

// Initialize main interface after setup completion
startBtn.onclick = () => {
	if (Object.keys(subjects).length && Object.keys(types).length) {
		saveData();
		setupScreen.classList.add('hidden');
		sidebar.classList.remove('hidden');
		main.classList.remove('hidden');
		renderSubjects();
		populateTypeSelect();
		welcome.querySelector('h3').textContent = 'Welcome back to N\'Track!';
		welcome.querySelector('p').textContent = 'Select a subject and enter grades or manage your subjects.';
	}
};

// Render subject list in sidebar with interactive controls
function renderSubjects() {
	subjectList.innerHTML = '';
	Object.keys(subjects).forEach(name => {
		const li = document.createElement('li');
		li.style.display = 'flex';
		li.style.gap = '5px';
		li.style.justifyContent = 'space-between';
		li.style.alignItems = 'center';

		const btn = document.createElement('button');
		btn.textContent = name;
		btn.classList.add('subject-name');
		btn.classList.toggle('active', name === currentSubject);
		btn.style.flexGrow = '1';
		btn.onclick = () => selectSubject(name);
		btn.oncontextmenu = (e) => {
			e.preventDefault();
			contextSubjectName = name;
			showContextMenu(e.pageX, e.pageY);
		};

		const editBtn = document.createElement('button');
		editBtn.textContent = '🖊️';
		editBtn.classList.add('subject-action-edit');
		editBtn.onclick = () => {
			contextSubjectName = name;
			editSubject();
		};

		const deleteBtn = document.createElement('button');
		deleteBtn.textContent = '🗑️';
		deleteBtn.classList.add('subject-action-remove');
		deleteBtn.onclick = (e) => {
			e.stopPropagation();
			if (confirm(`Do you want to delete "${name}"?\nAll notes entered will be deleted. This action cannot be undone unless you have downloaded a backup. Do you want to proceed?`)) {
				delete subjects[name];
				if (currentSubject === name) {
					currentSubject = '';
					notesCard.classList.add('hidden');
					welcome.classList.remove('hidden');
				}
				saveData();
				renderSubjects();
				updateOverall();
			}
		};

		const rightControls = document.createElement('div');
		rightControls.style.display = 'flex';
		rightControls.appendChild(editBtn);
		rightControls.appendChild(deleteBtn);

		li.appendChild(btn);
		li.appendChild(rightControls);
		subjectList.appendChild(li);
	});
	updateOverall();
}

// Select subject and display its grade entries
function selectSubject(name) {
	if (document.getElementById('settingsScreen').classList.contains('hidden')) {
		currentSubject = name;
		currentSubjectTitle.textContent = `Entries: ${name}`;
		welcome.classList.add('hidden');
		notesCard.classList.remove('hidden');
		saveData();
		renderNotes();
		renderSubjects();
	}
}

// Handle new grade entry submission
addNoteForm.addEventListener('submit', e => {
	e.preventDefault();

	const type = noteTypeSelect.value;
	const g = parseFloat(gradeInput.value);
	const d = document.getElementById('dateInput').value || new Date().toISOString().split('T')[0];
	const year = document.getElementById('halfyearSelect').value;

	if (type && !isNaN(g) && year) {
		subjects[currentSubject].push({
			type,
			weight: types[type],
			grade: g,
			date: d,
			year
		});

		gradeInput.value = '';
		document.getElementById('halfyearSelect').value = '';
		saveData();
		renderNotes();
		updateOverall();
	}
});

// Populate type selector with available grading types
function populateTypeSelect() {
	noteTypeSelect.innerHTML = '<option value="" disabled selected>Select type</option>';
	Object.keys(types).forEach(t => {
		const opt = document.createElement('option');
		opt.value = t;
		opt.textContent = `${t} (Wt. ${types[t]})`;
		noteTypeSelect.appendChild(opt);
	});
}

function updateSubjectAverage() {
	const entries = subjects[currentSubject];
	if (!entries || entries.length === 0) {
		subjectAverage.textContent = "Ø -";
		return;
	}

	const overallAvg = calcWeighted(entries);
	subjectAverage.textContent = `Ø ${overallAvg.toFixed(2)}`;
}

function addYearSeparator(label, average) {
	const tr = document.createElement('tr');
	const avgText = average !== null ? ` (Ø ${average.toFixed(2)})` : '';
	tr.innerHTML = `<td colspan="6" style="text-align: center; font-weight: bold; border-top: 2px solid #999; padding-top: 8px;">
        ${label}${avgText}
    </td>`;
	notesTable.appendChild(tr);
}

function createNoteRow(e, i) {
	const row = document.createElement('tr');
	row.innerHTML =
		`<td>${e.type}</td>
        <td>${e.grade.toFixed(1)}</td>
        <td>${e.weight.toFixed(1)}</td>
        <td>${e.date || '–'}</td>
        <td class="actions">
            <button onclick="editGrade(${i})">✏️</button>
            <button onclick="editDate(${i})">📅</button>
            <button onclick="deleteEntry(${i})">🗑️</button>
        </td>`;
	return row;
}

// Render grade entries table and calculate subject average
function renderNotes() {
	notesTable.innerHTML = '';

	const entries = subjects[currentSubject];

	const grouped = {
		Y1: [],
		Y2: [],
		unknown: []
	};

	entries.forEach((e, realIndex) => {
		const group = e.year === 'Y1' ? 'Y1' : e.year === 'Y2' ? 'Y2' : 'unknown';
		grouped[group].push({
			entry: e,
			index: realIndex
		});
	});

	let allDisplayed = [];

	if (grouped.Y1.length) {
		const y1Avg = calcWeighted(grouped.Y1.map(e => e.entry));
		addYearSeparator("Year 1", y1Avg);
		grouped.Y1.forEach(({
			entry,
			index
		}) => {
			notesTable.appendChild(createNoteRow(entry, index));
			allDisplayed.push(entry);
		});
	}

	if (grouped.Y2.length) {
		const y2Avg = calcWeighted(grouped.Y2.map(e => e.entry));
		addYearSeparator("Year 2", y2Avg);
		grouped.Y2.forEach(({
			entry,
			index
		}) => {
			notesTable.appendChild(createNoteRow(entry, index));
			allDisplayed.push(entry);
		});
	}

	if (grouped.unknown.length) {
		const unkAvg = calcWeighted(grouped.unknown.map(e => e.entry));
		addYearSeparator("Unknown period", unkAvg);
		grouped.unknown.forEach(({
			entry,
			index
		}) => {
			notesTable.appendChild(createNoteRow(entry, index));
			allDisplayed.push(entry);
		});
	}

	updateSubjectAverage();
}

// Edit existing grade entry
window.editGrade = i => {
	const e = subjects[currentSubject][i];
	const newGrade = parseFloat(prompt('Edit grade/mark:', e.grade));
	if (isNaN(newGrade)) return;

	e.grade = newGrade;
	saveData();
	renderNotes();
	updateOverall();
};

// Edit entry date with validation
window.editDate = i => {
	const entry = subjects[currentSubject][i];
	const overlay = document.getElementById('dateOverlay');
	document.getElementById('overlaySubject').textContent = currentSubject;
	document.getElementById('overlayType').textContent = `Type: ${entry.type} (Wt. ${entry.weight})`;
	document.getElementById('overlayGrade').textContent = `Grade: ${entry.grade.toFixed(1)}`;
	document.getElementById('overlayDate').value = entry.date || '';
	overlay.classList.remove('hidden');
	document.getElementById('overlayCancel').onclick = () => {
		overlay.classList.add('hidden');
	};
	document.getElementById('overlaySave').onclick = () => {
		const newDate = document.getElementById('overlayDate').value;
		if (newDate) {
			entry.date = newDate;
			saveData();
			renderNotes();
		}
		overlay.classList.add('hidden');
	};
};

// Delete grade entry
window.deleteEntry = i => {
	subjects[currentSubject].splice(i, 1);
	saveData();
	renderNotes();
	updateOverall();
};

// Calculate weighted average for given entries
function calcWeighted(arr) {
	const totalW = arr.reduce((s, x) => s + x.weight, 0);
	if (!totalW) return 0;
	return arr.reduce((s, x) => s + x.grade * x.weight, 0) / totalW;
}

// Update overall average across all subjects
function updateOverall() {
	const all = Object.values(subjects).flat();
	overallAverage.textContent = all.length ? `Overall average: Ø ${calcWeighted(all).toFixed(2)}` : '';
}

// Show context menu at specified position
function showContextMenu(x, y) {
	subjectContextMenu.style.left = `${x}px`;
	subjectContextMenu.style.top = `${y}px`;
	subjectContextMenu.classList.remove('hidden');
}

// Handle subject renaming/deletion from context menu
renameSubjectItem.onclick = () => editSubject();
deleteSubjectItem.onclick = () => {
	if (confirm(`Delete subject "${contextSubjectName}"?`)) {
		delete subjects[contextSubjectName];
		if (currentSubject === contextSubjectName) {
			currentSubject = '';
			notesCard.classList.add('hidden');
			welcome.classList.remove('hidden');
		}
		saveData();
		renderSubjects();
		updateOverall();
	}
	subjectContextMenu.classList.add('hidden');
};

// Rename subject with validation
function editSubject() {
	const newName = prompt('Rename subject:', contextSubjectName);
	if (newName && newName !== contextSubjectName && !subjects[newName]) {
		subjects[newName] = subjects[contextSubjectName];
		delete subjects[contextSubjectName];
		if (currentSubject === contextSubjectName) currentSubject = newName;
		saveData();
		renderSubjects();
		renderNotes();
	} else if (subjects[newName]) {
		alert('Subject with that name already exists!');
	}
	subjectContextMenu.classList.add('hidden');
}

// Close context menu when clicking outside
document.addEventListener('click', e => {
	if (!subjectContextMenu.contains(e.target)) {
		subjectContextMenu.classList.add('hidden');
	}
});

// Settings screen management functions
document.getElementById('openSettingsBtn').onclick = () => {
	document.getElementById('settingsScreen').classList.remove('hidden');
	main.classList.add('hidden');
	welcome.classList.add('hidden');
	notesCard.classList.add('hidden');
	sidebar.classList.add('hidden');
	renderSettingsTypeList();
	renderSettingsSubjectList();
};

document.getElementById('closeSettingsBtn').onclick = () => {
	document.getElementById('settingsScreen').classList.add('hidden');
	if (!currentSubject) welcome.classList.remove('hidden');
	else notesCard.classList.remove('hidden');
	sidebar.classList.remove('hidden');
	main.classList.remove('hidden');
};

// Handle type addition in settings
document.getElementById('settingsAddTypeForm').addEventListener('submit', e => {
	e.preventDefault();
	const name = document.getElementById('settingsTypeInput').value.trim();
	const w = parseFloat(document.getElementById('settingsTypeWeight').value);
	if (name && !types[name] && !isNaN(w)) {
		types[name] = w;
		document.getElementById('settingsTypeInput').value = '';
		document.getElementById('settingsTypeWeight').value = '';
		saveData();
		populateTypeSelect();
		renderSettingsTypeList();
	}
});

// Data export functionality
document.getElementById('exportBtn').onclick = () => {
	const data = {
		subjects,
		types
	};
	const blob = new Blob([JSON.stringify(data, null, 2)], {
		type: 'application/json'
	});
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	const date = new Date();
	const formattedDate = `${date.getFullYear()}_${String(date.getMonth() + 1).padStart(2, '0')}_${String(date.getDate()).padStart(2, '0')}`;
	a.download = `N'Track_data_${formattedDate}.json`;
	a.click();
	URL.revokeObjectURL(url);
};

// Data import functionality
document.getElementById('importBtn').addEventListener('click', () => {
	document.getElementById('importInput').click();
});

document.getElementById('settingsImportBtn').addEventListener('click', () => {
	document.getElementById('importInput').click();
});

document.getElementById('importInput').addEventListener('change', e => {
	const file = e.target.files[0];
	if (!file) return;
	const reader = new FileReader();
	reader.onload = event => {
		try {
			const data = JSON.parse(event.target.result);
			if (data.subjects && data.types) {
				subjects = data.subjects;
				types = data.types;
				saveData();

				setupScreen.classList.add('hidden');
				sidebar.classList.remove('hidden');
				main.classList.remove('hidden');
				welcome.classList.add('hidden');
				notesCard.classList.add('hidden');
				document.getElementById('settingsScreen').classList.add('hidden');

				renderSubjects();
				populateTypeSelect();
				renderSettingsTypeList();
				alert("Your backup has been successfully imported! Press \"Ok\" to continue");
				location.reload();
			} else {
				alert("Invalid file");
			}
		} catch (err) {
			alert("Import error");
		}
	};
	reader.readAsText(file);
});

// Render types list in settings
function renderSettingsTypeList() {
	const list = document.getElementById('settingsTypeListDisplay');
	list.innerHTML = '';
	Object.keys(types).forEach(type => {
		const li = document.createElement('li');
		li.style.display = 'flex';
		li.style.justifyContent = 'space-between';
		li.style.alignItems = 'center';
		li.style.padding = '4px 0';
		li.innerHTML = `<div style="width: 100%; word-break: break-all;">${type} (Wt. ${types[type]})</div><button class="settings-type-delete-btn" onclick="deleteType('${type}')">✖</button>`;
		list.appendChild(li);
	});
}

// Delete type from settings
window.deleteType = type => {
	if (confirm(`Delete type "${type}"?`)) {
		delete types[type];
		saveData();
		populateTypeSelect();
		renderSettingsTypeList();
		renderNotes();
		updateOverall();
	}
};

// Render subjects list in settings
function renderSettingsSubjectList() {
	const list = document.getElementById('settingsSubjectListDisplay');
	list.innerHTML = '';
	list.style.display = 'flex';
	list.style.flexDirection = 'column';
	list.style.gap = '5px';
	list.style.width = "100%";
	Object.keys(subjects).forEach(subject => {
		const li = document.createElement('li');
		li.style.display = 'flex';
		li.style.justifyContent = 'space-between';
		li.style.flexDirection = 'row';
		li.style.alignItems = 'center';
		li.innerHTML = `<div style="width: 100%; word-break: break-all;">${subject}</div><button class="settings-subject-delete-btn" onclick="deleteSubjectFromSettings('${subject}')">✖</button>`;
		list.appendChild(li);
	});
}

// Delete subject from settings
window.deleteSubjectFromSettings = name => {
	if (confirm(`Do you want to delete "${name}"?\nAll notes entered will be deleted. This action cannot be undone unless you have downloaded a backup. Do you want to proceed?`)) {
		delete subjects[name];
		if (currentSubject === name) {
			currentSubject = '';
			notesCard.classList.add('hidden');
			welcome.classList.remove('hidden');
		}
		saveData();
		renderSubjects();
		renderSettingsSubjectList();
		updateOverall();
	}
};

// Handle subject addition in settings
document.getElementById('settingsAddSubjectForm').addEventListener('submit', e => {
	e.preventDefault();
	const name = document.getElementById('settingsSubjectInput').value.trim();
	if (name && !subjects[name]) {
		subjects[name] = [];
		document.getElementById('settingsSubjectInput').value = '';
		saveData();
		renderSubjects();
		renderSettingsSubjectList();
	}
});

function checkInitialState() {
	if (Object.keys(subjects).length > 0 && Object.keys(types).length > 0) {
		setupScreen.classList.add('hidden');
		sidebar.classList.remove('hidden');
		main.classList.remove('hidden');
		renderSubjects();
		populateTypeSelect();
	}
}

// Initial setup check and data load
loadData();
checkInitialState();