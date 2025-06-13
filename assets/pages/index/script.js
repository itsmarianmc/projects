document.addEventListener('DOMContentLoaded', function() {
	function findTargetPath(data, targetId, currentPath = '', idParts = []) {
		for (const [segment, node] of Object.entries(data)) {
			const newIdParts = [...idParts, node.id];
			const newId = newIdParts.join('-');
			const newPath = currentPath + segment;

			if (newId === targetId) {
				return newPath;
			}

			if (node.paths) {
				const result = findTargetPath(node.paths, targetId, newPath, newIdParts);
				if (result) return result;
			}
		}
		return null;
	}

	function handleRedirect() {
		const params = new URLSearchParams(window.location.search);
		const projectId = params.get('red-id');

		if (!projectId) return;

		fetch('/assets/pages/index/ids.json')
			.then(response => {
				if (!response.ok) throw new Error('Netzwerkantwort nicht ok');
				return response.json();
			})
			.then(data => {
				const targetPath = findTargetPath(data, projectId);
                
				if (targetPath) {
					if (targetPath.startsWith('https://') || targetPath.startsWith('http://')) {
						window.location.href = targetPath;
					} else {
						const normalizedPath = targetPath.replace(/\/+/g, '/');
						window.location.href = normalizedPath;
					}
				} else {
					const baseId = projectId.split('-')[0];
					for (const [path, node] of Object.entries(data)) {
						if (node.id === baseId) {
							window.location.href = path;
							return;
						}
					}

					console.error(`Unbekannte Projekt-ID: ${projectId}`);
					window.location.href = '/404.html';
				}
			})
			.catch(error => {
				console.error('Fehler beim Laden der Projektstruktur:', error);
				window.location.href = '/error.html';
			});
	}

	handleRedirect();
});

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

document.querySelectorAll('.ripple-btn').forEach(el => {
    el.addEventListener('click', function(e) {
        const oldRipple = el.querySelector('.ripple');
        if (oldRipple) oldRipple.remove();

        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const circle = document.createElement('span');
        const diameter = Math.max(el.clientWidth, el.clientHeight);
        const radius = diameter / 2;
        circle.style.width = circle.style.height = diameter + 'px';
        circle.style.left = (x - radius) + 'px';
        circle.style.top = (y - radius) + 'px';
        circle.classList.add('ripple');

        el.appendChild(circle);
        circle.addEventListener('animationend', () => circle.remove());
    });
});