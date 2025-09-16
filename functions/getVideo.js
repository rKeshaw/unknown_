// The Serverless Hack: Our own private gateway to the video stream.
const ytdl = require('ytdl-core');

exports.handler = async (event) => {
    // Get the videoId from the query string (?videoId=...)
    const { videoId } = event.queryStringParameters;

    if (!videoId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Missing videoId parameter.' }),
        };
    }

    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

    try {
        console.log(`Fetching info for: ${youtubeUrl}`);
        const info = await ytdl.getInfo(youtubeUrl);

        // Find a format that has both video and audio, preferably mp4
        const format = ytdl.chooseFormat(info.formats, { 
            quality: 'highest',
            filter: (f) => f.hasVideo && f.hasAudio && f.container === 'mp4' 
        });
        
        if (!format) {
            throw new Error('No suitable video format found.');
        }

        console.log("Found stream URL. Sending back to the app.");
        return {
            statusCode: 200,
            body: JSON.stringify({ streamUrl: format.url }),
        };

    } catch (error) {
        console.error('Error fetching video stream:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Could not fetch the video stream.' }),
        };
    }
};
