// Sentry Initialization
Sentry.init({
	dsn: "https://b0391d31d771754145a7ee8e87c8697a@o4510035994935296.ingest.us.sentry.io/4510036017807360",
});

// We no longer need DOMContentLoaded because of the 'defer' attribute on our script tag.

// --- CONFIGURATION & DOM ELEMENTS ---
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const resultsSidebar = document.getElementById('results-sidebar');
const playerContainer = document.getElementById('player-container');
const learnModeToggle = document.getElementById('learn-mode-toggle');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const scrollToTopBtn = document.getElementById('scroll-to-top');
let player;

// --- EVENT LISTENERS ---
searchForm.addEventListener('submit', handleSearchSubmit);
learnModeToggle.addEventListener('click', () => document.body.classList.toggle('learn-mode-active'));
darkModeToggle.addEventListener('click', toggleDarkMode);
resultsSidebar.addEventListener('scroll', handleSidebarScroll);
scrollToTopBtn.addEventListener('click', () => resultsSidebar.scrollTo({ top: 0, behavior: 'smooth' }));

// --- YOUTUBE API HANDLERS ---
window.onYouTubeIframeAPIReady = () => console.log("YouTube Player API Ready.");
window.handlePlayerStateChange = (event) => {
    if (event.data === YT.PlayerState.ENDED) {
        playerContainer.innerHTML = `<div class="video-placeholder"><p>Video finished. Search for another.</p></div>`;
    }
};

// --- CORE LOGIC ---
(function checkTheme() {
    try {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            darkModeToggle.textContent = '☀️';
        }
    } catch (error) {
        console.warn("Could not retrieve saved theme. Storage might be blocked.");
    }
})();

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    try {
        if (document.body.classList.contains('dark-mode')) {
            localStorage.setItem('theme', 'dark');
            darkModeToggle.textContent = '☀️';
        } else {
            localStorage.setItem('theme', 'light');
            darkModeToggle.textContent = '🌙';
        }
    } catch (error) {
        console.warn("Could not save theme preference. Storage might be blocked.");
    }
}

async function handleSearchSubmit(event) {
    event.preventDefault();
    const query = searchInput.value.trim();
    if (!query) return;
    showSkeletonLoader();
    try {
        const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=15&q=${encodeURIComponent(query)}&key=AIzaSyCDBue0NEe_hAOmCGJNdjLB9EgHpZL3_Lw`);
        if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
        const data = await res.json();
        displayResults(data.items);
    } catch (error) {
        resultsSidebar.innerHTML = `<p class="error">Search failed.</p>`;
    }
}

function displayResults(items) {
    resultsSidebar.innerHTML = '';
    if (!items || items.length === 0) {
        resultsSidebar.innerHTML = '<p>No results found.</p>';
        return;
    }
    items.forEach(item => {
        const { videoId } = item.id;
        const { title, channelTitle, thumbnails } = item.snippet;
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        resultItem.innerHTML = `<img src="${thumbnails.medium.url}" alt="" class="result-thumbnail"><div class="result-info"><h3 class="result-title">${title}</h3><p class="result-channel">${channelTitle}</p></div>`;
        resultItem.addEventListener('click', () => playVideo(videoId));
        resultsSidebar.appendChild(resultItem);
    });
}

function playVideo(videoId) {
    searchInput.value = '';
    searchInput.blur();
    playerContainer.innerHTML = '<div id="youtube-player-iframe"></div>';
    player = new YT.Player('youtube-player-iframe', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: { 'playsinline': 1, 'rel': 0, 'autoplay': 1 },
        events: { 'onStateChange': window.handlePlayerStateChange }
    });
}

function showSkeletonLoader() {
    resultsSidebar.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        const item = document.createElement('div');
        item.className = 'result-item';
        item.innerHTML = `<div class="skeleton skeleton-thumbnail"></div><div class="result-info"><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text short"></div></div>`;
        resultsSidebar.appendChild(item);
    }
}

function handleSidebarScroll() {
    scrollToTopBtn.style.display = (resultsSidebar.scrollTop > 200) ? 'flex' : 'none';
}
