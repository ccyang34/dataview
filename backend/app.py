
from flask import Flask, jsonify
from data_engine import DataEngine
from dotenv import load_dotenv
import os

# Load env from parent directory if needed, or current
load_dotenv()

app = Flask(__name__)

@app.route('/')
def home():
    return jsonify({"status": "online", "service": "DataView Backend"})

@app.route('/refresh', methods=['POST', 'GET'])
def refresh_data():
    try:
        engine = DataEngine()
        result = engine.sync_data()
        return jsonify(result)
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
