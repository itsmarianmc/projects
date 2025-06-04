const CURRENT_VERSION = "1.4.0";
const VERSION_URL = "https://hydrotrack-itsmarian.vercel.app/api/version.json";

function compareVersions(v1, v2) {
    const v1Parts = v1.split('.').map(Number);
    const v2Parts = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
        const a = v1Parts[i] || 0;
        const b = v2Parts[i] || 0;
        if (a > b) return 1;
        if (a < b) return -1;
    }
    console.log(`Version is up-to-date \nCurrent version: ${CURRENT_VERSION}`)
    document.querySelector(".version-information").remove();
    return 0;
}

async function checkForUpdate() {
    try {
        const res = await fetch(VERSION_URL);
        if (!res.ok) throw new Error("Unable to fetch version info.");
        const data = await res.json();

        const latest = data.latest || "0.0.0";
        const changelogArray = Array.isArray(data.changelog) ? data.changelog : [];

        const result = compareVersions(CURRENT_VERSION, latest);
        if (result === -1) {
            const formatted = `
                <strong>🆕 What's New in v${latest}:</strong>
                <ul class="update-ul">
                    ${changelogArray.map(line => `<li>🔹${line}</li>`).join("")}
                </ul>`;
            
            document.querySelector(".version-information").style.display = "block";
            document.querySelector(".bg-blur").style.display = "block";
            document.getElementById("version-update-current").textContent = CURRENT_VERSION;
            document.getElementById("version-update-newest").textContent = latest;
            document.getElementById("version-update-log").innerHTML = formatted;

            console.log(`New version available: ${latest} \nCurrent version: ${CURRENT_VERSION}`)
        }
    } catch (error) {
        console.error("Update check failed:", error);
    }
}

document.addEventListener("DOMContentLoaded", checkForUpdate);