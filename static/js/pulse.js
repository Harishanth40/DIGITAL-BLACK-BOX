/* ==========================================================================
   DIGITAL BLACK BOX - SYSTEM PULSE WAVEFORM ENGINE (CANVAS)
   ========================================================================== */

const PulseEngine = {
    canvas: null,
    ctx: null,
    points: [],
    maxPoints: 80,

    init() {
        this.canvas = document.getElementById('canvas-system-pulse');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        
        // Fill initial baseline points
        for (let i = 0; i < this.maxPoints; i++) {
            this.points.push(0.2);
        }

        this.render();
    },

    pushSample(cpuVal) {
        // Normalize CPU 0-100 to 0.1-0.9
        const norm = 0.15 + (cpuVal / 100.0) * 0.75;
        this.points.push(norm);
        if (this.points.length > this.maxPoints) {
            this.points.shift();
        }
    },

    render() {
        if (!this.canvas || !this.ctx) return;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Clear background
        this.ctx.fillStyle = '#090d14';
        this.ctx.fillRect(0, 0, w, h);

        // Draw background grid lines
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        this.ctx.lineWidth = 1;

        for (let x = 0; x < w; x += 40) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, h);
            this.ctx.stroke();
        }

        for (let y = 0; y < h; y += 20) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(w, y);
            this.ctx.stroke();
        }

        // Draw Telemetry Heartbeat Waveform
        const step = w / (this.maxPoints - 1);
        this.ctx.beginPath();
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = '#f59e0b'; // Amber warning highlight accent

        for (let i = 0; i < this.points.length; i++) {
            const x = i * step;
            const y = h - (this.points[i] * h);

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.stroke();

        // Waveform gradient glow fill
        this.ctx.lineTo(w, h);
        this.ctx.lineTo(0, h);
        this.ctx.closePath();
        const grad = this.ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, 'rgba(245, 158, 11, 0.25)');
        grad.addColorStop(1, 'rgba(245, 158, 11, 0.0)');
        this.ctx.fillStyle = grad;
        this.ctx.fill();

        requestAnimationFrame(() => this.render());
    }
};
