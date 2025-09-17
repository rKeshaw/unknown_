// The final, compatible serverless function.
const ytdl = require('ytdl-core');

exports.handler = async (event) => {
    const { videoId, audioOnly } = event.queryStringParameters;

    if (!videoId) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing videoId.' }) };
    }

    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const isAudioOnly = audioOnly === 'true';

    console.log(`Request received. Audio Only: ${isAudioOnly}, Video ID: ${videoId}`);

    try {
        const info = await ytdl.getInfo(youtubeUrl);

        // Determine the correct filter based on the request
        const filter = isAudioOnly ? 'audioonly' : 'videoandaudio';
        
        const format = ytdl.chooseFormat(info.formats, {
            quality: 'highest',
            filter: filter
        });
        
        if (!format) {
            throw new Error(`No suitable ${filter} format found by ytdl-core.`);
        }

        console.log("Success! Found a stream URL with ytdl-core.");
        return {
            statusCode: 200,
            body: JSON.stringify({ streamUrl: format.url }),
        };

    } catch (error) {
        console.error("CRITICAL ytdl-core FAILURE:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'Could not fetch the video stream.',
                details: error.message
            }),
        };
    }
};