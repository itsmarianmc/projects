let elements = [];

const mainTable = document.getElementById('main-table');
const lanthanidesTable = document.getElementById('lanthanides');
const actinidesTable = document.getElementById('actinides');
const detailSection = document.getElementById('detail-section');
const detailSymbol = document.getElementById('detail-symbol');
const detailName = document.getElementById('detail-name');
const detailNumber = document.getElementById('detail-number');
const propertiesGrid = document.getElementById('properties');
const descriptionElement = document.getElementById('description');
const searchInput = document.getElementById('search');
const filterButtons = document.querySelectorAll('.filter-btn');

const categoryColors = {
	alkali: "var(--alkali)",
	alkaline: "var(--alkaline)",
	transition: "var(--transition)",
	metal: "var(--metal)",
	metalloid: "var(--metalloid)",
	nonmetal: "var(--nonmetal)",
	halogen: "var(--nonmetal)",
	noble: "var(--noble)",
	lanthanide: "var(--lanthanide)",
	actinide: "var(--actinide)",
	unknown: "var(--unknown)"
};

async function loadElements() {
	try {
		const response = await fetch('elements.json');
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		elements = await response.json();
		initPeriodicTable();
		const hydrogen = elements.find(e => e.number === 1);
		if (hydrogen) showElementDetails(hydrogen);
	} catch (err) {
		console.error('Fehler beim Laden der Elemente:', err);
	}
}

function initPeriodicTable() {
	mainTable.innerHTML = '';
	lanthanidesTable.innerHTML = '';
	actinidesTable.innerHTML = '';

	elements.filter(e => e.period < 6 || (e.period === 6 && e.group < 3))
		.sort((a, b) => (a.period - b.period) || (a.group - b.group))
		.forEach(el => mainTable.appendChild(createElementCard(el)));

	elements.filter(e => e.category === 'lanthanide')
		.sort((a, b) => a.number - b.number)
		.forEach(el => lanthanidesTable.appendChild(createElementCard(el)));

	elements.filter(e => e.category === 'actinide')
		.sort((a, b) => a.number - b.number)
		.forEach(el => actinidesTable.appendChild(createElementCard(el)));
}

function createElementCard(element) {
	const card = document.createElement('div');
	card.className = 'element';
	card.dataset.number = element.number;
	card.dataset.category = element.category;
	card.style.backgroundColor = categoryColors[element.category] || "var(--unknown)";
	card.innerHTML = `
                <div class="number">${element.number}</div>
                <div class="symbol">${element.symbol}</div>
                <div class="name">${element.name}</div>
            `;
	card.addEventListener('click', () => showElementDetails(element));
	return card;
}

function showElementDetails(element) {
	document.querySelectorAll('.element.selected').forEach(el => el.classList.remove('selected'));
	const elementCard = document.querySelector(`.element[data-number="${element.number}"]`);
	if (elementCard) elementCard.classList.add('selected');

	detailSymbol.textContent = element.symbol;
	detailSymbol.style.backgroundColor = categoryColors[element.category] || "var(--unknown)";
	detailName.textContent = element.name;
	detailNumber.textContent = element.number;
	descriptionElement.textContent = element.description;

	propertiesGrid.innerHTML = `
                <div class="property-card">
                    <div class="property-name">Atomic Mass</div>
                    <div class="property-value">${element.mass} u</div>
                </div>
                <div class="property-card">
                    <div class="property-name">Melting Point</div>
                    <div class="property-value">${element.melt} °C</div>
                </div>
                <div class="property-card">
                    <div class="property-name">Boiling Point</div>
                    <div class="property-value">${element.boil} °C</div>
                </div>
                <div class="property-card">
                    <div class="property-name">Density</div>
                    <div class="property-value">${element.density} g/cm³</div>
                </div>
                <div class="property-card">
                    <div class="property-name">Electron Configuration</div>
                    <div class="property-value">${element.config}</div>
                </div>
                <div class="property-card">
                    <div class="property-name">Electronegativity</div>
                    <div class="property-value">${element.electronegativity || '—'}</div>
                </div>
            `;

	detailSection.classList.add('active');
	detailSection.scrollIntoView({
		behavior: 'smooth'
	});
}

searchInput.addEventListener('input', () => {
	const searchTerm = searchInput.value.toLowerCase().trim();
	document.querySelectorAll('.element').forEach(card => {
		const num = card.dataset.number;
		const el = elements.find(e => e.number == num);
		const matches = el.name.toLowerCase().includes(searchTerm) ||
			el.symbol.toLowerCase().includes(searchTerm) ||
			el.number.toString().includes(searchTerm);
		card.style.display = matches ? 'flex' : 'none';
	});
});

filterButtons.forEach(button => {
	button.addEventListener('click', () => {
		const cat = button.dataset.category;
		filterButtons.forEach(btn => btn.classList.remove('active'));
		button.classList.add('active');
		document.querySelectorAll('.element').forEach(card => {
			card.style.display = (cat === 'all' || card.dataset.category === cat) ? 'flex' : 'none';
		});
	});
});

document.addEventListener('DOMContentLoaded', loadElements);