document.addEventListener('DOMContentLoaded', () => {
    const repoContainer = document.getElementById('repo-container');
    const categoriesContainer = document.getElementById('categories');
    const searchInput = document.getElementById('search');
    const themeToggle = document.getElementById('theme-toggle');
    const sortSelect = document.getElementById('sort');
    const username = 'bainash10'; // Replace with your GitHub username

    let allRepos = [];
    let techStacks = new Set();

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark');
    });

    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        displayRepos(allRepos.filter(repo => repo.name.toLowerCase().includes(searchTerm)));
    });

    sortSelect.addEventListener('change', () => {
        sortAndDisplayRepos(sortSelect.value);
    });

    async function fetchRepos() {
        try {
            const response = await fetch(`https://api.github.com/users/${username}/repos`);
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            const data = await response.json();
            allRepos = await Promise.all(data.map(async (repo) => {
                const languages = await fetchLanguages(repo.languages_url);
                repo.languages = languages;
                const commitsCount = await fetchCommitsCount(repo.commits_url.replace('{/sha}', ''));
                repo.commitsCount = commitsCount;
                return repo;
            }));
            displayRepos(allRepos);
            displayCategories(allRepos);
        } catch (error) {
            console.error('Error fetching repos:', error);
        }
    }

    async function fetchLanguages(url) {
        try {
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('Error fetching languages:', error);
            return {};
        }
    }

    async function fetchCommitsCount(url) {
        try {
            const response = await fetch(url);
            const data = await response.json();
            return data.length;
        } catch (error) {
            console.error('Error fetching commits:', error);
            return 0;
        }
    }

    function displayRepos(repos) {
        repoContainer.innerHTML = '';
        repos.forEach(repo => {
            const repoDiv = document.createElement('div');
            repoDiv.classList.add('repo');

            const repoName = document.createElement('h2');
            repoName.textContent = repo.name;

            const techStacks = document.createElement('p');
            techStacks.textContent = `Tech Stacks: ${Object.keys(repo.languages).join(', ') || 'Unknown'}`;

            const commitInfo = document.createElement('p');
            commitInfo.textContent = `Commits: ${repo.commitsCount}`;

            const repoDetails = document.createElement('p');
            repoDetails.textContent = `Created at: ${new Date(repo.created_at).toLocaleDateString()}`;

            const sourceCode = document.createElement('div');
            sourceCode.classList.add('source-code');
            sourceCode.innerHTML = `
                <p>${repo.description || 'No description available'}</p>
                <a href="${repo.html_url}" target="_blank">View Source Code</a>
            `;

            repoDiv.appendChild(repoName);
            repoDiv.appendChild(techStacks);
            repoDiv.appendChild(commitInfo);
            repoDiv.appendChild(repoDetails);
            repoDiv.appendChild(sourceCode);
            repoContainer.appendChild(repoDiv);
        });
    }

    function displayCategories(repos) {
        const categories = {};
        repos.forEach(repo => {
            const techStack = Object.keys(repo.languages).join(', ') || 'Unknown';
            if (!categories[techStack]) {
                categories[techStack] = 0;
            }
            categories[techStack]++;
        });

        categoriesContainer.innerHTML = '';
        Object.keys(categories).forEach(category => {
            const categoryDiv = document.createElement('div');
            categoryDiv.classList.add('category');
            categoryDiv.textContent = `${category}: ${categories[category]}`;
            categoriesContainer.appendChild(categoryDiv);
        });
    }

    function sortAndDisplayRepos(sortBy) {
        let sortedRepos = [...allRepos];
        if (sortBy === 'recent') {
            sortedRepos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        } else if (sortBy === 'alphabetical') {
            sortedRepos.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortBy === 'techstack') {
            sortedRepos.sort((a, b) => Object.keys(a.languages).join(', ').localeCompare(Object.keys(b.languages).join(', ')));
        }
        displayRepos(sortedRepos);
    }

    fetchRepos();
});
