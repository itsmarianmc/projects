document.addEventListener("DOMContentLoaded", () => {
    const weightInput = document.getElementById("weight2");
    const resultField = document.getElementById("goalInput");

    const fields = {
        gender: 'male2',
        activity: 'low2',
        season: 'cold2'
    };

    function setupDropdown(dropdownId, fieldKey) {
        const dd = document.getElementById(dropdownId);
        if (!dd) {
            console.error(`Dropdown with ID "${dropdownId}" not found.`);
            return;
        }
        const selected = dd.querySelector('.dropdown__selected');
        const list = dd.querySelector('.dropdown__list');
        const items = dd.querySelectorAll('.dropdown__item');

        selected.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.dropdown').forEach(d => {
                if (d !== dd) d.classList.remove('open');
            });
            dd.classList.toggle('open');
        });

        items.forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const val = item.dataset.value;
                const txt = item.textContent;

                fields[fieldKey] = val;
                selected.querySelector('span').textContent = txt;
                dd.dataset.value = val;
                dd.classList.remove('open');

                items.forEach(i => i.classList.remove('active'));
                item.classList.add('active');

                calculate();
            });

            if (item.dataset.value === fields[fieldKey]) {
                item.classList.add('active');
            }
        });

        document.addEventListener('click', (e) => {
            if (!dd.contains(e.target)) {
                dd.classList.remove('open');
            }
        });
    }

    setTimeout(() => {
        setupDropdown('dropdown-gender2', 'gender');
        setupDropdown('dropdown-activity2', 'activity');
        setupDropdown('dropdown-season2', 'season');
    }, 0);

    weightInput.addEventListener('input', calculate);

    function calculate() {
        const w = parseFloat(weightInput.value);
        if (isNaN(w)) {
            alert('Please enter a valid number for weight.');
            resultField.value = '';
            weightInput.value = '';
            return;
        } if (!w || w <= 0) {
            resultField.value = '';
            return;
        }

        let base = w * 24.33333333333333;
        if (fields.gender === 'male2') base += 150;
        if (fields.gender === 'pregnant2') base += 300;
        if (fields.gender === 'breastfeeding2') base += 700;
        if (fields.gender === 'nospecification2') base += 80;
        if (fields.activity === 'medium2') base += 300;
        if (fields.activity === 'high2') base += 700;
        if (fields.season === 'mild2') base += 200;
        if (fields.season === 'warm2') base += 450;
        if (fields.season === 'hot2') base += 650;

        resultField.value = Math.round(base);
    }

    document.getElementById("setGoal").addEventListener("click", (e) => {
        e.preventDefault();
        updateGoal();
        setTimeout(() => {
            document.querySelector(".bg-blur").style.display = "none";
            document.getElementById("event-changer").style.display = "none";
        }, 2000);
    });
});