/* ==========================================================================
   DIGITAL BLACK BOX - MASTER APPLICATION CONTROLLER
   ========================================================================== */

const App = {
    activeTab: 'core',
    pollInterval: null,
    currentIncidentId: null,

    init() {
        // Initialize child modules
        CoreVisualizer.init();
        PulseEngine.init();
        StreamEngine.init();
        RelationshipMap.init();
        ReconstructionEngine.init();

        // Setup top console navigation
        this.setupNavigation();

        // Setup action buttons
        this.setupButtons();

        // Initial Data Fetch
        this.fetchStatus();
        this.fetchIncidents();

        // Continuous telemetry polling (1000ms)
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

        // Update nav active styling
        document.querySelectorAll('.nav-btn').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-tab') === tabName);
        });

        // Update tab content visibility
        document.querySelectorAll('.tab-content').forEach(c => {
            c.classList.toggle('active', c.id === `tab-${tabName}`);
        });

        // Tab specific actions
        if (tabName === 'stream') {
            this.fetchStream();
        } else if (tabName === 'incidents') {
            this.fetchIncidentsArchive();
        }
    },

    setupButtons() {
        // Run Simulated Incident
        const simBtn = document.getElementById('btn-run-simulation');
        if (simBtn) {
            simBtn.addEventListener('click', () => {
                this.runSimulation();
            });
        }

        // Generate Report Button
        const genReportBtn = document.getElementById('btn-generate-report');
        if (genReportBtn) {
            genReportBtn.addEventListener('click', () => {
                if (this.currentIncidentId) {
                    this.generateReport(this.currentIncidentId);
                }
            });
        }

        // Report Modal Close & Print
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
            const data = await res.json();
            
            CoreVisualizer.update(data);
            
            if (data.current_metrics) {
                PulseEngine.pushSample(data.current_metrics.cpu_percent || 0);
            }
        } catch (err) {
            console.error('Error fetching system status:', err);
        }
    },

    async fetchStream() {
        try {
            const cat = StreamEngine.filterCategory;
            const res = await fetch(`/api/stream?limit=100&category=${cat}`);
            const data = await res.json();
            StreamEngine.renderEvents(data.events || []);
        } catch (err) {
            console.error('Error fetching event stream:', err);
        }
    },

    async fetchIncidents() {
        try {
            const res = await fetch('/api/incidents');
            const data = await res.json();
            CoreVisualizer.updateIncidentsList(data.incidents || []);
        } catch (err) {
            console.error('Error fetching incidents:', err);
        }
    },

    async fetchIncidentsArchive() {
        try {
            const res = await fetch('/api/incidents');
            const data = await res.json();
            const grid = document.getElementById('incidents-archive-grid');
            if (!grid) return;

            if (!data.incidents || data.incidents.length === 0) {
                grid.innerHTML = '<div class="empty-state-text">No recorded failure incidents in database.</div>';
                return;
            }

            let html = '';
            data.incidents.forEach(inc => {
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
        } catch (err) {
            console.error('Error fetching incidents archive:', err);
        }
    },

    async openIncident(incidentId) {
        try {
            const res = await fetch(`/api/reconstruct/${encodeURIComponent(incidentId)}`);
            if (!res.ok) {
                alert('Incident reconstruction payload not found.');
                return;
            }
            const data = await res.json();
            this.currentIncidentId = incidentId;
            ReconstructionEngine.loadIncident(data);
            this.switchTab('reconstruction');
        } catch (err) {
            console.error('Error loading incident reconstruction:', err);
        }
    },

    async runSimulation() {
        try {
            const simBtn = document.getElementById('btn-run-simulation');
            if (simBtn) simBtn.innerText = '⚡ [ EXECUTING SIMULATION... ]';

            const res = await fetch('/api/simulate', { method: 'POST' });
            const data = await res.json();

            if (simBtn) simBtn.innerText = '⚡ [ RUN SIMULATED INCIDENT ]';

            if (data.incident) {
                this.fetchIncidents();
                this.openIncident(data.incident.id);
            }
        } catch (err) {
            console.error('Error triggering simulation:', err);
            alert('Failed to trigger simulation.');
        }
    },

    async generateReport(incidentId) {
        try {
            const res = await fetch(`/api/report/${encodeURIComponent(incidentId)}`);
            const rpt = await res.json();
            
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
                    "This report contains recorded system events. It does not establish definitive root cause."
                </div>
            `;

            docBody.innerHTML = html;
            document.getElementById('report-modal').style.display = 'flex';

        } catch (err) {
            console.error('Error generating report:', err);
            alert('Could not generate forensic report.');
        }
    }
};

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
