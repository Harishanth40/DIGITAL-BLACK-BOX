/* ==========================================================================
   DIGITAL BLACK BOX - INCIDENT RECONSTRUCTION & TIME MACHINE ENGINE
   ========================================================================== */

const ReconstructionEngine = {
    incidentData: null,
    telemetrySeries: [],
    timelineEvents: [],
    isPlaying: false,
    playInterval: null,

    init() {
        this.slider = document.getElementById('time-machine-slider');
        this.playBtn = document.getElementById('tm-play-btn');
        this.stepBackBtn = document.getElementById('tm-step-back');
        this.stepFwdBtn = document.getElementById('tm-step-fwd');

        this.scrubTimeEl = document.getElementById('tm-scrub-time');
        this.scrubOffsetEl = document.getElementById('tm-scrub-offset');
        this.scrubCpuEl = document.getElementById('tm-scrub-cpu');
        this.scrubRamEl = document.getElementById('tm-scrub-ram');
        this.procsBody = document.getElementById('tm-procs-body');
        this.timelineTree = document.getElementById('vertical-timeline-tree');

        if (this.slider) {
            this.slider.addEventListener('input', (e) => {
                this.scrubTo(parseInt(e.target.value));
            });
        }

        if (this.playBtn) {
            this.playBtn.addEventListener('click', () => {
                this.togglePlay();
            });
        }

        if (this.stepBackBtn) {
            this.stepBackBtn.addEventListener('click', () => {
                const cur = parseInt(this.slider.value);
                this.scrubTo(Math.max(0, cur - 5));
            });
        }

        if (this.stepFwdBtn) {
            this.stepFwdBtn.addEventListener('click', () => {
                const cur = parseInt(this.slider.value);
                this.scrubTo(Math.min(300, cur + 5));
            });
        }
    },

    loadIncident(data) {
        if (!data) return;
        this.incidentData = data.incident;
        this.telemetrySeries = data.telemetry_series || [];
        this.timelineEvents = data.timeline || [];

        // Header info
        document.getElementById('recon-incident-id').innerText = this.incidentData.id;
        document.getElementById('recon-incident-title').innerText = this.incidentData.title;
        document.getElementById('recon-severity-tag').innerText = this.incidentData.severity;
        document.getElementById('recon-timestamp-str').innerText = `TIMESTAMP: ${this.incidentData.formatted_time}`;
        
        const simTag = document.getElementById('recon-sim-tag');
        if (simTag) {
            simTag.style.display = this.incidentData.id.includes('SIM') || this.incidentData.title.includes('SIMULATED') ? 'inline-block' : 'none';
        }

        // Render Step Timeline Tree
        this.renderTimelineTree();

        // Render Relationship Map
        if (typeof RelationshipMap !== 'undefined') {
            RelationshipMap.render(data.relationship_map);
        }

        // Reset Time machine slider to 300 (failure point)
        if (this.slider) {
            this.slider.value = 300;
            this.scrubTo(300);
        }
    },

    renderTimelineTree() {
        if (!this.timelineTree) return;
        if (!this.timelineEvents || this.timelineEvents.length === 0) {
            this.timelineTree.innerHTML = '<div class="empty-state-text">No timeline events recorded.</div>';
            return;
        }

        let html = '';
        this.timelineEvents.forEach((item, idx) => {
            html += `
                <div class="timeline-step-node ${item.severity}" id="timeline-node-${idx}">
                    <div class="node-indicator">●</div>
                    <div class="node-body">
                        <div class="node-time">${item.timestamp} (T${item.offset}s) [${item.category}]</div>
                        <div class="node-text">${item.event}</div>
                    </div>
                </div>
            `;
        });
        this.timelineTree.innerHTML = html;
    },

    scrubTo(val) {
        if (this.slider) this.slider.value = val;

        // val goes from 0 (T-300s) to 300 (T-0s)
        const targetOffset = -300 + val;
        
        // Find closest telemetry point
        let closestSample = null;
        let minDiff = Infinity;

        this.telemetrySeries.forEach(sample => {
            const diff = Math.abs((sample.offset_seconds || 0) - targetOffset);
            if (diff < minDiff) {
                minDiff = diff;
                closestSample = sample;
            }
        });

        if (!closestSample && this.telemetrySeries.length > 0) {
            closestSample = this.telemetrySeries[this.telemetrySeries.length - 1];
        }

        if (closestSample) {
            if (this.scrubTimeEl) this.scrubTimeEl.innerText = closestSample.formatted_time;
            if (this.scrubOffsetEl) this.scrubOffsetEl.innerText = `${targetOffset >= 0 ? '+' : ''}${targetOffset}s`;
            if (this.scrubCpuEl) this.scrubCpuEl.innerText = `${closestSample.cpu_percent}%`;
            if (this.scrubRamEl) this.scrubRamEl.innerText = `${closestSample.memory_percent}%`;

            // Update Process Table
            this.renderProcesses(closestSample.processes || []);
        }

        // Highlight timeline node corresponding to closest offset
        this.highlightTimelineNode(targetOffset);
    },

    renderProcesses(procs) {
        if (!this.procsBody) return;
        if (!procs || procs.length === 0) {
            this.procsBody.innerHTML = '<tr><td colspan="4" class="empty-state-text">No process data captured.</td></tr>';
            return;
        }

        let html = '';
        procs.forEach(p => {
            html += `
                <tr>
                    <td>${p.pid}</td>
                    <td style="color:${p.cpu > 50 ? 'var(--accent-red)' : 'var(--text-primary)'}">${p.name}</td>
                    <td style="color:var(--accent-cyan)">${p.cpu}%</td>
                    <td>${p.mem}%</td>
                </tr>
            `;
        });
        this.procsBody.innerHTML = html;
    },

    highlightTimelineNode(targetOffset) {
        this.timelineEvents.forEach((ev, idx) => {
            const el = document.getElementById(`timeline-node-${idx}`);
            if (el) {
                // Node active if scrub is near its offset
                if (Math.abs(ev.offset - targetOffset) <= 15) {
                    el.classList.add('active');
                } else {
                    el.classList.remove('active');
                }
            }
        });
    },

    togglePlay() {
        if (this.isPlaying) {
            clearInterval(this.playInterval);
            this.isPlaying = false;
            if (this.playBtn) this.playBtn.innerText = '▶ PLAY';
        } else {
            this.isPlaying = true;
            if (this.playBtn) this.playBtn.innerText = '⏸ PAUSE';

            if (parseInt(this.slider.value) >= 300) {
                this.slider.value = 0;
            }

            this.playInterval = setInterval(() => {
                let cur = parseInt(this.slider.value) + 2;
                if (cur >= 300) {
                    cur = 300;
                    this.togglePlay();
                }
                this.scrubTo(cur);
            }, 200);
        }
    }
};
