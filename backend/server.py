from flask import Flask, request, jsonify
import requests

app = Flask(__name__)

@app.route('/fetch_ical', methods=['GET'])
def fetch_ical():
    ical_url = request.args.get('ical_url')
    
    if not ical_url:
        return jsonify({'error': 'No iCal URL provided'}), 400
    
    try:
        response = requests.get(ical_url)
        response.raise_for_status()  # Raises an error for bad responses (4xx and 5xx)
        return response.text
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Failed to fetch iCal: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
