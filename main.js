// A sacred space, free of algorithmic manipulation.

// --- CONFIGURATION ---
const API_KEY = 'AIzaSyCDBue0NEe_hAOmCGJNdjLB9EgHpZL3_Lw'; // Temporary exposed key
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/search';

// --- DOM ELEMENTS ---
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const resultsSidebar = document.getElementById('results-sidebar');
const playerContainer = document.getElementById('player-container');
const learnModeToggle = document.getElementById('learn-mode-toggle');
const scrollToTopBtn = document.getElementById('scroll-to-top');

// --- PLAYER VARIABLE ---
let player;

// --- YOUTUBE I-FRAME API ---
function onYouTubeIframeAPIReady() {
    console.log("YouTube Player API Ready.");
}

// --- EVENT LISTENERS ---
searchForm.addEventListener('submit', handleSearchSubmit);
learnModeToggle.addEventListener('click', toggleLearnMode);
// CORRECTED: These listeners were missing and are now activated.
resultsSidebar.addEventListener('scroll', handleSidebarScroll);
console.log("Scroll event listener has been attached to the sidebar.")
scrollToTopBtn.addEventListener('click', handleScrollToTop);

// --- CORE FUNCTIONS ---

/**
 * Toggles Learn Mode on and off.
 */
function toggleLearnMode() {
    document.body.classList.toggle('learn-mode-active');
    console.log("Learn Mode Toggled.");
}

/**
 * Handles the search form submission.
 */
async function handleSearchSubmit(event) {
    event.preventDefault();
    const query = searchInput.value.trim();
    if (!query) return;

    console.log(`Searching for: "${query}"`);
    showSkeletonLoader();
    try {
        const searchResults = await fetchYouTubeVideos(query);
        displayResults(searchResults.items);
    } catch (error) {
        console.error("Search failed:", error);
        resultsSidebar.innerHTML = `<p class="error">Search failed. Please try again.</p>`;
    }
}

/**
 * Fetches videos from the YouTube Data API.
 */
async function fetchYouTubeVideos(query) {
    const url = `${YOUTUBE_API_URL}?part=snippet&type=video&maxResults=15&q=${encodeURIComponent(query)}&key=${API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return response.json();
}

/**
 * Renders the search results in the sidebar.
 */
function displayResults(items) {
    resultsSidebar.innerHTML = '';
    if (!items || items.length === 0) {
        resultsSidebar.innerHTML = '<p>No results found.</p>';
        return;
    }
    items.forEach(item => {
        const videoId = item.id.videoId;
        const { title, channelTitle, thumbnails } = item.snippet;
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        resultItem.innerHTML = `
            <img src="${thumbnails.medium.url}" alt="" class="result-thumbnail">
            <div class="result-info">
                <h3 class="result-title">${title}</h3>
                <p class="result-channel">${channelTitle}</p>
            </div>
        `;
        resultItem.addEventListener('click', () => playVideo(videoId));
        resultsSidebar.appendChild(resultItem);
    });
}

/**
 * First attempt: Tries to play a video using the official IFrame player.
 */
function playVideo(videoId) {
    searchInput.value = ''; // Clear the search input
    searchInput.blur(); // Remove focus from the input
    playerContainer.innerHTML = '<div id="youtube-player"></div>';
    player = new YT.Player('youtube-player', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: { 'playsinline': 1, 'rel': 0, 'autoplay': 1 },
        events: { 'onError': handlePlayerError }
    });
}

/**
 * Handles errors from the YouTube player.
 */
function handlePlayerError(event) {
    const error = event.data;
    const videoId = event.target.getVideoData().video_id;
    console.error('YouTube Player Error:', error);
    if (error === 101 || error === 150) {
        console.warn('Embedding disabled. Attempting fallback...');
        playVideoFallback(videoId);
    }
}

/**
 * Second attempt: Plays the video using our serverless function.
 */
async function playVideoFallback(videoId) {
    playerContainer.innerHTML = '<p>Embedding disabled. Attempting fallback...</p>';
    try {
        const response = await fetch(`/.netlify/functions/getVideo?videoId=${videoId}`);
        if (!response.ok) throw new Error('Fallback service failed.');
        const { streamUrl } = await response.json();
        if (!streamUrl) throw new Error('No stream URL returned.');
        console.log("Fallback successful. Playing direct stream.");
        playerContainer.innerHTML = `
            <video controls autoplay style="width: 100%; height: 100%;">
                <source src="${streamUrl}" type="video/mp4">
            </video>
        `;
    } catch (error) {
        console.error('Fallback failed:', error);
        playerContainer.innerHTML = `<p class="error">Could not play this video. The owner has restricted it, and our fallback method also failed.</p>`;
    }
}

/**
 * Displays a skeleton loader in the sidebar while searching.
 */
function showSkeletonLoader() {
    resultsSidebar.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        const item = document.createElement('div');
        item.className = 'result-item';
        item.innerHTML = `
            <div class="skeleton skeleton-thumbnail"></div>
            <div class="result-info">
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text short"></div>
            </div>
        `;
        resultsSidebar.appendChild(item);
    }
}

/**
 * Handles showing/hiding the 'Scroll to Top' button.
 */
function handleSidebarScroll() {
	console.log("Sidebar is scrolling! Current scroll position:", resultsSidebar.scrollTop);
    if (resultsSidebar.scrollTop > 200) {
        scrollToTopBtn.style.display = 'flex';
    } else {
        scrollToTopBtn.style.display = 'none';
    }
}

/**
 * Scrolls the sidebar back to the top when the button is clicked.
 */
function handleScrollToTop() {
    resultsSidebar.scrollTo({ top: 0, behavior: 'smooth' });
}
