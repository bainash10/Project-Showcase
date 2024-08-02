import { GITHUB_TOKEN } from './config.js'; // Import token from config.js

document.addEventListener('DOMContentLoaded', () => {
    const repoContainer = document.getElementById('repo-container');
    const categoriesContainer = document.getElementById('categories');
    const searchInput = document.getElementById('search');
    const themeToggle = document.getElementById('theme-toggle');
    const sortSelect = document.getElementById('sort');
    const loadMoreButton = document.getElementById('load-more');
    const allLoadedText = document.getElementById('all-loaded');
    const username = 'bainash10'; // Replace with your GitHub username

    let allRepos = [];
    let filteredRepos = [];
    let currentBatch = 0;
    const batchSize = 6;

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark');
    });

    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        filteredRepos = allRepos.filter(repo => repo.name.toLowerCase().includes(searchTerm));
        displayRepos(filteredRepos);
    });

    sortSelect.addEventListener('change', () => {
        sortAndDisplayRepos(sortSelect.value);
    });

    loadMoreButton.addEventListener('click', () => {
        displayNextBatch();
    });

    categoriesContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('category')) {
            const techStack = e.target.textContent.split(':')[0];
            filteredRepos = allRepos.filter(repo => Object.keys(repo.languages).includes(techStack));
            displayRepos(filteredRepos);
        }
    });

    async function fetchRepos(page = 1, repos = []) {
        try {
            const response = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&page=${page}`, {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`
                }
            });
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            const data = await response.json();
            repos = repos.concat(data);
            if (data.length === 100) {
                return fetchRepos(page + 1, repos);
            }
            allRepos = await Promise.all(repos.map(async (repo) => {
                const languages = await fetchLanguages(repo.languages_url);
                repo.languages = languages;
                const commitsCount = await fetchCommitsCount(repo.commits_url.replace('{/sha}', ''));
                repo.commitsCount = commitsCount;
                return repo;
            }));
            filteredRepos = allRepos;
            displayRepos(filteredRepos);
            displayCategories(allRepos);
            updateTotalReposCount(allRepos.length);
        } catch (error) {
            console.error('Error fetching repos:', error);
        }
    }

    async function fetchLanguages(url) {
        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`
                }
            });
            return await response.json();
        } catch (error) {
            console.error('Error fetching languages:', error);
            return {};
        }
    }

    async function fetchCommitsCount(url) {
        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`
                }
            });
            const data = await response.json();
            return data.length;
        } catch (error) {
            console.error('Error fetching commits:', error);
            return 0;
        }
    }

    function displayRepos(repos) {
        repoContainer.innerHTML = '';
        currentBatch = 0;
        displayNextBatch();
        if (repos.length === 0) {
            allLoadedText.classList.remove('hidden');
        } else {
            allLoadedText.classList.add('hidden');
        }
    }

    function displayNextBatch() {
        const startIndex = currentBatch * batchSize;
        const endIndex = Math.min(startIndex + batchSize, filteredRepos.length);
        const nextBatch = filteredRepos.slice(startIndex, endIndex);

        nextBatch.forEach(repo => {
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

        currentBatch++;
        if (endIndex >= filteredRepos.length) {
            loadMoreButton.classList.add('hidden');
            allLoadedText.classList.remove('hidden');
        } else {
            loadMoreButton.classList.remove('hidden');
            allLoadedText.classList.add('hidden');
        }
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

    function updateTotalReposCount(count) {
        const totalReposCountElement = document.getElementById('total-repos-count'); // Ensure this ID matches
        if (totalReposCountElement) {
            totalReposCountElement.textContent = count; // Update textContent
        } else {
            console.error('Element with ID "total-repos-count" not found.');
        }
    }
    

    function sortAndDisplayRepos(criteria) {
        if (criteria === 'recent') {
            filteredRepos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        } else if (criteria === 'alphabetical') {
            filteredRepos.sort((a, b) => a.name.localeCompare(b.name));
        }
        displayRepos(filteredRepos);
    }

    fetchRepos();
});

