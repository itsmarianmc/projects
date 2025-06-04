document.addEventListener("DOMContentLoaded", () => {
  const weightInput = document.getElementById("weight");
  const resultField = document.getElementById("firstGoalInput");

  const fields = {
      gender: 'male',
      activity: 'low',
      season: 'cold'
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
      if (document.getElementById('dropdown-gender')) setupDropdown('dropdown-gender', 'gender');
      if (document.getElementById('dropdown-activity')) setupDropdown('dropdown-activity', 'activity');
      if (document.getElementById('dropdown-season')) setupDropdown('dropdown-season', 'season');
  }, 2000);

  weightInput.addEventListener('input', calculate);

  function calculate() {
      const w = parseFloat(weightInput.value);
      if (!w || w <= 0) {
          resultField.value = '';
          return;
      }
      let base = w * 24.33333333333333;
      if (fields.gender === 'male') base += 150;
      if (fields.gender === 'pregnant') base += 300;
      if (fields.gender === 'breastfeeding') base += 700;
      if (fields.gender === 'nospecification') base += 80;
      if (fields.activity === 'medium') base += 300;
      if (fields.activity === 'high') base += 700;
      if (fields.season === 'mild') base += 200;
      if (fields.season === 'warm') base += 450;
      if (fields.season === 'hot') base += 650;

      resultField.value = Math.round(base);
  }
});