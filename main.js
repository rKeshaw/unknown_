// A sacred space, free of algorithmic manipulation.

// --- CONFIGURATION ---
const API_KEY = 'AIzaSyCDBue0NEe_hAOmCGJNdjLB9EgHpZL3_Lw'; // Temporary exposed key
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/search';

// --- DOM ELEMENTS ---
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const resultsSidebar = document.getElementById('results-sidebar');
const playerContainer = document.getElementById('player-container');

// --- PLAYER VARIABLE ---
let player; // This will hold the YouTube IFrame Player instance

// --- YOUTUBE I-FRAME API ---
// This special function is called by the YouTube API script once it's ready.
function onYouTubeIframeAPIReady() {
    console.log("YouTube Player API Ready.");
    // We don't create the player here, we create it when the first video plays.
    // This prevents a player from loading unnecessarily on page start.
}

// --- EVENT LISTENERS ---
searchForm.addEventListener('submit', handleSearchSubmit);

// --- CORE FUNCTIONS ---

/**
 * Handles the search form submission.
 */
async function handleSearchSubmit(event) {
    event.preventDefault();
    const query = searchInput.value.trim();
    if (!query) return;

    console.log(`Searching for: "${query}"`);
    resultsSidebar.innerHTML = '<p>Searching...</p>';
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
    playerContainer.innerHTML = '<div id="youtube-player"></div>'; // Prepare div for player
    player = new YT.Player('youtube-player', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: { 'playsinline': 1, 'rel': 0, 'autoplay': 1 },
        events: {
            'onError': handlePlayerError
        }
    });
}

/**
 * Handles errors from the YouTube player. This is the trigger for our hack.
 */
function handlePlayerError(event) {
    const error = event.data;
    const videoId = event.target.getVideoData().video_id;
    console.error('YouTube Player Error:', error);

    // Error 101 or 150 means the video owner has disabled embedding.
    if (error === 101 || error === 150) {
        console.warn('Embedding disabled. Attempting fallback...');
        playVideoFallback(videoId);
    }
}

/**
 * Second attempt: Plays the video using our serverless function and an HTML5 player.
 */
async function playVideoFallback(videoId) {
    playerContainer.innerHTML = '<p>Embedding disabled. Attempting fallback...</p>';
    try {
        // This is the call to our own back-end function.
        // The path '/.netlify/functions/getVideo' is a standard for Netlify.
        const response = await fetch(`/.netlify/functions/getVideo?videoId=${videoId}`);
        if (!response.ok) throw new Error('Fallback service failed.');
        
        const { streamUrl } = await response.json();
        if (!streamUrl) throw new Error('No stream URL returned from fallback service.');

        console.log("Fallback successful. Playing direct stream.");
        // Replace the container content with a standard HTML5 video player
        playerContainer.innerHTML = `
            <video controls autoplay style="width: 100%; height: 100%;">
                <source src="${streamUrl}" type="video/mp4">
                Your browser does not support the video tag.
            </video>
        `;
    } catch (error) {
        console.error('Fallback failed:', error);
        playerContainer.innerHTML = `<p class="error">Could not play this video. The owner has restricted it, and our fallback method also failed.</p>`;
    }
}
