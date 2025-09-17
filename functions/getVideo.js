const ytdl = require('ytdl-core');
const ytDlp = require('yt-dlp-exec');

exports.handler = async (event) => {
    // --- DIAGNOSTIC STEP ---
    console.log("BACK-END: getVideo function has been invoked.");
    // -----------------------

    const { videoId, audioOnly } = event.queryStringParameters;
    console.log("BACK-END: Received parameters:", { videoId, audioOnly });

    if (!videoId) {
        console.error("BACK-END: Error - Missing videoId.");
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing videoId.' }) };
    }

    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const isAudioOnly = audioOnly === 'true';
    const formatString = isAudioOnly 
        ? 'bestaudio[ext=m4a]/bestaudio'
        : 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best';
    
    console.log(`BACK-END: Determined format string: '${formatString}'`);

    try {
        console.log("BACK-END: Attempting to get stream with yt-dlp...");
        const output = await ytDlp(youtubeUrl, { dumpSingleJson: true, format: formatString });
        const streamUrl = output.url;

        if (!streamUrl) {
            console.error("BACK-END: Error - yt-dlp did not return a stream URL.");
            throw new Error('No stream URL found by yt-dlp.');
        }

        console.log("BACK-END: Success! Returning stream URL.");
        return {
            statusCode: 200,
            body: JSON.stringify({ streamUrl: streamUrl, method: 'yt-dlp' }),
        };

    } catch (error) {
        console.error("BACK-END: CRITICAL FAILURE in yt-dlp execution:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'All methods failed to get a stream.' }),
        };
    }
};