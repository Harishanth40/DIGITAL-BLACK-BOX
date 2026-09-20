import database
import time
import json

def analyze_incident_reconstruction(incident_id):
    incident = database.get_incident_by_id(incident_id)
    if not incident:
        return None

    history = incident['metrics_snapshot'].get('history', [])
    if not history:
        # Fallback to fetching recent metrics around incident timestamp
        inc_ts = incident['timestamp']
        start_ts = inc_ts - 300
        conn = database.get_db()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM metrics_history 
            WHERE timestamp >= ? AND timestamp <= ?
            ORDER BY timestamp ASC
        ''', (start_ts, inc_ts + 10))
        rows = cursor.fetchall()
        conn.close()
        
        for r in rows:
            history.append({
                'timestamp': r['timestamp'],
                'offset_seconds': round(r['timestamp'] - inc_ts),
                'formatted_time': r['formatted_time'],
                'cpu_percent': r['cpu_percent'],
                'memory_percent': r['memory_percent'],
                'disk_percent': r['disk_percent'],
                'net_sent': r['net_sent'],
                'net_recv': r['net_recv'],
                'processes': json.loads(r['active_processes_json']) if r['active_processes_json'] else []
            })

    # Time machine range: min offset to max offset (or -300 to 0)
    min_time = history[0]['timestamp'] if history else incident['timestamp'] - 300
    max_time = history[-1]['timestamp'] if history else incident['timestamp']

    return {
        'incident': incident,
        'time_range': {
            'min_timestamp': min_time,
            'max_timestamp': max_time,
            'duration_seconds': round(max_time - min_time)
        },
        'telemetry_series': history,
        'timeline': incident['timeline'],
        'relationship_map': incident['relationship_map']
    }

def generate_forensic_report(incident_id):
    reconstruction = analyze_incident_reconstruction(incident_id)
    if not reconstruction:
        return None

    incident = reconstruction['incident']
    history = reconstruction['telemetry_series']
    
    # Calculate CPU/RAM/Net statistics
    cpus = [h['cpu_percent'] for h in history] if history else [0]
    mems = [h['memory_percent'] for h in history] if history else [0]
    nets = [h.get('net_sent', 0) + h.get('net_recv', 0) for h in history] if history else [0]

    stats = {
        'cpu_avg': round(sum(cpus) / len(cpus), 1),
        'cpu_max': max(cpus),
        'mem_avg': round(sum(mems) / len(mems), 1),
        'mem_max': max(mems),
        'net_total_kb': round(sum(nets) / 1024, 1),
        'samples_recorded': len(history)
    }

    report_id = f"RPT-{incident_id.replace('#', '')}-{int(time.time())}"
    generated_at = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime())

    report_payload = {
        'report_id': report_id,
        'black_box_id': "BB-CORE-092",
        'incident_id': incident['id'],
        'incident_title': incident['title'],
        'failure_time': incident['formatted_time'],
        'system_status': "INVESTIGATION COMPLETE",
        'event_count': len(incident['timeline']),
        'telemetry_stats': stats,
        'reconstruction_timeline': incident['timeline'],
        'relationship_map': incident['relationship_map'],
        'disclaimer': "This report contains recorded system events. It does not establish definitive root cause."
    }

    database.save_report(report_id, incident_id, generated_at, report_payload)
    return report_payload
