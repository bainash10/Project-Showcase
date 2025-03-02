import { GITHUB_TOKEN } from './config.js'; // Import token from config.js

document.addEventListener('DOMContentLoaded', () => {
    const repoContainer = document.getElementById('repo-container');
    const categoriesContainer = document.getElementById('categories');
    const searchInput = document.getElementById('search');
    const themeToggle = document.getElementById('theme-toggle');
    const sortSelect = document.getElementById('sort');
    const loadMoreButton = document.getElementById('load-more');
    const allLoadedText = document.getElementById('all-loaded');
    const languagesContainer = document.getElementById('languages');
    const username = 'bainash10'; // Replace with your GitHub username

    let allRepos = [];
    let filteredRepos = [];
    let currentBatch = 0;
    const batchSize = 6;
    let majorLanguages = [];
    let languageCounts = {}; // Track language counts

    // Set default sort option to "recent"
    sortSelect.value = 'recent';
    
    document.getElementById('theme-toggle').addEventListener('click', function() {
        document.body.classList.toggle('dark');
        const icon = document.getElementById('theme-icon');
        if (document.body.classList.contains('dark')) {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        } else {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        }
    });
    
    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        filteredRepos = allRepos.filter(repo => repo.name.toLowerCase().includes(searchTerm));
        sortAndDisplayRepos(sortSelect.value); // Ensure sorting is applied
    });

    sortSelect.addEventListener('change', () => {
        sortAndDisplayRepos(sortSelect.value);
    });

    loadMoreButton.addEventListener('click', () => {
        displayNextBatch();
    });

    languagesContainer.addEventListener('change', (e) => {
        if (e.target.tagName === 'INPUT' && e.target.type === 'checkbox') {
            const selectedLanguages = Array.from(languagesContainer.querySelectorAll('input:checked')).map(input => input.value);
            filteredRepos = allRepos.filter(repo => {
                const repoLanguages = Object.keys(repo.languages);
                return selectedLanguages.every(lang => repoLanguages.includes(lang));
            });
            sortAndDisplayRepos(sortSelect.value); // Ensure sorting is applied
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
            determineMajorLanguages(allRepos);
            filteredRepos = allRepos;
            sortAndDisplayRepos(sortSelect.value); // Ensure sorting is applied
            displayLanguages(majorLanguages);
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

    function determineMajorLanguages(repos) {
        languageCounts = {}; // Reset language counts

        repos.forEach(repo => {
            const repoLanguages = Object.keys(repo.languages);
            repoLanguages.forEach(lang => {
                if (!languageCounts[lang]) {
                    languageCounts[lang] = 0;
                }
                languageCounts[lang]++;
            });
        });

        // Sort languages by count and select top ones
        const sortedLanguages = Object.keys(languageCounts).sort((a, b) => languageCounts[b] - languageCounts[a]);
        majorLanguages = sortedLanguages; // Show all major languages

        displayLanguages(majorLanguages);
    }

    function displayLanguages(majorLanguages) {
        languagesContainer.innerHTML = '';
        majorLanguages.forEach(language => {
            const count = languageCounts[language] || 0; // Get the count or default to 0
            const languageDiv = document.createElement('div');
            languageDiv.classList.add('language-checkbox');
            languageDiv.innerHTML = `
                <input type="checkbox" id="${language}" value="${language}">
                <label for="${language}">${language} (${count})</label>
            `;
            languagesContainer.appendChild(languageDiv);
        });
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
    
            const commitInfo = document.createElement('p');
            commitInfo.classList.add('commits');
            commitInfo.textContent = `Commits: ${repo.commitsCount}`;
    
            const repoDetails = document.createElement('p');
            repoDetails.classList.add('created-at');
            repoDetails.textContent = `Created at: ${new Date(repo.created_at).toLocaleDateString()}`;
    
            const techStacks = document.createElement('p');
            techStacks.classList.add('tech-stacks');
            techStacks.textContent = `Tech Stacks: ${Object.keys(repo.languages).join(', ') || 'Unknown'}`;
    
            const sourceCode = document.createElement('div');
            sourceCode.classList.add('source-code');
            sourceCode.innerHTML = `
                <a href="${repo.html_url}" target="_blank">View Source Code</a>
            `;
    
            repoDiv.appendChild(repoName);
            repoDiv.appendChild(commitInfo); // Commit info first
            repoDiv.appendChild(repoDetails); // Created at second
            repoDiv.appendChild(techStacks); // Tech stacks third
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

    // Initialize fetching repos
    fetchRepos();
});
