let cookies = 0;
let clickValue = 1;
let cookiesPerSecond = 0;
let autoClickers = 0;
let grandmas = 0;
let prestige = 0;

let clickUpgradeCost = 10;
let autoClickerCost = 50;
let grandmaCost = 200;
let prestigeCost = 25000;

// Navbar
document.getElementById("home").addEventListener("click", function(){
    location.reload();
});

document.getElementById("about").addEventListener("click", function() {
    document.getElementById("overlay").style.display = "flex";
    document.getElementById("overlayabout").style.display = "block";
    document.getElementById("body").classList.remove("scroll");
    document.getElementById("body").classList.add("noScroll");
});

document.getElementById("closeAbout").addEventListener("click", function() { 
    document.getElementById("overlay").style.display = "none";
    document.getElementById("overlayabout").style.display = "none";
    document.getElementById("body").classList.add("scroll");
    document.getElementById("body").classList.remove("noScroll");
});

document.getElementById("cookiecache").addEventListener("click", function() { 
    document.getElementById("cookieConsent").style.display = "block";
    document.getElementById("overlay").style.display = "flex";
    document.getElementById("body").classList.remove("scroll");
    document.getElementById("body").classList.add("noScroll");
});

document.getElementById("acceptCookiesBtn").addEventListener("click", function() { 
    document.getElementById("cookieConsent").style.display = "none";
    document.getElementById("overlay").style.display = "none";
    document.getElementById("body").classList.add("scroll");
    document.getElementById("body").classList.remove("noScroll");

});

document.getElementById("github").addEventListener("click", function(){
    open("https://github.com/itsmarianmc", target="_blank")
});

document.getElementById("changelog").addEventListener("click", function(){
    open("/projects/cookieclicker/changelog.html", target="_parent")
});

// Load progress
function openLoader() {
    document.getElementById("fileLoader").style.display = "flex";
    document.getElementById("loadbtn").style.display = "none";
}

function stopLoad() {
    document.getElementById("fileLoader").style.display = "none";
    document.getElementById("loadbtn").style.display = "block";
    document.getElementById("loadButton").style.display = "none";
    fileInput.value = "";
}

document.getElementById("fileInput").addEventListener("change", function() {
    const loadButton = document.getElementById("loadButton");

    if (this.files.length > 0) {
        document.getElementById("loadButton").style.display = "block";
    } else {
        loadButton.style.display = "none";
    }
});

document.getElementById("loadButton").addEventListener("click", function() {
    const fileInput = document.getElementById("fileInput");
    const file = fileInput.files[0];
    fileInput.value = "";

    if (!file) {
        alert("No file selected! Please select a file.");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            if (confirm("Are you sure want to overwrite the current session? This cannot be undone! Press 'OK' to continue.")) {
                const gameData = JSON.parse(event.target.result);
                cookies = gameData.cookies || 0;
                clickValue = gameData.clickValue || 1;
                cookiesPerSecond = gameData.cookiesPerSecond || 0;
                autoClickers = gameData.autoClickers || 0;
                grandmas = gameData.grandmas || 0;
                clickUpgradeCost = gameData.clickUpgradeCost || 10;
                autoClickerCost = gameData.autoClickerCost || 50;
                grandmaCost = gameData.grandmaCost || 200;
                prestige = gameData.prestige || 0;
                prestigeCost = gameData.prestigeCost || 25000;
                document.getElementById("clickCost").innerText = clickUpgradeCost;
                document.getElementById("autoCost").innerText = autoClickerCost;
                document.getElementById("grandmaCost").innerText = grandmaCost;
                document.getElementById("prestigeCost").innerText = prestigeCost;
                document.getElementById("loadbtn").style.display = "block";
                document.getElementById("loadButton").style.display = "none";
                document.getElementById("fileLoader").style.display = "none";
                alert("Progress loaded successfully! Press 'OK' to continue.");
                updateDisplay();
                fileInput.value = "";
            } else {
                document.getElementById("loadbtn").style.display = "block";
                document.getElementById("loadButton").style.display = "none";
                document.getElementById("fileLoader").style.display = "none";
                fileInput.value = "";
            }
        } catch (error) {
            alert("Error loading the file. The selected file has an unsuitable file format or is damaged. Make sure that the file is in the correct format and that the file does not contain any errors.");
        }
    };
    reader.readAsText(file);
});

// Save progress as file
function saveGame() {
    const gameData = {
        cookies: cookies,
        clickValue: clickValue,
        cookiesPerSecond: cookiesPerSecond,
        autoClickers: autoClickers,
        grandmas: grandmas,
        clickUpgradeCost: clickUpgradeCost,
        autoClickerCost: autoClickerCost,
        grandmaCost: grandmaCost,
        prestige: prestige,
        prestigeCost: prestigeCost
    };
    const gameDataJSON = JSON.stringify(gameData);
    const blob = new Blob([gameDataJSON], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cookie_clicker.json'; 
    a.click();
    URL.revokeObjectURL(url);
};

// Cookie click event
document.getElementById("cookie").addEventListener("click", function(event) {
    let prestigeMultiplier = prestige > 0 ? prestige : 1; 
    let gainedCookies = clickValue * prestigeMultiplier;
    gainedCookies = Math.round(gainedCookies * 2) / 2;
    cookies += gainedCookies;
    updateDisplay();
    showFloatingText(event, `+${gainedCookies}`);
});

// Upgrades
function buyUpgrade(type) {
    if (type === 'click' && cookies >= clickUpgradeCost) {
        cookies -= clickUpgradeCost;
        clickValue += 2;
        clickUpgradeCost = Math.floor(clickUpgradeCost * 1.25);
        document.getElementById("clickCost").innerText = clickUpgradeCost;
    } else if (type === 'auto' && cookies >= autoClickerCost) {
        cookies -= autoClickerCost;
        autoClickers++;
        cookiesPerSecond++;
        autoClickerCost = Math.floor(autoClickerCost * 1.25);
        document.getElementById("autoCost").innerText = autoClickerCost;
        document.getElementById("autoCount").innerText = autoClickers;
    } else if (type === 'grandma' && cookies >= grandmaCost) {
        cookies -= grandmaCost;
        grandmas++;
        cookiesPerSecond += 5;
        grandmaCost = Math.floor(grandmaCost * 1.25);
        document.getElementById("grandmaCost").innerText = grandmaCost;
        document.getElementById("grandmaCount").innerText = grandmas;
    }
    updateDisplay();
}

// Prestige
function buyPrestige() {
    if (cookies >= prestigeCost) {
        cookies -= prestigeCost;
        prestige++;

        prestigeCost = Math.floor(prestigeCost * 1.25);
        document.getElementById("prestige").innerText = prestige;
        document.getElementById("prestigeCost").innerText = prestigeCost;

        resetGame(true);
        applyPrestigeBonus();

        if (prestige === 20) {
            if (confirm("You have finished the game. Would you like to continue playing?")) {
                gameFinished();
            } else {
                resetGame(true);
            }
        }
    } else {
        alert("You don't have enough cookies for Prestige!");
    }
}

function applyPrestigeBonus() {
    clickValue = Math.pow(1.5, prestige);
    updateDisplay();
}

// Game End
function gameFinished() {
    hardReset();
}

// Reset game
function resetGame(isPrestige) {
    if (isPrestige) {
        cookies = 0;
        clickValue = 1;
        cookiesPerSecond = 0;
        autoClickers = 0;
        grandmas = 0;
        clickUpgradeCost = 10;
        autoClickerCost = 50;
        grandmaCost = 200;
        alert("Your game has been reset!");
    } else {
        if (confirm("Do you really want to reset the game? All your progress will be lost. This cannot be undone unless you have downloaded a valid 'cookie_clicker.json'!")) {
        localStorage.clear();
        location.reload();
        }
    }
    updateDisplay();
}

// Hard reset - no user permission
function hardReset() {
    cookies = 0;
    clickValue = 1;
    cookiesPerSecond = 0;
    autoClickers = 0;
    grandmas = 0;
    clickUpgradeCost = 10;
    autoClickerCost = 50;
    grandmaCost = 200;
    prestige = 0;
    alert("You have finished the game! Thank you for playing ~itsmarian");
    updateDisplay();
}

// Update changes
function updateDisplay() {
    document.getElementById("cookies").innerText = cookies;
    document.getElementById("clickValue").innerText = clickValue;
    document.getElementById("cps").innerText = cookiesPerSecond;
    document.getElementById("autoCount").innerText = autoClickers;
    document.getElementById("grandmaCount").innerText = grandmas;
    document.getElementById("prestige").innerText = prestige;
}

setInterval(() => {
    cookies += cookiesPerSecond;
    updateDisplay();
}, 1000);

// Cookie Text
function showFloatingText(event, text) {
    let floatingText = document.createElement("div");
    floatingText.innerText = text;
    floatingText.className = "cookie-animation";
    document.body.appendChild(floatingText);

    let x = event.clientX;
    let y = event.clientY;
    floatingText.style.left = x + "px";
    floatingText.style.top = y + "px";

    setTimeout(() => floatingText.remove(), 1000);
}

// Save game to cache
setInterval(() => {
    localStorage.setItem("cookies", cookies);
    localStorage.setItem("clickValue", clickValue);
    localStorage.setItem("cookiesPerSecond", cookiesPerSecond);
    localStorage.setItem("autoClickers", autoClickers);
    localStorage.setItem("grandmas", grandmas);
    localStorage.setItem("clickUpgradeCost", clickUpgradeCost);
    localStorage.setItem("autoClickerCost", autoClickerCost);
    localStorage.setItem("grandmaCost", grandmaCost);
    localStorage.setItem("prestige", prestige);
    localStorage.setItem("prestigeCost", prestigeCost);
    document.getElementById('save').style.display = 'block';
    setTimeout(() => {
        document.getElementById('save').style.display = 'none';
    }, 2500);
}, 10000);

// Load progress on website load
window.onload = () => {
    cookies = parseInt(localStorage.getItem("cookies")) || 0;
    clickValue = parseInt(localStorage.getItem("clickValue")) || 1;
    cookiesPerSecond = parseInt(localStorage.getItem("cookiesPerSecond")) || 0;
    autoClickers = parseInt(localStorage.getItem("autoClickers")) || 0;
    grandmas = parseInt(localStorage.getItem("grandmas")) || 0;
    clickUpgradeCost = parseInt(localStorage.getItem("clickUpgradeCost")) || 10;
    autoClickerCost = parseInt(localStorage.getItem("autoClickerCost")) || 50;
    grandmaCost = parseInt(localStorage.getItem("grandmaCost")) || 200;
    prestige = parseInt(localStorage.getItem("prestige")) || 0;
    prestigeCost = parseInt(localStorage.getItem("prestigeCost")) || 25000;
    document.getElementById("clickCost").innerText = clickUpgradeCost;
    document.getElementById("autoCost").innerText = autoClickerCost;
    document.getElementById("grandmaCost").innerText = grandmaCost;
    document.getElementById("prestigeCost").innerText = prestigeCost;
    document.getElementById("loadButton").style.display = "none";
    updateDisplay();
};