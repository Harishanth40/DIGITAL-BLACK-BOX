from flask import Flask, render_template, jsonify, request
from monitor import global_monitor
import database
import analyzer
import time
import os

app = Flask(__name__)

# Start background flight recorder monitoring thread
global_monitor.start()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/status', methods=['GET'])
def get_status():
    stats = database.get_stats()
    recent = database.get_recent_metrics(limit=1)
    current_metrics = recent[0] if recent else {
        'cpu_percent': 0, 'memory_percent': 0, 'disk_percent': 0,
        'net_sent': 0, 'net_recv': 0, 'processes': []
    }
    
    incidents = database.get_all_incidents()
    last_incident = incidents[0] if incidents else None

    duration = int(time.time() - global_monitor.start_timestamp)
    h, r = divmod(duration, 3600)
    m, s = divmod(r, 60)
    recording_duration_str = f"{h:02d}:{m:02d}:{s:02d}"

    return jsonify({
        'status': 'ONLINE',
        'recording_active': True,
        'uptime_seconds': stats['uptime_seconds'],
        'recording_duration': recording_duration_str,
        'total_events': stats['total_events'],
        'total_incidents': stats['total_incidents'],
        'current_metrics': current_metrics,
        'last_incident': last_incident
    })

@app.route('/api/stream', methods=['GET'])
def get_stream():
    limit = request.args.get('limit', default=100, type=int)
    category = request.args.get('category', default='ALL', type=str)
    events = database.get_events_stream(limit=limit, category_filter=category)
    return jsonify({'events': events})

@app.route('/api/pulse', methods=['GET'])
def get_pulse():
    metrics = database.get_recent_metrics(limit=40)
    return jsonify({'metrics': metrics})

@app.route('/api/incidents', methods=['GET'])
def get_incidents():
    incidents = database.get_all_incidents()
    return jsonify({'incidents': incidents})

@app.route('/api/incidents/<path:incident_id>', methods=['GET'])
def get_incident(incident_id):
    inc = database.get_incident_by_id(incident_id)
    if not inc:
        return jsonify({'error': 'Incident not found'}), 404
    return jsonify({'incident': inc})

@app.route('/api/reconstruct/<path:incident_id>', methods=['GET'])
def reconstruct(incident_id):
    payload = analyzer.analyze_incident_reconstruction(incident_id)
    if not payload:
        return jsonify({'error': 'Incident reconstruction failed or not found'}), 404
    return jsonify(payload)

@app.route('/api/simulate', methods=['POST'])
def run_simulation():
    incident = global_monitor.trigger_simulation()
    return jsonify({
        'message': 'Simulated failure successfully executed.',
        'simulation_mode': True,
        'incident': incident
    })

@app.route('/api/report/<path:incident_id>', methods=['GET', 'POST'])
def report(incident_id):
    rpt = analyzer.generate_forensic_report(incident_id)
    if not rpt:
        return jsonify({'error': 'Failed to generate report'}), 404
    return jsonify(rpt)

if __name__ == '__main__':
    print("==================================================")
    print(" DIGITAL BLACK BOX FORENSIC INVESTIGATION SYSTEM ")
    print(" Server active on http://127.0.0.1:5000 ")
    print("==================================================")
    app.run(host='0.0.0.0', port=5000, debug=True)
