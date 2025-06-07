document.addEventListener('DOMContentLoaded', function() {
    function extractAllHashtags() {
        const hashtags = new Set();
        document.querySelectorAll('.project-card').forEach(card => {
            const cardTags = card.getAttribute('p-hash').split(',');
            cardTags.forEach(tag => {
                hashtags.add(tag.trim());
            });
        });
        return Array.from(hashtags);
    }

    function filterProjectsByTag(tag) {
        const allProjects = document.querySelectorAll('.project-card');
        allProjects.forEach(project => {
            const projectTags = project.getAttribute('p-hash').split(',').map(t => t.trim());
            project.style.display = projectTags.includes(tag) ? 'flex' : 'none';
        });
    }

    function createHashtagFilters() {
        const filterContainer = document.createElement('div');
        filterContainer.className = 'hashtag-filters';
        filterContainer.innerHTML = `
            <div class="filter-header">
                <h3>Filter by Tag</h3>
            </div>
            <div class="filter-tags">
                <a class="filter-tag filter-remove" href="/">Remove filters</a>
            </div>
        `;

        document.querySelector('.container').insertBefore(filterContainer, document.querySelector('.projects-grid'));

        const tagsContainer = document.querySelector('.filter-tags');
        const allTags = extractAllHashtags();
        
        allTags.forEach(tag => {
            const tagElement = document.createElement('a');
            tagElement.className = 'filter-tag';
            tagElement.href = `/?q=h-${tag}`;
            tagElement.textContent = `#${tag}`;
            tagsContainer.appendChild(tagElement);
        });
    }

    function processUrlTag() {
        const params = new URLSearchParams(window.location.search);
        const tagParam = params.get('q');
        
        if (tagParam && tagParam.startsWith('h-')) {
            const tag = tagParam.substring(2);
            filterProjectsByTag(tag);
            
            document.querySelector(".hashtag-filters").style.display = 'block';

            document.querySelectorAll('.filter-tag').forEach(tagElement => {
                if (tagElement.textContent === `#${tag}`) {
                    tagElement.classList.add('active');
                }
            });
            
            document.querySelector('.section-title').textContent = `Projects tagged #${tag}`;
            document.querySelector('.section-subtitle').textContent = `Showing projects with the hashtag #${tag}`;
        } else {
            document.querySelector('.hashtag-filters').remove();
            console.log('No hashtag filter applied.');
        }
    }

    createHashtagFilters();
    processUrlTag();
});