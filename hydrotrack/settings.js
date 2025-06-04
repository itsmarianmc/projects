// Change goal
document.getElementById("changeGoalOpener").addEventListener("click", function() {
    document.querySelector(".bg-blur").style.display = "block";
    document.getElementById("event-changer").style.display = "block";
})

document.getElementById("closeEventChanger").addEventListener("click", function() {
    document.querySelector(".bg-blur").style.display = "none";
    document.getElementById("event-changer").style.display = "none";
})

// Input values
document.getElementById("addCustomValue").addEventListener("click", function() {
    const amountInput = document.getElementById('amount');
    const value = parseFloat(amountInput.value);
    if (value > 0) {
        console.log(`Added ${value}ml`);
    } else {
        alert('Please enter a positive/valid number.');
    }
});

// App detector
document.addEventListener('DOMContentLoaded', () => {
    const appContainer = document.querySelector('.app-container');
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

    if (appContainer) {
        appContainer.style.display = isStandalone ? 'none' : 'block';
    }
});

// App
document.getElementById("getApp").addEventListener("click", function(){
    document.documentElement.style.overflowY = "hidden";
    document.documentElement.style.overflowX = "hidden";
    document.getElementById("overlay").style.display = "block";
    
    setTimeout(function() {
        document.getElementById("overlay").style.top = "calc(50% + 10px)";
        document.getElementById("overlay").style.height = "calc(100% - 10px)";
        document.getElementById("overlay").style.transform = "translate(-50%, -50%)";
    }, 10);
});

document.getElementById("done-btn").addEventListener("click", function(){
    document.getElementById("overlay").style.top = "100%";
    document.getElementById("overlay").style.height = "100%";
    document.getElementById("overlay").style.transform = "translate(-50%, 0%)";
    document.documentElement.style.overflowY = "auto";
    document.documentElement.style.overflowX = "hidden";

    setTimeout(function() {
        document.getElementById("overlay").style.display = "none";
    }, 150);
});

// History
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

// App Container
document.querySelector(".app-action-menu").addEventListener("click", function() {
    document.querySelector(".app-container").style.display = "none";
    document.querySelector(".app-container").remove();
});