// The Serverless Hack, now with an Audio Mode.
const ytdl = require('ytdl-core');
const ytDlp = require('yt-dlp-exec');

exports.handler = async (event) => {
    // We now check for 'videoId' AND 'audioOnly' parameters
    const { videoId, audioOnly } = event.queryStringParameters;

    if (!videoId) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing videoId.' }) };
    }

    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // --- Determine the correct format based on the request ---
    const isAudioOnly = audioOnly === 'true';
    const formatString = isAudioOnly 
        ? 'bestaudio[ext=m4a]/bestaudio' // Format for audio-only
        : 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'; // Format for video+audio

    if (isAudioOnly) {
        console.log(`[Audio Mode] Requesting audio-only stream for: ${videoId}`);
    } else {
        console.log(`[Video Mode] Requesting video stream for: ${videoId}`);
    }

    // --- We will primarily use yt-dlp as it's more flexible for format selection ---
    try {
        const output = await ytDlp(youtubeUrl, {
            dumpSingleJson: true,
            format: formatString,
        });

        const streamUrl = output.url;
        if (!streamUrl) throw new Error('No stream URL found by yt-dlp.');

        console.log("[Success] Found stream URL. Sending back to the app.");
        return {
            statusCode: 200,
            body: JSON.stringify({ streamUrl: streamUrl, method: 'yt-dlp' }),
        };

    } catch (error) {
        console.error("[Failed] yt-dlp failed:", error);
        // You could add a second fallback method here in the future if needed
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'All methods failed to get a stream.' }),
        };
    }
};
