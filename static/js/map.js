/* ==========================================================================
   DIGITAL BLACK BOX - EVENT RELATIONSHIP MAP GRAPH VISUALIZER
   ========================================================================== */

const RelationshipMap = {
    container: null,

    init() {
        this.container = document.getElementById('event-relationship-map-svg');
    },

    render(mapData) {
        if (!this.container) return;
        if (!mapData || !mapData.nodes || mapData.nodes.length === 0) {
            this.container.innerHTML = '<div class="empty-state-text">No event relationship graph available.</div>';
            return;
        }

        const nodes = mapData.nodes;
        const links = mapData.links || [];

        // Simple directed graph layout coordinates
        const positions = {
            'n1': { x: 70, y: 50 },
            'n2': { x: 70, y: 170 },
            'n3': { x: 230, y: 50 },
            'n4': { x: 230, y: 170 },
            'n5': { x: 390, y: 110 }
        };

        let svgHtml = `
            <svg width="480" height="220" viewBox="0 0 480 220" style="background:#080b0f; border:1px solid #232d3d;">
                <defs>
                    <marker id="arrow" viewBox="0 0 10 10" refX="15" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" />
                    </marker>
                </defs>
        `;

        // Render Links
        links.forEach(link => {
            const src = positions[link.source] || { x: 50, y: 50 };
            const tgt = positions[link.target] || { x: 200, y: 200 };

            svgHtml += `
                <line x1="${src.x}" y1="${src.y}" x2="${tgt.x}" y2="${tgt.y}" 
                      stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="4 2" marker-end="url(#arrow)" />
            `;
        });

        // Render Nodes
        nodes.forEach(node => {
            const pos = positions[node.id] || { x: 100, y: 100 };
            const color = node.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b';

            svgHtml += `
                <g transform="translate(${pos.x}, ${pos.y})">
                    <rect x="-55" y="-18" width="110" height="36" rx="2" 
                          fill="#11161d" stroke="${color}" stroke-width="1.5" />
                    <text x="0" y="4" text-anchor="middle" fill="#e6edf3" 
                          font-family="JetBrains Mono, monospace" font-size="10" font-weight="bold">
                        ${node.label}
                    </text>
                </g>
            `;
        });

        svgHtml += `</svg>`;
        this.container.innerHTML = svgHtml;
    }
};
