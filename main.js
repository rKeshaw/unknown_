// A sacred space, free of algorithmic manipulation.

document.addEventListener('DOMContentLoaded', () => {
    const API_KEY = 'AIzaSyCDBue0NEe_hAOmCGJNdjLB9EgHpZL3_Lw';
    const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/search';

    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const resultsSidebar = document.getElementById('results-sidebar');
    const playerContainer = document.getElementById('player-container');
    const playerControls = document.getElementById('player-controls');
    const learnModeToggle = document.getElementById('learn-mode-toggle');
    const scrollToTopBtn = document.getElementById('scroll-to-top');
    let player;

    searchForm.addEventListener('submit', handleSearchSubmit);
    learnModeToggle.addEventListener('click', () => document.body.classList.toggle('learn-mode-active'));
    resultsSidebar.addEventListener('scroll', handleSidebarScroll);
    scrollToTopBtn.addEventListener('click', () => resultsSidebar.scrollTo({ top: 0, behavior: 'smooth' }));

    window.onYouTubeIframeAPIReady = () => console.log("YouTube Player API is globally ready.");
    window.handlePlayerError = (event) => {
        const error = event.data;
        const videoId = event.target.getVideoData().video_id;
        if (error === 101 || error === 150) playVideoFallback(videoId);
    };
    window.handlePlayerStateChange = (event) => {
        if (event.data === YT.PlayerState.ENDED) {
            playerContainer.innerHTML = `<div class="video-placeholder"><p>Video finished. Search for another.</p></div>`;
            playerControls.innerHTML = '';
        }
    };

    async function handleSearchSubmit(event) {
        event.preventDefault();
        const query = searchInput.value.trim();
        if (!query) return;
        showSkeletonLoader();
        try {
            const res = await fetch(`${YOUTUBE_API_URL}?part=snippet&type=video&maxResults=15&q=${encodeURIComponent(query)}&key=${API_KEY}`);
            if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
            const data = await res.json();
            displayResults(data.items);
        } catch (error) {
            console.error("Search failed:", error);
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
        playerControls.innerHTML = `<button id="audio-mode-btn" class="control-button" title="Switch to Audio Only">🎧</button>`;
        document.getElementById('audio-mode-btn').addEventListener('click', () => switchToAudioMode(videoId));
        player = new YT.Player('youtube-player-iframe', {
            height: '100%',
            width: '100%',
            videoId: videoId,
            playerVars: { 'playsinline': 1, 'rel': 0, 'autoplay': 1 },
            events: { 'onError': window.handlePlayerError, 'onStateChange': window.handlePlayerStateChange }
        });
    }

    async function playVideoFallback(videoId) {
        playerContainer.innerHTML = '<p>Attempting fallback...</p>';
        playerControls.innerHTML = `<button id="audio-mode-btn" class="control-button" title="Switch to Audio Only">🎧</button>`;
        document.getElementById('audio-mode-btn').addEventListener('click', () => switchToAudioMode(videoId));
        try {
            const res = await fetch(`/.netlify/functions/getVideo?videoId=${videoId}`);
            if (!res.ok) throw new Error('Fallback service failed.');
            const { streamUrl } = await res.json();
            if (!streamUrl) throw new Error('No stream URL returned.');
            playerControls.innerHTML = '';
            playerContainer.innerHTML = `<video controls autoplay style="width: 100%; height: 100%;"><source src="${streamUrl}" type="video/mp4"></video>`;
        } catch (error) {
            console.error('Fallback failed:', error);
            playerContainer.innerHTML = `<p class="error">This video is restricted and the fallback method failed.</p>`;
            playerControls.innerHTML = '';
        }
    }

    async function switchToAudioMode(videoId) {
        playerContainer.innerHTML = '<p>Switching to Audio Mode...</p>';
        playerControls.innerHTML = '';
        try {
            const requestUrl = `/.netlify/functions/getVideo?videoId=${videoId}&audioOnly=true`;
            const res = await fetch(requestUrl);

            // NEW: If the response is not ok, we read the error details
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.details || 'Audio fallback service failed with no details.');
            }

            const { streamUrl } = await res.json();
            if (!streamUrl) throw new Error('No audio stream URL returned.');
            playerContainer.innerHTML = `<audio controls autoplay style="width: 100%;"><source src="${streamUrl}" type="audio/mp4"></audio>`;
        } catch (error) {
            // The error logged here will now be much more detailed
            console.error('CRITICAL AUDIO MODE FAILURE:', error);
            playerContainer.innerHTML = `<p class="error">Could not switch to audio mode. Check console for details.</p>`;
        }
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