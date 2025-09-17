// const { Haptics, Dialog } = Capacitor.Plugins;

/// Sentry Initialization
// The Sentry object is globally available from the script in index.html.
Sentry.init({
	dsn: "https://b0391d31d771754145a7ee8e87c8697a@o4510035994935296.ingest.us.sentry.io/4510036017807360",
});

// --- CONFIGURATION & DOM ELEMENTS ---
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const resultsSidebar = document.getElementById('results-sidebar');
const playerContainer = document.getElementById('player-container');
const learnModeToggle = document.getElementById('learn-mode-toggle');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const scrollToTopBtn = document.getElementById('scroll-to-top');
let player; // This will hold the YouTube IFrame Player instance

// --- EVENT LISTENERS ---
searchForm.addEventListener('submit', handleSearchSubmit);
learnModeToggle.addEventListener('click', () => document.body.classList.toggle('learn-mode-active'));
darkModeToggle.addEventListener('click', toggleDarkMode);
resultsSidebar.addEventListener('scroll', handleSidebarScroll);
scrollToTopBtn.addEventListener('click', () => resultsSidebar.scrollTo({ top: 0, behavior: 'smooth' }));

// --- YOUTUBE API HANDLERS (Must be in global scope for the API script) ---
window.onYouTubeIframeAPIReady = () => {
    console.log("YouTube Player API Ready.");
};

window.handlePlayerStateChange = (event) => {
    // When a video ends (state 0), clear the player to hide recommendations.
    if (event.data === YT.PlayerState.ENDED) {
        playerContainer.innerHTML = `<div class="video-placeholder"><p>Video finished. Search for another.</p></div>`;
    }
};

window.handlePlayerError = (event) => {
    // Log errors from the IFrame player to the console.
    console.error("YouTube Player Error:", event.data);
    Sentry.captureMessage(`Youtubeer Error: ${event.data}`);
};


// --- CORE APPLICATION LOGIC ---

/**
 * Checks for a saved theme in localStorage and applies it on load.
 */
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

/**
 * Toggles dark mode and saves the preference.
 */
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

/**
 * Handles the main search form submission.
 */
async function handleSearchSubmit(event) {
    event.preventDefault();
    const query = searchInput.value.trim();
    if (!query) return;

    showSkeletonLoader();
    try {
        const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=20&q=${encodeURIComponent(query)}&key=AIzaSyCDBue0NEe_hAOmCGJNdjLB9EgHpZL3_Lw`);
        if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
        const data = await res.json();
        displayResults(data.items);
    } catch (error) {
        console.error("Search failed:", error);
        Sentry.captureException(error);
        resultsSidebar.innerHTML = `<p class="error">Search failed. Please try again.</p>`;
    }
}

/**
 * Displays the video search results in the sidebar.
 */
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
        resultItem.addEventListener('click', () => {
            Haptics.impact({ style: 'medium' });
            playVideo(videoId);
        });
        resultsSidebar.appendChild(resultItem);
    });
}

/**
 * Creates and controls the YouTube IFrame player.
 * This is the simplified, stable version.
 */
function playVideo(videoId) {
    searchInput.value = '';
    searchInput.blur();
    playerContainer.innerHTML = '<div id="youtube-player-iframe"></div>';

    player = new YT.Player('youtube-player-iframe', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: { 'playsinline': 1, 'rel': 0, 'autoplay': 1 },
        events: { 'onStateChange': window.handlePlayerStateChange, 'onError': window.handlePlayerError }
    });
}

/**
 * Displays a skeleton loader while results are being fetched.
 */
function showSkeletonLoader() {
    resultsSidebar.innerHTML = '';
    for (let i = 0; i < 8; i++) {
        const item = document.createElement('div');
        item.className = 'result-item';
        item.innerHTML = `<div class="skeleton skeleton-thumbnail"></div><div class="result-info"><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text short"></div></div>`;
        resultsSidebar.appendChild(item);
    }
}

/**
 * Shows or hides the 'Scroll to Top' button based on scroll position.
 */
function handleSidebarScroll() {
    scrollToTopBtn.style.display = (resultsSidebar.scrollTop > 300) ? 'flex' : 'none';
}
