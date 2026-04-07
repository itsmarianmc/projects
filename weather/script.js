const CONFIG = {
	api: 'https://itsmarianmc-github.vercel.app/api/weather',
	lat: 43.194,
	lon: -78.687,
	name: 'Lockport, NY',
	timezone: 'auto',
};

const DAYS_DE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

function v(val, unit = '') {
	if (val === null || val === undefined || val === '') return '--';
	return `${val}${unit}`;
}

function getWeatherDetails(code, isDay = true) {
	const c = Number(code);
	const night = !isDay;
	const map = {
		0: {
			desc: 'Klarer Himmel',
			icon: night ? svgMoon() : svgSun()
		},
		1: {
			desc: 'Überwiegend klar',
			icon: night ? svgMoonCloud() : svgSunCloud()
		},
		2: {
			desc: 'Teilweise bewölkt',
			icon: svgCloud()
		},
		3: {
			desc: 'Bedeckt',
			icon: svgOvercast()
		},
		45: {
			desc: 'Neblig',
			icon: svgFog()
		},
		48: {
			desc: 'Gefrierender Nebel',
			icon: svgFog()
		},
		51: {
			desc: 'Leichter Nieselregen',
			icon: svgRain('light')
		},
		53: {
			desc: 'Mäßiger Nieselregen',
			icon: svgRain('med')
		},
		55: {
			desc: 'Starker Nieselregen',
			icon: svgRain('heavy')
		},
		56: {
			desc: 'Gefrierender Nieselregen',
			icon: svgSleet()
		},
		57: {
			desc: 'Starker gefrierender Nieselregen',
			icon: svgSleet()
		},
		61: {
			desc: 'Leichter Regen',
			icon: svgRain('light')
		},
		63: {
			desc: 'Mäßiger Regen',
			icon: svgRain('med')
		},
		65: {
			desc: 'Starker Regen',
			icon: svgRain('heavy')
		},
		66: {
			desc: 'Gefrierender Regen',
			icon: svgSleet()
		},
		67: {
			desc: 'Starker gefrierender Regen',
			icon: svgSleet()
		},
		71: {
			desc: 'Leichter Schneefall',
			icon: svgSnow('light')
		},
		73: {
			desc: 'Mäßiger Schneefall',
			icon: svgSnow('med')
		},
		75: {
			desc: 'Starker Schneefall',
			icon: svgSnow('heavy')
		},
		77: {
			desc: 'Schneekörner',
			icon: svgSnow('light')
		},
		80: {
			desc: 'Leichte Regenschauer',
			icon: svgRain('light')
		},
		81: {
			desc: 'Mäßige Regenschauer',
			icon: svgRain('med')
		},
		82: {
			desc: 'Starke Regenschauer',
			icon: svgRain('heavy')
		},
		85: {
			desc: 'Leichte Schneeschauer',
			icon: svgSnow('light')
		},
		86: {
			desc: 'Starke Schneeschauer',
			icon: svgSnow('heavy')
		},
		95: {
			desc: 'Gewitter',
			icon: svgThunder()
		},
		96: {
			desc: 'Gewitter mit Hagel',
			icon: svgThunderHail()
		},
		99: {
			desc: 'Starkes Gewitter mit Hagel',
			icon: svgThunderHail()
		},
	};
	return map[c] || {
		desc: 'Unbekannt',
		icon: svgSun()
	};
}

function svgSun(size = 64) {
	return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none">
    <circle cx="32" cy="32" r="14" fill="#FFD600"/>
    ${[0,45,90,135,180,225,270,315].map(a => {
      const r = a * Math.PI / 180;
      const x1 = 32 + 18 * Math.sin(r), y1 = 32 - 18 * Math.cos(r);
      const x2 = 32 + 24 * Math.sin(r), y2 = 32 - 24 * Math.cos(r);
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#FFD600" stroke-width="2.5" stroke-linecap="round"/>`;
    }).join('')}
  </svg>`;
}

function svgMoon(size = 64) {
	return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none">
    <path d="M44 32a14 14 0 1 1-14-14 10 10 0 0 0 14 14z" fill="#D0D8FF"/>
  </svg>`;
}

function svgSunCloud(size = 64) {
	return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none">
    <circle cx="24" cy="22" r="10" fill="#FFD600"/>
    ${[0,60,120,180,240,300].map(a => {
      const r = a * Math.PI / 180;
      return `<line x1="${(24 + 13 * Math.sin(r)).toFixed(1)}" y1="${(22 - 13 * Math.cos(r)).toFixed(1)}" x2="${(24 + 18 * Math.sin(r)).toFixed(1)}" y2="${(22 - 18 * Math.cos(r)).toFixed(1)}" stroke="#FFD600" stroke-width="2" stroke-linecap="round"/>`;
    }).join('')}
    <ellipse cx="36" cy="40" rx="14" ry="10" fill="#C8D8E8"/>
    <ellipse cx="24" cy="43" rx="10" ry="8" fill="#C8D8E8"/>
    <ellipse cx="44" cy="43" rx="9" ry="7" fill="#C8D8E8"/>
  </svg>`;
}

function svgMoonCloud(size = 64) {
	return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none">
    <path d="M30 18a10 10 0 1 1-10-10 7 7 0 0 0 10 10z" fill="#D0D8FF"/>
    <ellipse cx="36" cy="40" rx="14" ry="10" fill="#B0C4D8"/>
    <ellipse cx="24" cy="43" rx="10" ry="8" fill="#B0C4D8"/>
    <ellipse cx="44" cy="43" rx="9" ry="7" fill="#B0C4D8"/>
  </svg>`;
}

function svgCloud(size = 64) {
	return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none">
    <ellipse cx="32" cy="36" rx="18" ry="12" fill="#B8CCD8"/>
    <ellipse cx="22" cy="40" rx="12" ry="10" fill="#B8CCD8"/>
    <ellipse cx="42" cy="40" rx="12" ry="10" fill="#B8CCD8"/>
    <ellipse cx="32" cy="28" rx="12" ry="10" fill="#B8CCD8"/>
  </svg>`;
}

function svgOvercast(size = 64) {
	return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none">
    <ellipse cx="32" cy="36" rx="18" ry="12" fill="#8898A8"/>
    <ellipse cx="22" cy="40" rx="12" ry="10" fill="#8898A8"/>
    <ellipse cx="42" cy="40" rx="12" ry="10" fill="#8898A8"/>
    <ellipse cx="32" cy="28" rx="14" ry="11" fill="#8898A8"/>
  </svg>`;
}

function svgFog(size = 64) {
	return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none">
    ${[20, 28, 36, 44].map((y, i) =>
      `<line x1="${12 + i * 2}" y1="${y}" x2="${52 - i * 2}" y2="${y}" stroke="#8898A8" stroke-width="3" stroke-linecap="round" opacity="${0.4 + i * 0.15}"/>`
    ).join('')}
  </svg>`;
}

function svgRain(intensity = 'med', size = 64) {
	const drops = intensity === 'light' ? 3 : intensity === 'med' ? 5 : 7;
	const xs = [20, 28, 36, 44, 24, 32, 40];
	return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none">
    <ellipse cx="32" cy="28" rx="16" ry="11" fill="#9AB0C4"/>
    <ellipse cx="22" cy="32" rx="11" ry="9" fill="#9AB0C4"/>
    <ellipse cx="42" cy="32" rx="11" ry="9" fill="#9AB0C4"/>
    ${Array.from({ length: drops }, (_, i) =>
      ` < line x1 = "${xs[i]}"
	y1 = "42"
	x2 = "${xs[i] - 3}"
	y2 = "54"
	stroke = "#6aaccc"
	stroke - width = "2.5"
	stroke - linecap = "round" / > `
    ).join('')}
  </svg>`;
}

function svgSnow(intensity = 'med', size = 64) {
	const flakes = intensity === 'light' ? 3 : intensity === 'med' ? 5 : 7;
	const xs = [20, 28, 36, 44, 24, 32, 40];
	return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none">
    <ellipse cx="32" cy="28" rx="16" ry="11" fill="#9AB0C4"/>
    <ellipse cx="22" cy="32" rx="11" ry="9" fill="#9AB0C4"/>
    <ellipse cx="42" cy="32" rx="11" ry="9" fill="#9AB0C4"/>
    ${Array.from({ length: flakes }, (_, i) =>
      ` < circle cx = "${xs[i]}"
	cy = "${46 + i % 3 * 4}"
	r = "2.5"
	fill = "white"
	opacity = "0.85" / > `
    ).join('')}
  </svg>`;
}

function svgSleet(size = 64) {
	return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none">
    <ellipse cx="32" cy="26" rx="16" ry="11" fill="#8AA0B4"/>
    <ellipse cx="22" cy="30" rx="11" ry="9" fill="#8AA0B4"/>
    <ellipse cx="42" cy="30" rx="11" ry="9" fill="#8AA0B4"/>
    <line x1="24" y1="42" x2="21" y2="52" stroke="#6aaccc" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="34" cy="48" r="2.5" fill="white" opacity="0.85"/>
    <line x1="40" y1="42" x2="37" y2="52" stroke="#6aaccc" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`;
}

function svgThunder(size = 64) {
	return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none">
    <ellipse cx="32" cy="26" rx="16" ry="11" fill="#7080A0"/>
    <ellipse cx="22" cy="30" rx="11" ry="9" fill="#7080A0"/>
    <ellipse cx="42" cy="30" rx="11" ry="9" fill="#7080A0"/>
    <polygon points="34,38 28,50 33,50 30,62 42,46 36,46 40,38" fill="#FFD600"/>
  </svg>`;
}

function svgThunderHail(size = 64) {
	return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none">
    <ellipse cx="32" cy="22" rx="16" ry="11" fill="#606880"/>
    <ellipse cx="22" cy="26" rx="11" ry="9" fill="#606880"/>
    <ellipse cx="42" cy="26" rx="11" ry="9" fill="#606880"/>
    <polygon points="32,34 27,44 31,44 29,56 39,42 34,42 38,34" fill="#FFD600"/>
    <circle cx="20" cy="52" r="3" fill="white" opacity="0.8"/>
    <circle cx="44" cy="50" r="3" fill="white" opacity="0.8"/>
  </svg>`;
}

function getWindDir(deg) {
	if (deg === null || deg === undefined) return '--';
	const dirs = ['N', 'NNO', 'NO', 'ONO', 'O', 'OSO', 'SO', 'SSO', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
	return dirs[Math.round(deg / 22.5) % 16];
}

function getUVLabel(uv) {
	if (uv === null || uv === undefined) return '--';
	if (uv <= 2) return 'Niedrig';
	if (uv <= 5) return 'Mäßig';
	if (uv <= 7) return 'Hoch';
	if (uv <= 10) return 'Sehr hoch';
	return 'Extrem';
}

function formatTime(iso) {
	if (!iso) return '--';
	return new Date(iso).toLocaleTimeString('de-DE', {
		hour: '2-digit',
		minute: '2-digit'
	});
}

function formatHour(timeStr) {
	if (!timeStr) return '--';
	const h = new Date(timeStr).getHours();
	return h === 0 ? 'Mitternacht' : `${h} Uhr`;
}

async function fetchWeather() {
	const params = new URLSearchParams({
		latitude: CONFIG.lat,
		longitude: CONFIG.lon,
		current: [
			'temperature_2m', 'apparent_temperature', 'is_day', 'weather_code',
			'wind_speed_10m', 'wind_direction_10m', 'relative_humidity_2m',
			'precipitation', 'cloud_cover', 'surface_pressure', 'uv_index'
		].join(','),
		hourly: 'temperature_2m,weather_code,is_day,precipitation_probability',
		daily: [
			'weather_code', 'temperature_2m_max', 'temperature_2m_min',
			'sunrise', 'sunset', 'precipitation_probability_max', 'uv_index_max'
		].join(','),
		timezone: CONFIG.timezone,
	});

	const res = await fetch(`${CONFIG.api}?${params}`);
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return res.json();
}

function getNearestHourlyIdx(h) {
	if (!h.time) return -1;
	const now = new Date();
	let best = -1,
		bestDiff = Infinity;
	h.time.forEach((t, i) => {
		const diff = Math.abs(new Date(t) - now);
		if (diff < bestDiff) {
			bestDiff = diff;
			best = i;
		}
	});
	return best;
}

function firstNonNull(arr, startIdx) {
	if (!arr) return null;
	for (let i = startIdx; i < arr.length; i++)
		if (arr[i] !== null && arr[i] !== undefined) return arr[i];
	for (let i = startIdx - 1; i >= 0; i--)
		if (arr[i] !== null && arr[i] !== undefined) return arr[i];
	return null;
}

function renderWeather(data) {
	const cu = data.current_units || {};
	const c = data.current || {};
	const h = data.hourly || {};
	const d = data.daily || {};

	const now = new Date();
	const hIdx = getNearestHourlyIdx(h);

	const allCurrentNull = Object.entries(c)
		.filter(([k]) => !['time', 'interval', 'is_day'].includes(k))
		.every(([, val]) => val === null || val === undefined);

	let banner = document.getElementById('apiBanner');
	if (allCurrentNull) {
		if (!banner) {
			banner = document.createElement('div');
			banner.id = 'apiBanner';
			banner.className = 'api-banner';
			banner.innerHTML = `
        <i class="fa-solid fa-triangle-exclamation"></i>
        <span>API gibt aktuell keine Echtzeit-Messwerte zurück. Stundendaten werden als Fallback angezeigt.</span>
      `;
			const heroSection = document.getElementById('heroSection');
			if (heroSection) heroSection.parentNode.insertBefore(banner, heroSection);
		}
	} else {
		if (banner) banner.remove();
	}

	function cur(field, hourlyField) {
		const cv = c[field];
		if (cv !== null && cv !== undefined) return cv;
		if (hourlyField && hIdx >= 0) return firstNonNull(h[hourlyField], hIdx);
		return null;
	}

	const isDay = c.is_day ?? (hIdx >= 0 && h.is_day ? h.is_day[hIdx] : 1);
	const code = cur('weather_code', 'weather_code') ?? 0;
	const details = getWeatherDetails(code, !!isDay);

	document.getElementById('heroIcon').innerHTML = details.icon;

	const temp = cur('temperature_2m', 'temperature_2m');
	document.getElementById('heroTemp').textContent =
		temp !== null ? `${Math.round(temp)}${cu.temperature_2m || '°C'}` : '--';

	document.getElementById('heroDesc').textContent = details.desc;

	const feels = cur('apparent_temperature', null);
	document.getElementById('heroFeels').textContent =
		feels !== null ? `Gefühlt ${Math.round(feels)}${cu.temperature_2m || '°C'}` : 'Gefühlt --';

	const tmax = firstNonNull(d.temperature_2m_max, 0);
	const tmin = firstNonNull(d.temperature_2m_min, 0);
	document.getElementById('heroHighLow').textContent =
		(tmax !== null && tmin !== null) ? `H:${Math.round(tmax)}° T:${Math.round(tmin)}°` : '';

	document.getElementById('heroTime').textContent =
		now.toLocaleString('de-DE', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			hour: '2-digit',
			minute: '2-digit'
		});

	const wind = cur('wind_speed_10m', null);
	const windDir = cur('wind_direction_10m', null);
	document.getElementById('detWind').textContent =
		wind !== null ? `${Math.round(wind)} ${cu.wind_speed_10m || 'km/h'}` : '--';
	document.getElementById('detWindDir').textContent =
		windDir !== null ? `Richtung ${getWindDir(windDir)}` : 'Richtung k.A.';

	const humidity = cur('relative_humidity_2m', null);
	document.getElementById('detHumidity').textContent =
		humidity !== null ? `${humidity}${cu.relative_humidity_2m || '%'}` : '--';

	const uv = cur('uv_index', null) ?? firstNonNull(d.uv_index_max, 0);
	document.getElementById('detUV').textContent = uv !== null ? Math.round(uv) : '--';
	document.getElementById('detUVLabel').textContent = getUVLabel(uv);

	const precip = cur('precipitation', null);
	document.getElementById('detPrecip').textContent =
		precip !== null ? `${precip} ${cu.precipitation || 'mm'}` : '--';

	const prob = (hIdx >= 0 && h.precipitation_probability) ?
		firstNonNull(h.precipitation_probability, hIdx) :
		firstNonNull(d.precipitation_probability_max, 0);
	document.getElementById('detPrecipProb').textContent =
		prob !== null ? `${prob}% Wahrscheinlichkeit` : 'k.A.';

	const cloud = cur('cloud_cover', null);
	document.getElementById('detCloud').textContent =
		cloud !== null ? `${cloud}${cu.cloud_cover || '%'}` : '--';

	const pressure = cur('surface_pressure', null);
	document.getElementById('detPressure').textContent =
		pressure !== null ? `${Math.round(pressure)} ${cu.surface_pressure || 'hPa'}` : '--';

	if (d.sunrise && d.sunrise[0]) {
		document.getElementById('detSunrise').textContent = formatTime(d.sunrise[0]);
		document.getElementById('detSunset').textContent = formatTime(d.sunset[0]);
	}

	renderHourly(h);
	renderForecast(d);

	document.getElementById('lastUpdate').textContent =
		`Stand: ${now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`;
}

function renderHourly(h) {
	const container = document.getElementById('hourlyRow');
	container.innerHTML = '';
	if (!h.time) return;

	const now = new Date();
	const startIdx = h.time.findIndex(t => new Date(t) >= now);
	const from = startIdx >= 0 ? startIdx : 0;
	const times = h.time.slice(from, from + 24);

	times.forEach((t, i) => {
		const idx = from + i;
		const temp = h.temperature_2m ? h.temperature_2m[idx] : null;
		const code = h.weather_code ? h.weather_code[idx] : 0;
		const isDay = h.is_day ? h.is_day[idx] : 1;
		const det = getWeatherDetails(code, !!isDay);

		const item = document.createElement('div');
		item.className = `hourly-item${i === 0 ? ' active' : ''}`;
		item.innerHTML = `
      <span class="hourly-time">${i === 0 ? 'Jetzt' : formatHour(t)}</span>
      <div style="width:28px;height:28px;">${det.icon.replace(/width="\d+"/, 'width="28"').replace(/height="\d+"/, 'height="28"')}</div>
      <span class="hourly-temp">${temp !== null ? Math.round(temp) + '°' : '--'}</span>
    `;
		container.appendChild(item);
	});
}

function renderForecast(d) {
	const container = document.getElementById('forecastList');
	container.innerHTML = '';
	if (!d.time) return;

	const allTemps = [...(d.temperature_2m_max || []).filter(t => t !== null), ...(d.temperature_2m_min || []).filter(t => t !== null)];
	const globalMin = Math.min(...allTemps);
	const globalMax = Math.max(...allTemps);
	const range = globalMax - globalMin || 1;

	d.time.forEach((t, i) => {
		const date = new Date(t + 'T12:00:00');
		const dayName = i === 0 ? 'Heute' : DAYS_DE[date.getDay()];
		const code = d.weather_code ? d.weather_code[i] : 0;
		const tMax = d.temperature_2m_max ? d.temperature_2m_max[i] : null;
		const tMin = d.temperature_2m_min ? d.temperature_2m_min[i] : null;
		const det = getWeatherDetails(code, true);

		const fillLeft = tMin !== null ? ((tMin - globalMin) / range) * 100 : 0;
		const fillWidth = (tMax !== null && tMin !== null) ? ((tMax - tMin) / range) * 100 : 0;

		const row = document.createElement('div');
		row.className = 'forecast-row';
		row.innerHTML = `
      <span class="forecast-day">${dayName}</span>
      <div class="forecast-icon">${det.icon.replace(/width="\d+"/, 'width="28"').replace(/height="\d+"/, 'height="28"')}</div>
      <div class="temp-bar-container">
        <span class="temp-min">${tMin !== null ? Math.round(tMin) + '°' : '--'}</span>
        <div class="temp-bar-track">
          <div class="temp-bar-fill" style="margin-left:${fillLeft.toFixed(1)}%;width:${fillWidth.toFixed(1)}%;"></div>
        </div>
        <span class="temp-max">${tMax !== null ? Math.round(tMax) + '°' : '--'}</span>
      </div>
    `;
		container.appendChild(row);
	});
}

async function load() {
	const overlay = document.getElementById('loadingOverlay');
	overlay.style.opacity = '1';
	overlay.style.pointerEvents = 'all';

	const btn = document.getElementById('headerRefreshBtn');
	btn.classList.add('spinning');

	try {
		const data = await fetchWeather();
		renderWeather(data);
		document.getElementById('locationName').textContent = CONFIG.name || `${CONFIG.lat}, ${CONFIG.lon}`;
		document.getElementById('locationCoords').textContent = `${CONFIG.lat.toFixed(3)}, ${CONFIG.lon.toFixed(3)}`;
	} catch (err) {
		console.error(err);
		document.getElementById('heroDesc').textContent = 'Fehler beim Laden';
	} finally {
		overlay.style.opacity = '0';
		overlay.style.pointerEvents = 'none';
		btn.classList.remove('spinning');
	}
}

function openSettings() {
	document.getElementById('settingsPanel').classList.add('open');
	document.getElementById('settingsOverlay').classList.add('open');
}

function closeSettings() {
	document.getElementById('settingsPanel').classList.remove('open');
	document.getElementById('settingsOverlay').classList.remove('open');
}

document.getElementById('burgerBtn').addEventListener('click', openSettings);
document.getElementById('closeSettings').addEventListener('click', closeSettings);
document.getElementById('settingsOverlay').addEventListener('click', closeSettings);
document.getElementById('headerRefreshBtn').addEventListener('click', () => load());
document.getElementById('refreshBtn').addEventListener('click', () => {
	closeSettings();
	load();
});

document.getElementById('applyLocation').addEventListener('click', () => {
	const lat = parseFloat(document.getElementById('latInput').value);
	const lon = parseFloat(document.getElementById('lonInput').value);
	const name = document.getElementById('nameInput').value.trim();
	if (!isNaN(lat) && !isNaN(lon)) {
		CONFIG.lat = lat;
		CONFIG.lon = lon;
		CONFIG.name = name || `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
		closeSettings();
		load();
	}
});

document.getElementById('geoLocateBtn').addEventListener('click', () => {
	if (!navigator.geolocation) return;
	navigator.geolocation.getCurrentPosition(pos => {
		CONFIG.lat = parseFloat(pos.coords.latitude.toFixed(4));
		CONFIG.lon = parseFloat(pos.coords.longitude.toFixed(4));
		CONFIG.name = 'Mein Standort';
		document.getElementById('latInput').value = CONFIG.lat;
		document.getElementById('lonInput').value = CONFIG.lon;
		document.getElementById('nameInput').value = CONFIG.name;
		closeSettings();
		load();
	});
});

load();
