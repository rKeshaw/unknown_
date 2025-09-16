// The Serverless Hack, now with a Resilience Engine.
const ytdl = require('ytdl-core');
const ytDlp = require('yt-dlp-exec');

exports.handler = async (event) => {
    const { videoId } = event.queryStringParameters;

    if (!videoId) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing videoId.' }) };
    }

    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // --- Attempt 1: The Fast Method (ytdl-core) ---
    try {
        console.log(`[Attempt 1] Trying ytdl-core for: ${videoId}`);
        const info = await ytdl.getInfo(youtubeUrl);
        const format = ytdl.chooseFormat(info.formats, {
            quality: 'highest',
            filter: (f) => f.hasVideo && f.hasAudio && f.container === 'mp4',
        });
        if (!format) throw new Error('No suitable format found by ytdl-core.');
        
        console.log("[Attempt 1] Success!");
        return {
            statusCode: 200,
            body: JSON.stringify({ streamUrl: format.url, method: 'ytdl-core' }),
        };

    } catch (error) {
        console.warn("[Attempt 1] ytdl-core failed:", error.message);
        console.log(`[Attempt 2] Falling back to yt-dlp for: ${videoId}`);

        // --- Attempt 2: The Robust Method (yt-dlp) ---
        try {
            const output = await ytDlp(youtubeUrl, {
                dumpSingleJson: true,
                format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            });
            
            // yt-dlp gives us direct access to the best format's URL
            const streamUrl = output.url;
            if (!streamUrl) throw new Error('No stream URL found by yt-dlp.');

            console.log("[Attempt 2] Success!");
            return {
                statusCode: 200,
                body: JSON.stringify({ streamUrl: streamUrl, method: 'yt-dlp' }),
            };

        } catch (dlpError) {
            console.error("[Attempt 2] yt-dlp also failed:", dlpError);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'All fallback methods failed.' }),
            };
        }
    }
};
