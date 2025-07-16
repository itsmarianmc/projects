document.getElementById("changeGoalOpener").addEventListener("click", function() {
    document.querySelector(".bg-blur").style.display = "block";
    document.getElementById("event-changer").style.display = "block";
})

document.getElementById("closeEventChanger").addEventListener("click", function() {
    document.querySelector(".bg-blur").style.display = "none";
    document.getElementById("event-changer").style.display = "none";
})

document.getElementById("addCustomValue").addEventListener("click", function() {
    const amountInput = document.getElementById('amount');
    const value = parseFloat(amountInput.value);
    if (value > 0) {
        console.log(`Added ${value}ml`);
    } else {
        alert('Please enter a positive/valid number.');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const appContainer = document.querySelector('.app-container');
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

    if (appContainer) {
        appContainer.style.display = isStandalone ? 'none' : 'block';
    }
});

document.getElementById("getApp").addEventListener("click", function(){
    document.documentElement.style.overflowY = "hidden";
    document.documentElement.style.overflowX = "hidden";
    document.getElementById("u-overlay").style.display = "block";
    document.querySelector(".modal-app").classList.add("u-overlay-active-content");
    
    setTimeout(function() {
        document.getElementById("u-overlay").style.top = "calc(50% + 15px)";
        document.getElementById("u-overlay").style.height = "calc(100% - 30px)";
        document.getElementById("u-overlay").style.transform = "translate(-50%, -50%)";
    }, 10);
});

document.getElementById("done-btn").addEventListener("click", function(){
    document.getElementById("u-overlay").style.top = "100%";
    document.getElementById("u-overlay").style.height = "100%";
    document.getElementById("u-overlay").style.transform = "translate(-50%, 0%)";
    document.querySelector(".modal-app").classList.remove("u-overlay-active-content");
    document.documentElement.style.overflowY = "auto";
    document.documentElement.style.overflowX = "hidden";

    setTimeout(function() {
        document.getElementById("u-overlay").style.display = "none";
    }, 150);
});

document.getElementById("historyOpener").addEventListener("click", function(){
    document.querySelector(".history-list").style.display = "block";
    document.querySelector(".bg-blur").style.display = "block";
    document.documentElement.style.overflowY = "hidden";
    document.body.style.overflowY = "hidden";
});

document.getElementById("historyCloser").addEventListener("click", function(){
    document.querySelector(".history-list").style.display = "none";
    document.querySelector(".bg-blur").style.display = "none";
    document.documentElement.style.overflowY = "scroll";
    document.body.style.overflowY = "auto";
});

document.querySelector(".app-action-menu").addEventListener("click", function() {
    document.querySelector(".app-container").style.display = "none";
    document.querySelector(".app-container").remove();
});

const platformButtons = document.querySelectorAll('.platform-btn');
const tutorialSections = document.querySelectorAll('.tutorial-section');

platformButtons.forEach(button => {
	button.addEventListener('click', () => {
		platformButtons.forEach(btn => btn.classList.remove('active'));

		button.classList.add('active');

		tutorialSections.forEach(section => {
			section.classList.remove('active');
		});

		const platform = button.dataset.platform;
		const targetSection = document.getElementById(`${platform}-tutorial`);
		if (targetSection) {
			targetSection.classList.add('active');
		}
	});
});

function detectBrowser() {
	const userAgent = navigator.userAgent;
	const isChrome = /Chrome/i.test(userAgent) && !/Edge/i.test(userAgent);
	const isEdge = /Edge/i.test(userAgent);
	const isFirefox = /Firefox/i.test(userAgent);
	const isSafari = /Safari/i.test(userAgent) && !/Chrome/i.test(userAgent);
	const isAndroid = /Android/i.test(userAgent);
	const isIOS = /iPhone|iPad|iPod/i.test(userAgent);

	if (isAndroid && isChrome) {
		document.querySelector('[data-platform="android"]').click();
	} else if (isIOS && isSafari) {
		document.querySelector('[data-platform="safari"]').click();
	} else if (isFirefox) {
		document.querySelector('[data-platform="firefox"]').click();
	} else if (isChrome || isEdge) {
		document.querySelector('[data-platform="chrome"]').click();
	}
}
detectBrowser();