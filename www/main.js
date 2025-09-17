
/// Global variables that the YouTube API needs
let player;
window.onYouTubeIframeAPIReady = () => console.log("YouTube Player API Ready.");

// The main entry point for our entire application
function runFocusTube() {
    Sentry.init({
	dsn: "https://b0391d31d771754145a7ee8e87c8697a@o4510035994935296.ingest.us.sentry.io/4510036017807360",
});

    // --- NATIVE PLUGINS (Now safely accessible) ---
    const { Haptics, Dialog } = Capacitor.Plugins;

    // --- DOM ELEMENTS ---
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const resultsSidebar = document.getElementById('results-sidebar');
    const playerContainer = document.getElementById('player-container');
    const learnModeToggle = document.getElementById('learn-mode-toggle');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const scrollToTopBtn = document.getElementById('scroll-to-top');

    // --- EVENT LISTENERS ---
    searchForm.addEventListener('submit', handleSearchSubmit);
    learnModeToggle.addEventListener('click', () => document.body.classList.toggle('learn-mode-active'));
    darkModeToggle.addEventListener('click', toggleDarkMode);
    resultsSidebar.addEventListener('scroll', handleSidebarScroll);
    scrollToTopBtn.addEventListener('click', () => resultsSidebar.scrollTo({ top: 0, behavior: 'smooth' }));

    // --- YOUTUBE API HANDLERS ---
    window.handlePlayerStateChange = (event) => {
        if (event.data === YT.PlayerState.ENDED) {
            playerContainer.innerHTML = `<div class="video-placeholder"><p>Video finished. Search for another.</p></div>`;
        }
    };
    window.handlePlayerError = (event) => {
        console.error("YouTube Player Error:", event.data);
        Sentry.captureMessage(`Youtubeer Error: ${event.data}`);
        Dialog.alert({
            title: 'Playback Error',
            message: `An error occurred with the YouTube player (Code: ${event.data}). The video may be private or deleted.`,
            buttonTitle: 'OK',
        });
    };

    // --- CORE LOGIC ---
    (function checkTheme() {
        try {
            if (localStorage.getItem('theme') === 'dark') {
                document.body.classList.add('dark-mode');
                darkModeToggle.textContent = '☀️';
            }
        } catch (e) { console.warn("Could not retrieve saved theme."); }
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
        } catch (e) { console.warn("Could not save theme preference."); }
    }

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
            Sentry.captureException(error);
            Dialog.alert({ title: 'Search Failed', message: error.message, buttonTitle: 'OK' });
            resultsSidebar.innerHTML = '';
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
            resultItem.addEventListener('click', () => {
                try { Haptics.impact({ style: 'medium' }); } catch (e) { console.warn("Haptics not available.") }
                playVideo(videoId);
            });
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
            events: { 'onStateChange': window.handlePlayerStateChange, 'onError': window.handlePlayerError }
        });
    }

    function showSkeletonLoader() {
        resultsSidebar.innerHTML = '';
        for (let i = 0; i < 8; i++) {
            const item = document.createElement('div');
            item.className = 'result-item';
            item.innerHTML = `<div class="skeleton skeleton-thumbnail"></div><div class="result-info"><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text short"></div></div>`;
            resultsSidebar.appendChild(item);
        }
    }

    function handleSidebarScroll() {
        scrollToTopBtn.style.display = (resultsSidebar.scrollTop > 300) ? 'flex' : 'none';
    }
}