import sqlite3
import os
import json
import time

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'blackbox.db')

def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=10.0)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # Telemetry history table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS metrics_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp REAL NOT NULL,
            formatted_time TEXT NOT NULL,
            cpu_percent REAL NOT NULL,
            memory_percent REAL NOT NULL,
            disk_percent REAL NOT NULL,
            net_sent INTEGER NOT NULL,
            net_recv INTEGER NOT NULL,
            active_processes_json TEXT NOT NULL
        )
    ''')
    
    # System events log table (Flight recorder stream)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS events_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp REAL NOT NULL,
            formatted_time TEXT NOT NULL,
            severity TEXT NOT NULL, -- INFO, WARN, CRITICAL
            category TEXT NOT NULL, -- SYS.FAILURE, RESOURCE, NETWORK, APPLICATION, SECURITY
            source TEXT NOT NULL,
            message TEXT NOT NULL,
            details_json TEXT
        )
    ''')
    
    # Recorded Incidents table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS incidents (
            id TEXT PRIMARY KEY,
            timestamp REAL NOT NULL,
            formatted_time TEXT NOT NULL,
            title TEXT NOT NULL,
            severity TEXT NOT NULL,
            category TEXT NOT NULL,
            summary TEXT NOT NULL,
            metrics_snapshot_json TEXT NOT NULL,
            timeline_json TEXT NOT NULL,
            relationship_map_json TEXT NOT NULL
        )
    ''')
    
    # Forensic Reports table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS forensic_reports (
            report_id TEXT PRIMARY KEY,
            incident_id TEXT NOT NULL,
            generated_at TEXT NOT NULL,
            report_json TEXT NOT NULL,
            FOREIGN KEY (incident_id) REFERENCES incidents (id)
        )
    ''')
    
    conn.commit()
    conn.close()

def record_metric(cpu, memory, disk, net_sent, net_recv, processes):
    now = time.time()
    formatted = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(now))
    proc_json = json.dumps(processes)
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO metrics_history (timestamp, formatted_time, cpu_percent, memory_percent, disk_percent, net_sent, net_recv, active_processes_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (now, formatted, cpu, memory, disk, net_sent, net_recv, proc_json))
    
    # Clean up metrics older than 24 hours to keep db light
    cutoff = now - (24 * 3600)
    cursor.execute('DELETE FROM metrics_history WHERE timestamp < ?', (cutoff,))
    
    conn.commit()
    conn.close()

def record_event(severity, category, source, message, details=None):
    now = time.time()
    formatted_ms = time.strftime('%H:%M:%S', time.localtime(now)) + f".{int((now % 1) * 1000):03d}"
    details_json = json.dumps(details or {})
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO events_log (timestamp, formatted_time, severity, category, source, message, details_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (now, formatted_ms, severity, category, source, message, details_json))
    
    conn.commit()
    conn.close()

def get_recent_metrics(limit=60):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT * FROM metrics_history ORDER BY id DESC LIMIT ?
    ''', (limit,))
    rows = cursor.fetchall()
    conn.close()
    
    res = []
    for r in reversed(rows):
        res.append({
            'id': r['id'],
            'timestamp': r['timestamp'],
            'formatted_time': r['formatted_time'],
            'cpu_percent': r['cpu_percent'],
            'memory_percent': r['memory_percent'],
            'disk_percent': r['disk_percent'],
            'net_sent': r['net_sent'],
            'net_recv': r['net_recv'],
            'processes': json.loads(r['active_processes_json']) if r['active_processes_json'] else []
        })
    return res

def get_events_stream(limit=100, category_filter=None):
    conn = get_db()
    cursor = conn.cursor()
    if category_filter and category_filter != 'ALL':
        cursor.execute('''
            SELECT * FROM events_log WHERE category = ? ORDER BY id DESC LIMIT ?
        ''', (category_filter, limit))
    else:
        cursor.execute('''
            SELECT * FROM events_log ORDER BY id DESC LIMIT ?
        ''', (limit,))
    rows = cursor.fetchall()
    conn.close()
    
    events = []
    for r in rows:
        events.append({
            'id': r['id'],
            'timestamp': r['timestamp'],
            'formatted_time': r['formatted_time'],
            'severity': r['severity'],
            'category': r['category'],
            'source': r['source'],
            'message': r['message'],
            'details': json.loads(r['details_json']) if r['details_json'] else {}
        })
    return events

def save_incident(incident_data):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT OR REPLACE INTO incidents (id, timestamp, formatted_time, title, severity, category, summary, metrics_snapshot_json, timeline_json, relationship_map_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        incident_data['id'],
        incident_data['timestamp'],
        incident_data['formatted_time'],
        incident_data['title'],
        incident_data['severity'],
        incident_data['category'],
        incident_data['summary'],
        json.dumps(incident_data['metrics_snapshot']),
        json.dumps(incident_data['timeline']),
        json.dumps(incident_data['relationship_map'])
    ))
    conn.commit()
    conn.close()

def get_all_incidents():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM incidents ORDER BY timestamp DESC')
    rows = cursor.fetchall()
    conn.close()
    
    incidents = []
    for r in rows:
        incidents.append({
            'id': r['id'],
            'timestamp': r['timestamp'],
            'formatted_time': r['formatted_time'],
            'title': r['title'],
            'severity': r['severity'],
            'category': r['category'],
            'summary': r['summary'],
            'metrics_snapshot': json.loads(r['metrics_snapshot_json']),
            'timeline': json.loads(r['timeline_json']),
            'relationship_map': json.loads(r['relationship_map_json'])
        })
    return incidents

def get_incident_by_id(incident_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM incidents WHERE id = ?', (incident_id,))
    r = cursor.fetchone()
    conn.close()
    
    if not r:
        return None
        
    return {
        'id': r['id'],
        'timestamp': r['timestamp'],
        'formatted_time': r['formatted_time'],
        'title': r['title'],
        'severity': r['severity'],
        'category': r['category'],
        'summary': r['summary'],
        'metrics_snapshot': json.loads(r['metrics_snapshot_json']),
        'timeline': json.loads(r['timeline_json']),
        'relationship_map': json.loads(r['relationship_map_json'])
    }

def save_report(report_id, incident_id, generated_at, report_data):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT OR REPLACE INTO forensic_reports (report_id, incident_id, generated_at, report_json)
        VALUES (?, ?, ?, ?)
    ''', (report_id, incident_id, generated_at, json.dumps(report_data)))
    conn.commit()
    conn.close()

def get_report_by_incident_id(incident_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM forensic_reports WHERE incident_id = ? ORDER BY generated_at DESC LIMIT 1', (incident_id,))
    r = cursor.fetchone()
    conn.close()
    
    if not r:
        return None
        
    return {
        'report_id': r['report_id'],
        'incident_id': r['incident_id'],
        'generated_at': r['generated_at'],
        'data': json.loads(r['report_json'])
    }

def get_stats():
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('SELECT COUNT(*) FROM events_log')
    total_events = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM incidents')
    total_incidents = cursor.fetchone()[0]
    
    cursor.execute('SELECT MIN(timestamp) FROM metrics_history')
    first_metric = cursor.fetchone()[0]
    
    conn.close()
    
    start_time = first_metric if first_metric else time.time()
    uptime_seconds = int(time.time() - start_time)
    
    return {
        'total_events': total_events,
        'total_incidents': total_incidents,
        'uptime_seconds': uptime_seconds
    }

if __name__ == '__main__':
    init_db()
    print("Database initialized successfully.")
