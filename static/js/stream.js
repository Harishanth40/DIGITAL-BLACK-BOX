/* ==========================================================================
   DIGITAL BLACK BOX - FLIGHT RECORDER STREAM ENGINE
   ========================================================================== */

const StreamEngine = {
    container: null,
    autoScroll: true,
    filterCategory: 'ALL',

    init() {
        this.container = document.getElementById('flight-recorder-log-view');
        this.filterSelect = document.getElementById('stream-category-filter');
        this.toggleBtn = document.getElementById('btn-stream-toggle');
        this.clearBtn = document.getElementById('btn-stream-clear');

        if (this.filterSelect) {
            this.filterSelect.addEventListener('change', (e) => {
                this.filterCategory = e.target.value;
                App.fetchStream();
            });
        }

        if (this.toggleBtn) {
            this.toggleBtn.addEventListener('click', () => {
                this.autoScroll = !this.autoScroll;
                this.toggleBtn.innerText = this.autoScroll ? 'PAUSE AUTO-SCROLL' : 'RESUME AUTO-SCROLL';
                this.toggleBtn.style.color = this.autoScroll ? '' : 'var(--accent-amber)';
            });
        }

        if (this.clearBtn) {
            this.clearBtn.addEventListener('click', () => {
                if (this.container) this.container.innerHTML = '';
            });
        }
    },

    renderEvents(events) {
        if (!this.container) return;
        if (!events || events.length === 0) return;

        let html = '';
        events.reverse().forEach(ev => {
            html += `
                <div class="log-entry-line ${ev.severity}">
                    <span class="log-ts">${ev.formatted_time}</span>
                    <span class="log-cat">[${ev.category}]</span>
                    <span class="log-msg">${this.escapeHtml(ev.message)}</span>
                </div>
            `;
        });

        this.container.innerHTML = html;

        if (this.autoScroll) {
            this.container.scrollTop = this.container.scrollHeight;
        }
    },

    escapeHtml(str) {
        return str.replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;");
    }
};
