/* ==========================================================================
   DIGITAL BLACK BOX - CORE VISUALIZER ENGINE
   ========================================================================== */

const CoreVisualizer = {
    init() {
        this.counterEl = document.getElementById('core-event-counter');
        this.recDurationEl = document.getElementById('core-rec-duration');
        this.cpuValEl = document.getElementById('core-cpu-val');
        this.cpuBarEl = document.getElementById('core-cpu-bar');
        this.memValEl = document.getElementById('core-mem-val');
        this.memBarEl = document.getElementById('core-mem-bar');
        this.diskValEl = document.getElementById('core-disk-val');
        this.diskBarEl = document.getElementById('core-disk-bar');
        this.netSentEl = document.getElementById('core-net-sent');
        this.netRecvEl = document.getElementById('core-net-recv');
        this.ringProgress = document.getElementById('core-ring-progress');
        this.uptimeEl = document.getElementById('core-uptime-val');
        this.incidentsCountEl = document.getElementById('core-incidents-count-val');
        this.lastIncidentTimeEl = document.getElementById('core-last-incident-time');
        this.recentIncidentsList = document.getElementById('core-recent-incidents-list');
        this.navIncidentCount = document.getElementById('nav-incident-count');
    },

    update(statusData) {
        if (!statusData) return;

        // Event counter & recording duration
        if (this.counterEl) this.counterEl.innerText = statusData.total_events.toLocaleString();
        if (this.recDurationEl) this.recDurationEl.innerText = statusData.recording_duration;
        if (this.uptimeEl) this.uptimeEl.innerText = `${statusData.uptime_seconds}s`;
        if (this.incidentsCountEl) this.incidentsCountEl.innerText = statusData.total_incidents;
        if (this.navIncidentCount) this.navIncidentCount.innerText = statusData.total_incidents;

        // Current Telemetry
        const metrics = statusData.current_metrics || {};
        const cpu = metrics.cpu_percent || 0;
        const mem = metrics.memory_percent || 0;
        const disk = metrics.disk_percent || 0;

        if (this.cpuValEl) this.cpuValEl.innerText = `${cpu.toFixed(1)}%`;
        if (this.cpuBarEl) this.cpuBarEl.style.width = `${cpu}%`;

        if (this.memValEl) this.memValEl.innerText = `${mem.toFixed(1)}%`;
        if (this.memBarEl) {
            this.memBarEl.style.width = `${mem}%`;
            this.memBarEl.className = 'meter-bar-fill ' + (mem > 85 ? 'critical' : mem > 70 ? 'warning' : '');
        }

        if (this.diskValEl) this.diskValEl.innerText = `${disk.toFixed(1)}%`;
        if (this.diskBarEl) this.diskBarEl.style.width = `${disk}%`;

        if (this.netSentEl) this.netSentEl.innerText = this.formatBytes(metrics.net_sent || 0) + '/s';
        if (this.netRecvEl) this.netRecvEl.innerText = this.formatBytes(metrics.net_recv || 0) + '/s';

        // Update Ring offset based on CPU load
        if (this.ringProgress) {
            const maxOffset = 880;
            const offset = maxOffset - (maxOffset * (cpu / 100));
            this.ringProgress.style.strokeDashoffset = offset;
        }

        // Last incident summary
        if (statusData.last_incident) {
            if (this.lastIncidentTimeEl) this.lastIncidentTimeEl.innerText = statusData.last_incident.formatted_time;
        }
    },

    updateIncidentsList(incidents) {
        if (!this.recentIncidentsList) return;
        if (!incidents || incidents.length === 0) {
            this.recentIncidentsList.innerHTML = '<div class="empty-state-text">No incidents recorded yet.</div>';
            return;
        }

        let html = '';
        incidents.slice(0, 3).forEach(inc => {
            html += `
                <div class="incident-card-sm">
                    <div class="inc-card-head">
                        <span class="inc-card-id">${inc.id}</span>
                        <span class="inc-card-time">${inc.formatted_time}</span>
                    </div>
                    <div class="inc-card-title">${inc.title}</div>
                    <button class="btn-investigate" onclick="App.openIncident('${inc.id}')">
                        [ INVESTIGATE ]
                    </button>
                </div>
            `;
        });
        this.recentIncidentsList.innerHTML = html;
    },

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
};
