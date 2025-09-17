import * as Sentry from "@sentry/browser";

Sentry.init({
	dsn: "https://b0391d31d771754145a7ee8e87c8697a@o4510035994935296.ingest.us.sentry.io/4510036017807360",
	integrations: [
		Sentry.browserTracingIntegration(),
		Sentry.replayIntegration(),
	],
	tracesSampleRate: 1.0,
	replaysOnErrorSampleRate: 1.0,
	replaysSessionSampleRate: 0.1,
	sendDefaultPii: true
});

document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION & DOM ELEMENTS ---
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const resultsSidebar = document.getElementById('results-sidebar');
    const playerContainer = document.getElementById('player-container');
    const playerControls = document.getElementById('player-controls');
    const learnModeToggle = document.getElementById('learn-mode-toggle');
    const scrollToTopBtn = document.getElementById('scroll-to-top');

	const sentryTestBtn = document.getElementById('test-sentry');
    if (sentryTestBtn) {
        sentryTestBtn.addEventListener('click', () => {
            // This will cause a deliberate error because the function doesn't exist
            nonExistentFunction(); 
        });
    }

    let player; // YouTube IFrame Player instance

    // --- EVENT LISTENERS ---
    searchForm.addEventListener('submit', handleSearchSubmit);
    learnModeToggle.addEventListener('click', () => document.body.classList.toggle('learn-mode-active'));
    resultsSidebar.addEventListener('scroll', handleSidebarScroll);
    scrollToTopBtn.addEventListener('click', () => resultsSidebar.scrollTo({ top: 0, behavior: 'smooth' }));

    // --- YOUTUBE API HANDLERS (kept in global scope for the API script) ---
    window.onYouTubeIframeAPIReady = () => console.log("YouTube Player API Ready.");
    window.handlePlayerError = (event) => {
        const videoId = event.target.getVideoData().video_id;
        if (event.data === 101 || event.data === 150) playVideoFallback(videoId);
    };
    window.handlePlayerStateChange = (event) => {
        if (event.data === YT.PlayerState.ENDED) {
            playerContainer.innerHTML = `<div class="video-placeholder"><p>Video finished. Search for another.</p></div>`;
            playerControls.innerHTML = '';
        }
    };

    // --- CORE LOGIC ---
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

    async function playVideo(videoId) {
        searchInput.value = '';
        searchInput.blur();
        
        // Show a temporary loading state in the player
        playerContainer.innerHTML = '<p>Loading Player...</p>';
        playerControls.innerHTML = ''; // Clear old controls

        // Proactively fetch the stream URL in the background
        let streamUrl = null;
        try {
            const streamData = await fetchStream(videoId);
            streamUrl = streamData.streamUrl;
        } catch (error) {
            console.error("Initial stream fetch failed, will rely on IFrame.", error);
        }

        // Load the official YouTube IFrame Player
        playerContainer.innerHTML = '<div id="youtube-player-iframe"></div>';
        player = new YT.Player('youtube-player-iframe', {
            height: '100%',
            width: '100%',
            videoId: videoId,
            playerVars: { 'playsinline': 1, 'rel': 0, 'autoplay': 1 },
            events: { 'onError': window.handlePlayerError, 'onStateChange': window.handlePlayerStateChange }
        });

        // NOW, add the audio button. If we successfully fetched a stream, attach it.
        if (streamUrl) {
            playerControls.innerHTML = `<button id="audio-mode-btn" class="control-button" title="Switch to Audio Only">🎧</button>`;
            const audioBtn = document.getElementById('audio-mode-btn');
            // We pass the already-fetched URL directly to the click handler
            audioBtn.addEventListener('click', () => switchToAudioMode(streamUrl));
        }
    }


    async function playVideoFallback(videoId) {
        playerContainer.innerHTML = '<p>Attempting fallback...</p>';
        playerControls.innerHTML = `<button id="audio-mode-btn" class="control-button" title="Switch to Audio Only">🎧</button>`;
        document.getElementById('audio-mode-btn').addEventListener('click', () => switchToAudioMode(videoId));
        try {
            const { streamUrl } = await fetchStream(videoId);
            playerControls.innerHTML = '';
            playerContainer.innerHTML = `<video controls autoplay style="width: 100%; height: 100%;"><source src="${streamUrl}" type="video/mp4"></video>`;
        } catch (error) {
            playerContainer.innerHTML = `<p class="error">This video is restricted and our fallback method failed.</p>`;
            playerControls.innerHTML = '';
        }
    }

    function switchToAudioMode(streamUrl) {
        // This function no longer needs to fetch anything. It receives the URL directly.
        console.log("Stream URL is ready. Creating audio player.");
        playerContainer.innerHTML = `
            <div style="text-align: center; color: #ccc; padding-bottom: 10px;"><p style="margin: 0;">Now Playing (Audio Only)</p></div>
            <audio controls autoplay style="width: 100%;"><source src="${streamUrl}" type="video/mp4"></audio>
        `;
        playerControls.innerHTML = '';
    }
    
    // NEW Refactored function to handle all stream fetching
    async function fetchStream(videoId) {
        const res = await fetch(`/.netlify/functions/getVideo?videoId=${videoId}`);
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.details || 'Stream service failed.');
        }
        return res.json();
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
});
