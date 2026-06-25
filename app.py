import os
import uuid
import json
import datetime
import yt_dlp
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

# Configure folder locations
WORKSPACE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FOLDER = os.path.join(WORKSPACE_DIR, 'data')
os.makedirs(DATA_FOLDER, exist_ok=True)

SESSIONS_FILE = os.path.join(DATA_FOLDER, 'sessions.json')

def load_sessions():
    if os.path.exists(SESSIONS_FILE):
        try:
            with open(SESSIONS_FILE, 'r') as f:
                return json.load(f)
        except Exception as e:
            print("Failed to load sessions:", e)
            return []
    return []

def save_sessions(sessions):
    try:
        with open(SESSIONS_FILE, 'w') as f:
            json.dump(sessions, f, indent=2)
    except Exception as e:
        print("Failed to save sessions:", e)

@app.route('/')
def route_index():
    return render_template('index.html')

@app.route('/api/preview', methods=['POST'])
def route_preview():
    data = request.json or {}
    url = data.get('url')
    if not url:
        return jsonify({'error': 'YouTube URL is required'}), 400
        
    try:
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
            'nocheckcertificate': True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            # Format duration to mm:ss or hh:mm:ss
            duration_secs = info.get('duration', 0)
            if duration_secs >= 3600:
                hours = duration_secs // 3600
                mins = (duration_secs % 3600) // 60
                secs = duration_secs % 60
                duration_str = f"{hours}:{mins:02d}:{secs:02d}"
            else:
                mins = duration_secs // 60
                secs = duration_secs % 60
                duration_str = f"{mins}:{secs:02d}"
                
            return jsonify({
                'success': True,
                'title': info.get('title', 'Unknown Title'),
                'duration': duration_str,
                'thumbnail': info.get('thumbnail', ''),
                'author': info.get('uploader', 'Unknown Creator'),
                'views': f"{info.get('view_count', 0):,}" if info.get('view_count') else '0'
            })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/session/save', methods=['POST'])
def route_save_session():
    data = request.json or {}
    tutorial_url = data.get('tutorial_url')
    soundtrack_url = data.get('soundtrack_url')
    tutorial_title = data.get('tutorial_title', 'Unknown Tutorial')
    soundtrack_title = data.get('soundtrack_title', 'Unknown Soundtrack')
    tutorial_vol = data.get('tutorial_vol', 100)
    soundtrack_vol = data.get('soundtrack_vol', 20)
    enable_ducking = data.get('enable_ducking', False)
    thumbnail = data.get('thumbnail', '')
    
    if not tutorial_url or not soundtrack_url:
        return jsonify({'error': 'Both Tutorial and Soundtrack URLs are required.'}), 400
        
    sessions = load_sessions()
    
    session_id = str(uuid.uuid4())
    new_session = {
        'session_id': session_id,
        'tutorial_url': tutorial_url,
        'soundtrack_url': soundtrack_url,
        'tutorial_title': tutorial_title,
        'soundtrack_title': soundtrack_title,
        'tutorial_vol': tutorial_vol,
        'soundtrack_vol': soundtrack_vol,
        'enable_ducking': enable_ducking,
        'thumbnail': thumbnail,
        'timestamp': datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }
    
    sessions.insert(0, new_session)
    save_sessions(sessions)
    
    return jsonify({
        'success': True,
        'session_id': session_id
    })

@app.route('/api/session/list', methods=['GET'])
def route_list_sessions():
    return jsonify(load_sessions())

@app.route('/api/session/delete/<session_id>', methods=['POST'])
def route_delete_session(session_id):
    sessions = load_sessions()
    matched = None
    for item in sessions:
        if item['session_id'] == session_id:
            matched = item
            break
            
    if matched:
        sessions.remove(matched)
        save_sessions(sessions)
        return jsonify({'success': True})
    return jsonify({'error': 'Session not found'}), 404

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
