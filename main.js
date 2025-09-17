// A sacred space, free of algorithmic manipulation.

// This is the starting pistol. All code that interacts with the page on load
// must go inside this listener.
document.addEventListener('DOMContentLoaded', () => {

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

    // --- EVENT LISTENERS ---
    // We check if each element exists before adding a listener to prevent errors.
    if (searchForm) {
        searchForm.addEventListener('submit', handleSearchSubmit);
    }
    if (learnModeToggle) {
        learnModeToggle.addEventListener('click', toggleLearnMode);
    }
    if (resultsSidebar) {
        resultsSidebar.addEventListener('scroll', handleSidebarScroll);
    }
    if (scrollToTopBtn) {
        scrollToTopBtn.addEventListener('click', handleScrollToTop);
    }

    // --- CORE FUNCTIONS ---

    function toggleLearnMode() {
        document.body.classList.toggle('learn-mode-active');
    }

    async function handleSearchSubmit(event) {
        event.preventDefault();
        const query = searchInput.value.trim();
        if (!query) return;
        showSkeletonLoader();
        try {
            const searchResults = await fetchYouTubeVideos(query);
            displayResults(searchResults.items);
        } catch (error) {
            console.error("Search failed:", error);
            resultsSidebar.innerHTML = `<p class="error">Search failed.</p>`;
        }
    }

    async function fetchYouTubeVideos(query) {
        const url = `${YOUTUBE_API_URL}?part=snippet&type=video&maxResults=15&q=${encodeURIComponent(query)}&key=${API_KEY}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        return response.json();
    }

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

    // Note: The global onYouTubeIframeAPIReady function must remain outside the DOMContentLoaded listener
    // because the YouTube API script looks for it in the global scope. We will link it to our code.
    window.handlePlayerError = (event) => {
        const error = event.data;
        const videoId = event.target.getVideoData().video_id;
        console.error('YouTube Player Error:', error);
        if (error === 101 || error === 150) {
            playVideoFallback(videoId);
        }
    };

	function playVideo(videoId) {
        searchInput.value = '';
        searchInput.blur();
        
        // Create the player
        playerContainer.innerHTML = '<div id="youtube-player"></div>';
        player = new YT.Player('youtube-player', {
            height: '100%',
            width: '100%',
            videoId: videoId,
            playerVars: { 'playsinline': 1, 'rel': 0, 'autoplay': 1 },
            events: {
                'onError': window.handlePlayerError,
                'onStateChange': handlePlayerStateChange
            }
        });

        // Now, separately, add the controls. This is now safe.
        const controls = document.getElementById('player-controls');
        controls.innerHTML = `<button id="audio-mode-btn" class="control-button" title="Switch to Audio Only">🎧</button>`;
        document.getElementById('audio-mode-btn').addEventListener('click', () => switchToAudioMode(videoId));
    }

    async function playVideoFallback(videoId) {
        playerContainer.innerHTML = '<p>Attempting fallback...</p>';
        
        // Add the controls
        const controls = document.getElementById('player-controls');
        controls.innerHTML = `<button id="audio-mode-btn" class="control-button" title="Switch to Audio Only">🎧</button>`;
        document.getElementById('audio-mode-btn').addEventListener('click', () => switchToAudioMode(videoId));

        try {
            const response = await fetch(`/.netlify/functions/getVideo?videoId=${videoId}`);
            if (!response.ok) throw new Error('Fallback service failed.');
            const { streamUrl } = await response.json();
            if (!streamUrl) throw new Error('No stream URL returned.');
            
            // When fallback succeeds, we can leave the controls in case they want to switch back
            playerContainer.innerHTML = `<video controls autoplay style="width: 100%; height: 100%;"><source src="${streamUrl}" type="video/mp4"></video>`;
        } catch (error) {
            console.error('Fallback failed:', error);
            playerContainer.innerHTML = `<p class="error">This video is restricted and the fallback method failed.</p>`;
            controls.innerHTML = ''; // Clear controls on final failure
        }
    }

	/*
	 * Fetches an audio-only stream and replaces the player.
	 */
	async function switchToAudioMode(videoId) {
    	console.log("Switching to audio-only mode for:", videoId);
	    playerContainer.innerHTML = '<p>Switching to Audio Mode...</p>';
	    const controls = document.getElementById('player-controls');
    	controls.innerHTML = ''; // Hide the button once clicked

	    try {
    	    // Call our serverless function, now with the audioOnly parameter
        	const response = await fetch(`/.netlify/functions/getVideo?videoId=${videoId}&audioOnly=true`);
	        if (!response.ok) throw new Error('Audio fallback service failed.');
        
    	    const { streamUrl } = await response.json();
        	if (!streamUrl) throw new Error('No audio stream URL returned.');

	        console.log("Audio stream acquired. Playing now.");
    	    // Replace the container content with a standard HTML5 audio player
        	playerContainer.innerHTML = `
	            <audio controls autoplay style="width: 100%;">
    	            <source src="${streamUrl}" type="audio/mp4">
        	        Your browser does not support the audio element.
            	</audio>
	        `;
    	} catch (error) {
        	console.error('Audio mode switch failed:', error);
	        playerContainer.innerHTML = `<p class="error">Could not switch to audio mode.</p>`;
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
        if (resultsSidebar.scrollTop > 200) {
            scrollToTopBtn.style.display = 'flex';
        } else {
            scrollToTopBtn.style.display = 'none';
        }
    }

    function handleScrollToTop() {
        resultsSidebar.scrollTo({ top: 0, behavior: 'smooth' });
    }
});

// This function MUST be in the global scope for the YouTube API to find it.
function onYouTubeIframeAPIReady() {
    console.log("YouTube Player API is globally ready.");
}
