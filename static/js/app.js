/* ==========================================================================
   DIGITAL BLACK BOX - MASTER APPLICATION CONTROLLER & CLIENT FALLBACK ENGINE
   ========================================================================== */

const App = {
    activeTab: 'core',
    pollInterval: null,
    currentIncidentId: null,
    localEvents: [],
    localIncidents: [],
    startTime: Date.now(),

    init() {
        // Initialize child modules
        CoreVisualizer.init();
        PulseEngine.init();
        StreamEngine.init();
        RelationshipMap.init();
        ReconstructionEngine.init();

        this.setupNavigation();
        this.setupButtons();

        // Initial fetch & fallback setup
        this.fetchStatus();
        this.fetchIncidents();

        // Continuous telemetry polling loop (1000ms)
        this.pollInterval = setInterval(() => {
            this.fetchStatus();
            if (this.activeTab === 'stream') {
                this.fetchStream();
            }
        }, 1000);
    },

    setupNavigation() {
        const navBtns = document.querySelectorAll('.nav-btn');
        navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabTarget = btn.getAttribute('data-tab');
                this.switchTab(tabTarget);
            });
        });
    },

    switchTab(tabName) {
        this.activeTab = tabName;

        document.querySelectorAll('.nav-btn').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-tab') === tabName);
        });

        document.querySelectorAll('.tab-content').forEach(c => {
            c.classList.toggle('active', c.id === `tab-${tabName}`);
        });

        if (tabName === 'stream') {
            this.fetchStream();
        } else if (tabName === 'incidents') {
            this.fetchIncidentsArchive();
        }
    },

    setupButtons() {
        const simBtn = document.getElementById('btn-run-simulation');
        if (simBtn) {
            simBtn.addEventListener('click', () => {
                this.runSimulation();
            });
        }

        const genReportBtn = document.getElementById('btn-generate-report');
        if (genReportBtn) {
            genReportBtn.addEventListener('click', () => {
                if (this.currentIncidentId) {
                    this.generateReport(this.currentIncidentId);
                }
            });
        }

        const closeReportBtn = document.getElementById('btn-close-report');
        if (closeReportBtn) {
            closeReportBtn.addEventListener('click', () => {
                document.getElementById('report-modal').style.display = 'none';
            });
        }

        const printReportBtn = document.getElementById('btn-print-report');
        if (printReportBtn) {
            printReportBtn.addEventListener('click', () => {
                window.print();
            });
        }
    },

    async fetchStatus() {
        try {
            const res = await fetch('/api/status');
            if (!res.ok) throw new Error('API offline');
            const data = await res.json();
            CoreVisualizer.update(data);
            if (data.current_metrics) {
                PulseEngine.pushSample(data.current_metrics.cpu_percent || 0);
            }
        } catch (err) {
            // Client-side Fallback for Static Host / GitHub Pages
            this.updateClientFallbackStatus();
        }
    },

    updateClientFallbackStatus() {
        const durationSec = Math.floor((Date.now() - this.startTime) / 1000);
        const h = String(Math.floor(durationSec / 3600)).padStart(2, '0');
        const m = String(Math.floor((durationSec % 3600) / 60)).padStart(2, '0');
        const s = String(durationSec % 60).padStart(2, '0');

        // Generate synthetic pulse metrics
        const cpu = Math.min(99, Math.max(12, 35 + Math.sin(Date.now() / 2000) * 20 + Math.random() * 8));
        const mem = Math.min(95, Math.max(40, 62 + Math.cos(Date.now() / 5000) * 10));
        const disk = 42.5;

        PulseEngine.pushSample(cpu);

        const statusData = {
            status: 'ONLINE',
            recording_active: true,
            uptime_seconds: durationSec,
            recording_duration: `${h}:${m}:${s}`,
            total_events: Math.max(12, this.localEvents.length + Math.floor(durationSec * 1.2)),
            total_incidents: this.localIncidents.length,
            current_metrics: {
                cpu_percent: cpu,
                memory_percent: mem,
                disk_percent: disk,
                net_sent: Math.floor(1200 + Math.random() * 800),
                net_recv: Math.floor(2400 + Math.random() * 1200)
            },
            last_incident: this.localIncidents.length > 0 ? this.localIncidents[0] : null
        };

        CoreVisualizer.update(statusData);
    },

    async fetchStream() {
        try {
            const cat = StreamEngine.filterCategory;
            const res = await fetch(`/api/stream?limit=100&category=${cat}`);
            if (!res.ok) throw new Error('API offline');
            const data = await res.json();
            StreamEngine.renderEvents(data.events || []);
        } catch (err) {
            // Client fallback stream
            if (this.localEvents.length === 0) {
                const now = new Date();
                this.localEvents = [
                    { id: 1, formatted_time: now.toLocaleTimeString() + '.102', severity: 'INFO', category: 'SYS.INIT', message: 'Digital Black Box Flight Recorder initialized and recording.' },
                    { id: 2, formatted_time: now.toLocaleTimeString() + '.451', severity: 'INFO', category: 'APPLICATION', message: 'Core telemetry dispatcher process started.' },
                    { id: 3, formatted_time: now.toLocaleTimeString() + '.892', severity: 'WARN', category: 'RESOURCE', message: 'System memory footprint optimal at 61%.' }
                ];
            }
            StreamEngine.renderEvents(this.localEvents);
        }
    },

    async fetchIncidents() {
        try {
            const res = await fetch('/api/incidents');
            if (!res.ok) throw new Error('API offline');
            const data = await res.json();
            CoreVisualizer.updateIncidentsList(data.incidents || []);
        } catch (err) {
            CoreVisualizer.updateIncidentsList(this.localIncidents);
        }
    },

    async fetchIncidentsArchive() {
        try {
            const res = await fetch('/api/incidents');
            if (!res.ok) throw new Error('API offline');
            const data = await res.json();
            this.renderIncidentsGrid(data.incidents || []);
        } catch (err) {
            this.renderIncidentsGrid(this.localIncidents);
        }
    },

    renderIncidentsGrid(incidents) {
        const grid = document.getElementById('incidents-archive-grid');
        if (!grid) return;

        if (!incidents || incidents.length === 0) {
            grid.innerHTML = '<div class="empty-state-text">No recorded failure incidents in logbook. Click "[ RUN SIMULATED INCIDENT ]" above.</div>';
            return;
        }

        let html = '';
        incidents.forEach(inc => {
            html += `
                <div class="incident-card-sm" style="background:#11161d; padding:1.25rem;">
                    <div class="inc-card-head">
                        <span class="inc-card-id">${inc.id}</span>
                        <span class="inc-card-time">${inc.formatted_time}</span>
                    </div>
                    <div class="inc-card-title" style="margin:0.5rem 0;">${inc.title}</div>
                    <div style="font-family:var(--font-mono); font-size:0.75rem; color:var(--text-muted);">${inc.summary}</div>
                    <button class="btn-investigate" style="margin-top:1rem;" onclick="App.openIncident('${inc.id}')">
                        [ RECONSTRUCT INCIDENT ]
                    </button>
                </div>
            `;
        });
        grid.innerHTML = html;
    },

    async openIncident(incidentId) {
        try {
            const res = await fetch(`/api/reconstruct/${encodeURIComponent(incidentId)}`);
            if (!res.ok) throw new Error('API offline');
            const data = await res.json();
            this.currentIncidentId = incidentId;
            ReconstructionEngine.loadIncident(data);
            this.switchTab('reconstruction');
        } catch (err) {
            // Find in localIncidents fallback
            const inc = this.localIncidents.find(i => i.id === incidentId);
            if (inc) {
                this.currentIncidentId = incidentId;
                const payload = {
                    incident: inc,
                    telemetry_series: inc.metrics_snapshot.history,
                    timeline: inc.timeline,
                    relationship_map: inc.relationship_map
                };
                ReconstructionEngine.loadIncident(payload);
                this.switchTab('reconstruction');
            }
        }
    },

    async runSimulation() {
        const simBtn = document.getElementById('btn-run-simulation');
        if (simBtn) simBtn.innerText = '⚡ [ EXECUTING SIMULATION... ]';

        try {
            const res = await fetch('/api/simulate', { method: 'POST' });
            if (!res.ok) throw new Error('API offline');
            const data = await res.json();
            if (simBtn) simBtn.innerText = '⚡ [ RUN SIMULATED INCIDENT ]';
            if (data.incident) {
                this.fetchIncidents();
                this.openIncident(data.incident.id);
            }
        } catch (err) {
            // Perform Client-side Simulation Generator for GitHub Pages
            setTimeout(() => {
                if (simBtn) simBtn.innerText = '⚡ [ RUN SIMULATED INCIDENT ]';
                const inc = this.generateClientSimulationPayload();
                this.localIncidents.unshift(inc);
                this.fetchIncidents();
                this.openIncident(inc.id);
            }, 500);
        }
    },

    generateClientSimulationPayload() {
        const now = Date.now();
        const incId = `#${Math.floor(1000 + Math.random() * 9000)}`;
        const dateStr = new Date(now).toLocaleString();

        const preMetrics = [];
        for (let tOff = 300; tOff >= 0; tOff -= 5) {
            const tStamp = now - (tOff * 1000);
            const tFmt = new Date(tStamp).toLocaleTimeString();
            const prog = (300 - tOff) / 300.0;

            let cpu, mem, net, procName;
            if (prog < 0.4) {
                cpu = 20 + Math.random() * 10;
                mem = 48 + Math.random() * 5;
                net = 1200;
                procName = "chrome.exe";
            } else if (prog < 0.7) {
                cpu = 45 + (prog - 0.4) * 100;
                mem = 60 + (prog - 0.4) * 80;
                net = 5400;
                procName = "render_worker.exe";
            } else {
                cpu = Math.min(100, 88 + (prog - 0.7) * 40);
                mem = Math.min(99.5, 82 + (prog - 0.7) * 55);
                net = Math.max(0, 1200 * (1.0 - (prog - 0.7) * 3));
                procName = "render_worker.exe [DEADLOCK]";
            }

            preMetrics.append ? preMetrics.append() : preMetrics.push({
                timestamp: tStamp / 1000,
                offset_seconds: -tOff,
                formatted_time: tFmt,
                cpu_percent: Math.round(cpu * 10) / 10,
                memory_percent: Math.round(mem * 10) / 10,
                disk_percent: 42.5,
                net_sent: Math.floor(net),
                net_recv: Math.floor(net * 1.5),
                processes: [
                    { pid: 4812, name: procName, cpu: Math.round(cpu * 0.9 * 10) / 10, mem: Math.round(mem * 0.5 * 10) / 10 },
                    { pid: 1024, name: 'system_core.exe', cpu: 4.2, mem: 3.1 },
                    { pid: 2108, name: 'network_daemon.exe', cpu: 2.1, mem: 1.8 }
                ]
            });
        }

        const timelineEvents = [
            { timestamp: new Date(now - 300000).toLocaleTimeString(), offset: -300, category: 'APPLICATION', event: 'Render Worker Process Initialized (PID: 4812)', severity: 'INFO' },
            { timestamp: new Date(now - 210000).toLocaleTimeString(), offset: -210, category: 'RESOURCE', event: 'Memory Leak Detected: Heap ↑ 72%', severity: 'WARN' },
            { timestamp: new Date(now - 140000).toLocaleTimeString(), offset: -140, category: 'RESOURCE', event: 'Memory Saturation Threshold Reached ↑ 88%', severity: 'WARN' },
            { timestamp: new Date(now - 75000).toLocaleTimeString(), offset: -75, category: 'NETWORK', event: 'Socket Connection Timeout / Packet Loss Detected', severity: 'WARN' },
            { timestamp: new Date(now - 35000).toLocaleTimeString(), offset: -35, category: 'RESOURCE', event: 'CPU Thermal/Throttling Spike ↑ 96%', severity: 'CRITICAL' },
            { timestamp: new Date(now - 15000).toLocaleTimeString(), offset: -15, category: 'APPLICATION', event: 'Process PID 4812 Unresponsive / Thread Deadlock', severity: 'CRITICAL' },
            { timestamp: new Date(now).toLocaleTimeString(), offset: 0, category: 'SYS.FAILURE', event: 'APPLICATION FAILURE: Flight Recorder Captured Core Dump', severity: 'CRITICAL' }
        ];

        const relMap = {
            title: "OBSERVED EVENT RELATIONSHIP GRAPH",
            disclaimer: "Events observed near failure window. Does not establish definitive root cause.",
            nodes: [
                { id: "n1", label: "MEMORY LEAK", category: "RESOURCE", severity: "WARN" },
                { id: "n2", label: "NETWORK TIMEOUT", category: "NETWORK", severity: "WARN" },
                { id: "n3", label: "HIGH CPU SATURATION", category: "RESOURCE", severity: "CRITICAL" },
                { id: "n4", label: "THREAD DEADLOCK", category: "APPLICATION", severity: "CRITICAL" },
                { id: "n5", label: "APPLICATION FAILURE", category: "SYS.FAILURE", severity: "CRITICAL" }
            ],
            links: [
                { source: "n1", target: "n3", label: "Triggered Swapping" },
                { source: "n2", target: "n4", label: "Blocking I/O" },
                { source: "n3", target: "n4", label: "CPU Starvation" },
                { source: "n4", target: "n5", label: "Process Termination" }
            ]
        };

        return {
            id: incId,
            timestamp: now / 1000,
            formatted_time: dateStr,
            title: `SIMULATED APPLICATION FAILURE (${incId} RECONSTRUCTION)`,
            severity: 'CRITICAL',
            category: 'SYS.FAILURE',
            summary: 'Simulated thread deadlock and resource saturation leading to application process crash.',
            metrics_snapshot: {
                cpu_peak: 98.4,
                memory_peak: 94.2,
                duration_seconds: 300,
                history: preMetrics
            },
            timeline: timelineEvents,
            relationship_map: relMap
        };
    },

    async generateReport(incidentId) {
        let rpt = null;
        try {
            const res = await fetch(`/api/report/${encodeURIComponent(incidentId)}`);
            if (!res.ok) throw new Error('API offline');
            rpt = await res.json();
        } catch (err) {
            const inc = this.localIncidents.find(i => i.id === incidentId);
            if (inc) {
                rpt = {
                    report_id: `RPT-${incidentId.replace('#', '')}-${Math.floor(Date.now() / 1000)}`,
                    black_box_id: "BB-CORE-092",
                    incident_id: inc.id,
                    incident_title: inc.title,
                    failure_time: inc.formatted_time,
                    system_status: "INVESTIGATION COMPLETE",
                    event_count: inc.timeline.length,
                    telemetry_stats: { cpu_avg: 68.4, cpu_max: 99.8, mem_avg: 74.2, mem_max: 98.5, net_total_kb: 4820, samples_recorded: 61 },
                    reconstruction_timeline: inc.timeline,
                    relationship_map: inc.relationship_map,
                    disclaimer: "This report contains recorded system events. It does not establish definitive root cause."
                };
            }
        }

        if (rpt) {
            const docBody = document.getElementById('report-document-body');
            if (!docBody) return;

            let html = `
                <div class="report-header-banner">
                    <h1>DIGITAL BLACK BOX // FORENSIC INVESTIGATION REPORT</h1>
                    <div style="color:var(--text-secondary); font-size:0.8rem; margin-top:0.3rem;">
                        CONFIDENTIAL FLIGHT RECORDER & SYSTEM FAILURE RECONSTRUCTION AUDIT
                    </div>
                </div>

                <table class="report-meta-table">
                    <tr>
                        <td><strong>REPORT ID:</strong> ${rpt.report_id}</td>
                        <td><strong>BLACK BOX ID:</strong> ${rpt.black_box_id}</td>
                    </tr>
                    <tr>
                        <td><strong>INCIDENT ID:</strong> ${rpt.incident_id}</td>
                        <td><strong>FAILURE TIMESTAMP:</strong> ${rpt.failure_time}</td>
                    </tr>
                    <tr>
                        <td><strong>INCIDENT TITLE:</strong> ${rpt.incident_title}</td>
                        <td><strong>SYSTEM STATUS:</strong> ${rpt.system_status}</td>
                    </tr>
                </table>

                <div class="report-section-title">// TELEMETRY AUDIT SUMMARY</div>
                <div style="font-size:0.82rem; color:var(--text-primary); margin-bottom:1rem;">
                    Average CPU Load: <strong>${rpt.telemetry_stats.cpu_avg}%</strong> (Peak: ${rpt.telemetry_stats.cpu_max}%)<br>
                    Average Memory Usage: <strong>${rpt.telemetry_stats.mem_avg}%</strong> (Peak: ${rpt.telemetry_stats.mem_max}%)<br>
                    Network Traffic Recorded: <strong>${rpt.telemetry_stats.net_total_kb} KB</strong> across ${rpt.telemetry_stats.samples_recorded} telemetry samples.
                </div>

                <div class="report-section-title">// 5-MINUTE RECONSTRUCTION TIMELINE</div>
                <table class="proc-table" style="margin-bottom:1.5rem;">
                    <thead>
                        <tr>
                            <th>TIME</th>
                            <th>OFFSET</th>
                            <th>CATEGORY</th>
                            <th>OBSERVED EVENT</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            rpt.reconstruction_timeline.forEach(ev => {
                html += `
                    <tr>
                        <td>${ev.timestamp}</td>
                        <td>T${ev.offset}s</td>
                        <td>${ev.category}</td>
                        <td style="color:${ev.severity === 'CRITICAL' ? 'var(--accent-red)' : 'var(--text-primary)'}">${ev.event}</td>
                    </tr>
                `;
            });

            html += `
                    </tbody>
                </table>

                <div class="report-disclaimer-box">
                    "${rpt.disclaimer}"
                </div>
            `;

            docBody.innerHTML = html;
            document.getElementById('report-modal').style.display = 'flex';
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
