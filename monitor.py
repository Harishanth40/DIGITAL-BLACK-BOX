import time
import threading
import random
import psutil
import database

class SystemMonitor:
    def __init__(self, interval=1.0):
        self.interval = interval
        self.running = False
        self.thread = None
        self.start_timestamp = time.time()

    def start(self):
        if self.running:
            return
        self.running = True
        database.init_db()
        # Seed initial system event
        database.record_event("INFO", "SYS.INIT", "MONITOR", "Digital Black Box Flight Recorder initialized and recording system events.")
        
        self.thread = threading.Thread(target=self._run, daemon=True)
        self.thread.start()

    def _run(self):
        last_net = psutil.net_io_counters()
        while self.running:
            try:
                cpu = psutil.cpu_percent(interval=None)
                mem = psutil.virtual_memory().percent
                disk = psutil.disk_usage('/').percent
                
                cur_net = psutil.net_io_counters()
                net_sent = max(0, cur_net.bytes_sent - last_net.bytes_sent)
                net_recv = max(0, cur_net.bytes_recv - last_net.bytes_recv)
                last_net = cur_net

                # Active top processes
                procs = []
                for p in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
                    try:
                        info = p.info
                        if info['name'] and info['cpu_percent'] is not None:
                            procs.append({
                                'pid': info['pid'],
                                'name': info['name'],
                                'cpu': round(info['cpu_percent'], 1),
                                'mem': round(info['memory_percent'] or 0, 1)
                            })
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        continue

                procs = sorted(procs, key=lambda x: x['cpu'], reverse=True)[:5]

                # Record metrics
                database.record_metric(cpu, mem, disk, net_sent, net_recv, procs)

                # Anomaly detection for live logging
                if cpu > 85.0:
                    database.record_event("WARN", "RESOURCE", "CPU", f"CPU load threshold exceeded: {cpu:.1f}%", {"cpu": cpu})
                if mem > 90.0:
                    database.record_event("WARN", "RESOURCE", "MEMORY", f"Memory usage critical: {mem:.1f}%", {"memory": mem})

            except Exception as e:
                database.record_event("CRITICAL", "SYS.FAILURE", "MONITOR", f"Telemetry sampling exception: {str(e)}")

            time.sleep(self.interval)

    def trigger_simulation(self):
        """
        Generates a realistic 5-minute pre-incident window and failure scenario
        without modifying or risking the actual host computer.
        """
        now = time.time()
        incident_id = f"#{random.randint(1000, 9999)}"
        formatted_time = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(now))
        
        # Build 300 seconds (5 mins) of synthetic telemetry history for reconstruction
        pre_metrics = []
        base_cpu = 25.0
        base_mem = 48.0
        base_net = 1200
        
        timeline_events = []
        
        # T-300s to T-0s
        for t_off in range(300, -1, -5):
            t_stamp = now - t_off
            t_fmt = time.strftime('%H:%M:%S', time.localtime(t_stamp))
            
            # Progressively escalate metric anomaly toward failure
            progress = (300 - t_off) / 300.0  # 0.0 to 1.0
            
            if progress < 0.4:
                # Normal operational state
                cpu = min(99.0, max(10.0, base_cpu + random.uniform(-5, 5)))
                mem = min(99.0, max(30.0, base_mem + random.uniform(-2, 2)))
                net = int(base_net + random.uniform(-300, 500))
                proc_name = "chrome.exe"
                proc_cpu = cpu * 0.4
            elif progress < 0.7:
                # Early warning phase
                cpu = min(99.0, max(45.0, 45.0 + (progress - 0.4) * 100))
                mem = min(99.0, max(60.0, 60.0 + (progress - 0.4) * 80))
                net = int(base_net * 4 + random.uniform(0, 5000))
                proc_name = "render_worker.exe"
                proc_cpu = cpu * 0.7
            else:
                # Critical saturation phase
                cpu = min(100.0, 88.0 + (progress - 0.7) * 40.0 + random.uniform(-2, 2))
                mem = min(99.5, 82.0 + (progress - 0.7) * 55.0)
                net = max(0, int(base_net * (1.0 - (progress - 0.7) * 3)))
                proc_name = "render_worker.exe [UNRESPONSIVE]"
                proc_cpu = cpu * 0.95

            sample_procs = [
                {'pid': 4812, 'name': proc_name, 'cpu': round(proc_cpu, 1), 'mem': round(mem * 0.5, 1)},
                {'pid': 1024, 'name': 'system_core.exe', 'cpu': 4.2, 'mem': 3.1},
                {'pid': 2108, 'name': 'network_daemon.exe', 'cpu': 2.1, 'mem': 1.8},
                {'pid': 3310, 'name': 'blackbox_agent.exe', 'cpu': 1.5, 'mem': 2.4}
            ]
            
            pre_metrics.append({
                'timestamp': t_stamp,
                'offset_seconds': -t_off,
                'formatted_time': t_fmt,
                'cpu_percent': round(cpu, 1),
                'memory_percent': round(mem, 1),
                'disk_percent': 42.5,
                'net_sent': net,
                'net_recv': int(net * 1.5),
                'processes': sample_procs
            })
            
            # Record telemetry in DB
            database.record_metric(round(cpu, 1), round(mem, 1), 42.5, net, int(net * 1.5), sample_procs)

        # Generate Timeline Events
        t_start_fmt = time.strftime('%H:%M:%S', time.localtime(now - 300))
        t_1_fmt = time.strftime('%H:%M:%S', time.localtime(now - 210))
        t_2_fmt = time.strftime('%H:%M:%S', time.localtime(now - 140))
        t_3_fmt = time.strftime('%H:%M:%S', time.localtime(now - 75))
        t_4_fmt = time.strftime('%H:%M:%S', time.localtime(now - 35))
        t_5_fmt = time.strftime('%H:%M:%S', time.localtime(now - 15))
        t_fail_fmt = time.strftime('%H:%M:%S', time.localtime(now))

        timeline_events = [
            {'timestamp': t_start_fmt, 'offset': -300, 'category': 'APPLICATION', 'event': 'Render Worker Process Initialized (PID: 4812)', 'severity': 'INFO'},
            {'timestamp': t_1_fmt, 'offset': -210, 'category': 'RESOURCE', 'event': 'Memory Leak Detected: Heap ↑ 72%', 'severity': 'WARN'},
            {'timestamp': t_2_fmt, 'offset': -140, 'category': 'RESOURCE', 'event': 'Memory Saturation Threshold Reached ↑ 88%', 'severity': 'WARN'},
            {'timestamp': t_3_fmt, 'offset': -75, 'category': 'NETWORK', 'event': 'Socket Connection Timeout / Packet Loss Detected', 'severity': 'WARN'},
            {'timestamp': t_4_fmt, 'offset': -35, 'category': 'RESOURCE', 'event': 'CPU Thermal/Throttling Spike ↑ 96%', 'severity': 'CRITICAL'},
            {'timestamp': t_5_fmt, 'offset': -15, 'category': 'APPLICATION', 'event': 'Process PID 4812 Unresponsive / Thread Deadlock', 'severity': 'CRITICAL'},
            {'timestamp': t_fail_fmt, 'offset': 0, 'category': 'SYS.FAILURE', 'event': 'APPLICATION FAILURE: System Event Recorder Captured Core Dump', 'severity': 'CRITICAL'}
        ]

        # Record events to live log stream
        for ev in timeline_events:
            database.record_event(ev['severity'], ev['category'], "SIMULATION", f"[SIMULATION] {ev['event']}")

        # Event Relationship Map (Observed co-occurring events near failure)
        relationship_map = {
            "title": "OBSERVED EVENT RELATIONSHIP GRAPH",
            "disclaimer": "Events observed near failure window. Does not establish definitive root cause.",
            "nodes": [
                {"id": "n1", "label": "MEMORY LEAK", "category": "RESOURCE", "severity": "WARN"},
                {"id": "n2", "label": "NETWORK TIMEOUT", "category": "NETWORK", "severity": "WARN"},
                {"id": "n3", "label": "HIGH CPU SATURATION", "category": "RESOURCE", "severity": "CRITICAL"},
                {"id": "n4", "label": "THREAD DEADLOCK", "category": "APPLICATION", "severity": "CRITICAL"},
                {"id": "n5", "label": "APPLICATION FAILURE", "category": "SYS.FAILURE", "severity": "CRITICAL"}
            ],
            "links": [
                {"source": "n1", "target": "n3", "label": "Triggered Swapping"},
                {"source": "n2", "target": "n4", "label": "Blocking I/O"},
                {"source": "n3", "target": "n4", "label": "CPU Starvation"},
                {"source": "n4", "target": "n5", "label": "Process Termination"}
            ]
        }

        incident_data = {
            "id": incident_id,
            "timestamp": now,
            "formatted_time": formatted_time,
            "title": "SIMULATED APPLICATION FAILURE (#0042 RECONSTRUCTION)",
            "severity": "CRITICAL",
            "category": "SYS.FAILURE",
            "summary": "Simulated thread deadlock and resource saturation leading to application process crash.",
            "metrics_snapshot": {
                "cpu_peak": 98.4,
                "memory_peak": 94.2,
                "duration_seconds": 300,
                "history": pre_metrics
            },
            "timeline": timeline_events,
            "relationship_map": relationship_map
        }

        database.save_incident(incident_data)
        return incident_data

global_monitor = SystemMonitor()
