const dropdown = document.getElementById('category-dropdown');
const toggleBtn = dropdown.querySelector('.dropdown-toggle');
const menu = dropdown.querySelector('.dropdown-menu');
const checkboxes = menu.querySelectorAll('input[name="category"]');
const allCheckbox = checkboxes[0];

let collapseTimeout;

toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
    if (dropdown.classList.contains('open')) {
        toggleBtn.textContent = 'Menü einklappen ▲';
    } else {
        updateToggleText();
    }
});

function scheduleCollapseText() {
    clearTimeout(collapseTimeout);
    collapseTimeout = setTimeout(() => {
        if (dropdown.classList.contains('open')) {
            toggleBtn.textContent = 'Menü einklappen ▲';
        }
    }, 3333);
}

function updateToggleText() {
    clearTimeout(collapseTimeout);

    const checked = Array.from(checkboxes)
        .filter(cb => cb.checked && cb.value !== 'all')
        .map(cb => cb.parentElement.nextElementSibling.querySelector('a').textContent.trim());

    if (allCheckbox.checked || checked.length === checkboxes.length - 1) {
        allCheckbox.checked = true;
        toggleBtn.textContent = dropdown.classList.contains('open')
            ? 'Alle Kategorien ausgewählt ▼'
            : 'Alle Kategorien ausgewählt ▼';
        if (dropdown.classList.contains('open')) scheduleCollapseText();
    }
    else if (checked.length > 0) {
        toggleBtn.textContent = checked.join(', ') + ' ▼';
        if (dropdown.classList.contains('open')) scheduleCollapseText();
    }
    else {
        toggleBtn.textContent = 'Kategorien auswählen ▼';
        if (dropdown.classList.contains('open')) scheduleCollapseText();
    }
}

checkboxes.forEach(cb => cb.addEventListener('click', (e) => {
    e.stopPropagation();
    if (cb.value === 'all') {
        checkboxes.forEach(c => c.checked = cb.checked);
    } else {
        if (!cb.checked && allCheckbox.checked) {
            allCheckbox.checked = false;
        }
        const checkedCount = Array.from(checkboxes)
            .filter(c => c.checked && c.value !== 'all').length;
        if (checkedCount === checkboxes.length - 1) {
            allCheckbox.checked = true;
        }
    }
    updateToggleText();
}));

document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target)) {
        dropdown.classList.remove('open');
        updateToggleText();
    }
});

window.addEventListener('load', () => {
    const initiallyChecked = Array.from(checkboxes)
        .filter(cb => cb.checked && cb.value !== 'all').length;
    if (initiallyChecked === checkboxes.length - 1) {
        allCheckbox.checked = true;
    }
    updateToggleText();
});
