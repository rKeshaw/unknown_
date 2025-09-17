// The Refactored Serverless Function: Simple, Robust, Focused.
const ytdl = require('ytdl-core');

exports.handler = async (event) => {
    const { videoId } = event.queryStringParameters;

    if (!videoId) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing videoId.' }) };
    }

    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    console.log(`Requesting video+audio stream for: ${videoId}`);

    try {
        const info = await ytdl.getInfo(youtubeUrl);
        
        // We ONLY request a format with both video and audio.
        const format = ytdl.chooseFormat(info.formats, {
            quality: 'highest',
            filter: 'videoandaudio' 
        });
        
        if (!format) {
            throw new Error(`No suitable video+audio format found.`);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ streamUrl: format.url }),
        };

    } catch (error) {
        console.error("ytdl-core FAILURE:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'Could not fetch the video stream.',
                details: error.message
            }),
        };
    }
};