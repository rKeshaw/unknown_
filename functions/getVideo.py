import json
import yt_dlp

def handler(event, context):
    try:
        query_params = event.get('queryStringParameters', {})
        video_id = query_params.get('videoId')

        if not video_id:
            return { 'statusCode': 400, 'body': json.dumps({ 'error': 'Missing videoId.' }) }

        youtube_url = f"https://www.youtube.com/watch?v={video_id}"

        ydl_opts = {
            'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            'quiet': True,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(youtube_url, download=False)
            stream_url = info.get('url')

            if not stream_url:
                raise Exception('No stream URL found by yt-dlp.')

            return {
                'statusCode': 200,
                'body': json.dumps({ 'streamUrl': stream_url })
            }

    except Exception as e:
        # This will now log the true Python error to your Netlify log
        print(f"CRITICAL PYTHON FAILURE: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({ 'error': 'The Python back-end failed.', 'details': str(e) })
        }
