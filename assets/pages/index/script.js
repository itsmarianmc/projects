
const urlParams = new URLSearchParams(window.location.search);
const projectId = urlParams.get('red-id');

if (projectId) {
    fetch('/assets/pages/index/ids.json')
        .then(response => response.json())
        .then(redirectData => {
            const projectId = new URLSearchParams(window.location.search).get('red-id');

            if (projectId) {
            for (const [basePath, project] of Object.entries(redirectData)) {
                if (project.id === projectId) {
                window.location.href = basePath;
                return;
                }
                
                for (const [subPath, subId] of Object.entries(project.paths)) {
                if (subId === projectId) {
                    window.location.href = basePath + subPath;
                    return;
                }
                }
            }
            
            console.error(`Unkown project id: ${projectId}`);
        }
    });
}

function handleMissingRedirect(id) {
    console.warn(`No redirect for "${id}" found`);
    document.body.innerHTML = `<h1 style="color: var(--error); text-align: center">Project "${id}" not found</h1>`;
}

function handleRedirectError() {
    document.body.innerHTML = '<h1 style="color: var(--error); text-align: center">Configuration error</h1><p style="color: var(--error); text-align: center">Please try again later</p>';
}

document.addEventListener('DOMContentLoaded', function() {
    const projectCards = document.querySelectorAll('.project-card');

    projectCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';

        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 150 * index);
    });
});