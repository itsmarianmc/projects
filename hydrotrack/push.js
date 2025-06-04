if (Notification.permission !== "granted") {
    Notification.requestPermission();
}

let messages = [];

async function loadMessages() {
    try {
        const response = await fetch('notifications.json');
        messages = await response.json();
    } catch (error) {
        console.error("Fehler beim Laden der Nachrichten:", error);
    }
}

function getRandomMessage() {
    if (messages.length === 0) return "Zeit, Wasser zu trinken! 💧";
    const randomIndex = Math.floor(Math.random() * messages.length);
    return messages[randomIndex];
}

function sendNotification() {
    if (Notification.permission === "granted") {
        new Notification("Hydro Tracker", {
            body: getRandomMessage(),
            icon: "https://cdn-icons-png.flaticon.com/512/728/728093.png"
        });
    }
}

setInterval(sendNotification, 2 * 60 * 60 * 1000);

loadMessages().then(() => {
    setTimeout(sendNotification, 5000);
});
