document.addEventListener("DOMContentLoaded", function() {
	const theme = localStorage.getItem('theme');
	if (theme === 'light') {
		changeToLightMode();
	} else if (theme === 'dark') {
		changeToDarkMode();
	} else {
		localStorage.setItem('theme', 'dark');
		changeToDarkMode();
	}

	const darkModeButton = document.getElementById("changetodarkmode");
	const lightModeButton = document.getElementById("changetolightmode");

	if (darkModeButton) {
		darkModeButton.addEventListener("click", function() {
			localStorage.setItem('theme', 'dark');
			changeToDarkMode();
		});
	}

	if (lightModeButton) {
		lightModeButton.addEventListener("click", function() {
			localStorage.setItem('theme', 'light');
			changeToLightMode();
		});
	}
});

function changeToDarkMode() {
	document.getElementById("changetolightmode").style.display = "block";
	document.getElementById("changetodarkmode").style.display = "none";
	document.documentElement.style.background = "#1B1D1E";
	document.getElementById("reload-header").style.fill = "#fff"
	document.querySelector(".header").style.background = "#1B1D1E";
	document.querySelector(".header").style.color = "#fff";
	document.querySelector(".header").style.borderBottom = "1px solid #bbb";
	document.querySelector(".header").style.borderLeft = "1px solid #555";
	document.querySelector(".header").style.borderRight = "1px solid #555";
	document.querySelector(".header").style.borderTop = "1px solid #555";
	document.querySelector(".footer-lines").style.color = "#fff"
	document.querySelectorAll(".linkout").forEach(el => {
		el.style.color = "#fff";
	});
	document.querySelectorAll(".header-a").forEach(el => {
		el.style.color = "#fff";
	});
	document.querySelectorAll(".section").forEach(el => {
		el.style.color = "#fff";
	});
	document.querySelectorAll(".nodecoration").forEach(el => {
		el.style.color = "#fff";
	});
}

function changeToLightMode() {
	document.getElementById("changetolightmode").style.display = "none";
	document.getElementById("changetodarkmode").style.display = "block";
	document.documentElement.style.background = "#fff";
	document.getElementById("reload-header").style.fill = "#000"
	document.querySelector(".header").style.background = "#F8F8F8";
	document.querySelector(".header").style.color = "#000";
	document.querySelector(".header").style.border = "1px solid #aeaeae";
	document.querySelector(".footer-lines").style.color = "#000"
	document.querySelectorAll(".linkout").forEach(el => {
		el.style.color = "#000";
	});
	document.querySelectorAll(".header-a").forEach(el => {
		el.style.color = "#000";
	});
	document.querySelectorAll(".section").forEach(el => {
		el.style.color = "#000";
	});
	document.querySelectorAll(".nodecoration").forEach(el => {
		el.style.color = "#000";
	});
}