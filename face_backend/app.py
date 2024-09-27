# app.py

from flask import Flask, jsonify
import subprocess
import json

app = Flask(__name__)

@app.route('/detect_faces', methods=['POST'])
def detect_faces():
    try:
        # Run the facerecog.py script using subprocess
        subprocess.run(['python', 'facerecog.py'], check=True)

        # Read the contents of the attendance.json file
        with open('attendance.json', 'r') as json_file:
            attendance_data = json.load(json_file)

        return jsonify(attendance_data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000)
