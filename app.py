import json
import yt_dlp
from flask import Flask, request, jsonify
from flask_cors import CORS
import sentry_sdk

sentry_sdk.init(
    dsn="https://b0391d31d771754145a7ee8e87c8697a@o4510035994935296.ingest.us.sentry.io/4510036017807360",
    traces_sample_rate=1.0
)

# Initialize the Flask application
app = Flask(__name__)
# Enable Cross-Origin Resource Sharing (CORS)
CORS(app)

@app.route('/')
def health_check():
    return jsonify({'status': 'healthy'}), 200

@app.route('/getVideo', methods=['GET'])
def get_video_stream():
    try:
        video_id = request.args.get('videoId')
        if not video_id:
            return jsonify({'error': 'Missing videoId.'}), 400

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

            return jsonify({'streamUrl': stream_url})

    except Exception as e:
        print(f"CRITICAL FLASK FAILURE: {e}")
        return jsonify({'error': 'The back-end failed.', 'details': str(e)}), 500

if __name__ == "__main__":
    # This allows running the app locally for testing
    app.run(host='0.0.0.0', port=8080)
