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

function initSearch() {
    const searchInput = document.getElementById('search-input');
    const searchClear = document.getElementById('search-clear');
    const activeFilterDiv = document.getElementById('active-filter');
    const activeFilterLabel = document.getElementById('active-filter-label');
    const activeFilterRemove = document.getElementById('active-filter-remove');
    const resultsMeta = document.getElementById('results-meta');
    const emptyState = document.getElementById('empty-state');
    const projectCards = document.querySelectorAll('.project-card');

    function toggleClearButton() {
        if (searchInput.value.length > 0) {
            searchClear.classList.add('visible');
        } else {
            searchClear.classList.remove('visible');
        }
    }

    function getProjectSearchData(card) {
        const name = card.getAttribute('p-name') || '';
        const hashRaw = card.getAttribute('p-hash') || '';
        const tags = hashRaw.split(',').map(t => t.trim().toLowerCase()).filter(t => t);
        return { name: name.toLowerCase(), tags };
    }

    function filterProjects() {
        let searchTerm = searchInput.value.trim();
        const isHashtagSearch = searchTerm.startsWith('#');
        let activeTag = null;

        if (isHashtagSearch) {
            activeTag = searchTerm.substring(1).toLowerCase();
            searchTerm = activeTag;
        } else {
            searchTerm = searchTerm.toLowerCase();
        }

        let visibleCount = 0;

        projectCards.forEach(card => {
            const { name, tags } = getProjectSearchData(card);
            let matches = false;

            if (searchTerm === '') {
                matches = true;
            } else if (isHashtagSearch) {
                matches = tags.includes(activeTag);
            } else {
                matches = name.includes(searchTerm) || tags.some(tag => tag.includes(searchTerm));
            }

            if (matches) {
                card.classList.remove('hidden');
                visibleCount++;
            } else {
                card.classList.add('hidden');
            }
        });

        const total = projectCards.length;
        resultsMeta.textContent = `${visibleCount} project${visibleCount !== 1 ? 's' : ''} found`;

        if (visibleCount === 0 && searchTerm !== '') {
            emptyState.classList.add('visible');
        } else {
            emptyState.classList.remove('visible');
        }

        if (isHashtagSearch && activeTag && searchTerm !== '') {
            activeFilterLabel.textContent = `#${activeTag}`;
            activeFilterDiv.style.display = 'inline-flex';
        } else {
            activeFilterDiv.style.display = 'none';
        }

        const url = new URL(window.location);
        if (searchTerm !== '') {
            url.searchParams.set('q', searchInput.value);
        } else {
            url.searchParams.delete('q');
        }
        window.history.replaceState({}, '', url);
    }

    function clearSearch() {
        searchInput.value = '';
        toggleClearButton();
        filterProjects();
        searchInput.focus();
    }

    let debounceTimer;
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        toggleClearButton();
        debounceTimer = setTimeout(() => {
            filterProjects();
        }, 300);
    });

    searchClear.addEventListener('click', clearSearch);

    activeFilterRemove.addEventListener('click', clearSearch);
	
    toggleClearButton();

    const urlParams = new URLSearchParams(window.location.search);
    const qValue = urlParams.get('q');
    if (qValue) {
        searchInput.value = qValue;
        toggleClearButton();
        filterProjects();
    } else {
        filterProjects(); 
    }

    document.querySelectorAll('.hashtag').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const href = link.getAttribute('href');
            if (href) {
                const url = new URL(href, window.location.origin);
                const q = url.searchParams.get('q');
                if (q) {
                    let searchValue = q;
                    if (searchValue.startsWith('h-')) {
                        searchValue = '#' + searchValue.substring(2);
                    }
                    searchInput.value = searchValue;
                    toggleClearButton();
                    filterProjects();
                }
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    handleRedirect();
    initSearch();
});