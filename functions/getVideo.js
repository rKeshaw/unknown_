const ytdl = require('ytdl-core');
const ytDlp = require('yt-dlp-exec');

exports.handler = async (event) => {
    const { videoId, audioOnly } = event.queryStringParameters;
    if (!videoId) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing videoId.' }) };
    }
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const isAudioOnly = audioOnly === 'true';
    const formatString = isAudioOnly ? 'bestaudio[ext=m4a]/bestaudio' : 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best';

    try {
        const output = await ytDlp(youtubeUrl, { dumpSingleJson: true, format: formatString });
        const streamUrl = output.url;
        if (!streamUrl) throw new Error('No stream URL found by yt-dlp.');
        return {
            statusCode: 200,
            body: JSON.stringify({ streamUrl: streamUrl, method: 'yt-dlp' }),
        };
    } catch (error) {
        console.error("BACK-END FAILURE:", error);
        // NEW: Send the detailed error message back to the front-end
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'Could not fetch the video stream.',
                details: error.message // This includes the real error from yt-dlp
            }),
        };
    }
};
