# DIGITAL BLACK BOX (Digital Forensics & Incident Reconstruction System)

> **"An investigator opening a digital black box after a system failure."**

`DIGITAL BLACK BOX` is an original, flight-recorder-inspired digital forensics investigation and real-time telemetry recording workstation. Designed with a technical, high-contrast dark visual language (inspired by mission control panels and aircraft flight data recorders), it continuously captures system metrics, process states, and OS events into an immutable SQLite vault while providing 5-minute pre-incident timeline reconstruction and Time Machine scrubbing capabilities.

---

## 🚀 Key Features Implemented

1. **Original Forensic Workstation UI/UX**:
   - **No Generic Dashboard Layout**: Abandoned standard sidebars, rounded white cards, and colorful SaaS templates for an authentic technical flight recorder console interface.
   - **Central Black Box Core Visualizer**: SVG-based technical flight recorder core with pulsing recording ring, live telemetry gauges, event counters, and uptime tracking.
   - **Top Console Navigation Dock**: Switch seamlessly between `BLACK BOX CORE`, `LIVE FEED`, `INCIDENTS`, `RECONSTRUCTION`, `SYSTEM`, and `REPORTS`.

2. **Flight Recorder Live Event Stream**:
   - Technical console stream displaying high-frequency events (`SYS.FAILURE`, `RESOURCE`, `NETWORK`, `APPLICATION`).
   - Monospaced timestamping (`HH:MM:SS.mmm`), auto-scroll toggling, and category filters.

3. **5-Minute Pre-Incident Timeline Reconstruction**:
   - Step-by-step pre-failure reconstruction mode.
   - Reconstructs exact sequence of events leading up to a system failure (e.g. memory leak → network timeout → CPU saturation → thread deadlock → crash).

4. **Time Machine Scrubbing UI**:
   - Interactive timeline slider scrubbing across 300 seconds prior to failure.
   - **Dynamic Telemetry Playback**: Moving the slider instantly recalculates and updates CPU %, RAM %, Network throughput, active top processes, and highlighted timeline events at that exact second.

5. **Observed Event Relationship Map**:
   - Directed SVG network diagram illustrating co-occurring events observed near the failure window.
   - Explicitly labeled to maintain forensic standard: *"Events observed near failure window. Does not establish definitive root cause."*

6. **Forensic Investigation Report Generator**:
   - One-click `[ GENERATE BLACK BOX REPORT ]` button formatting a complete incident investigation audit document.
   - Includes Black Box ID, Incident ID, failure timestamp, telemetry peak statistics, reconstruction timeline table, relationship map, and formal legal disclaimer.
   - Print-ready and downloadable to PDF.

7. **Simulated Incident Mode (Demo Mode)**:
   - One-click `[ RUN SIMULATED INCIDENT ]` button.
   - Simulates a realistic thread deadlock and memory crash scenario safely without disrupting or crashing the host operating system.
   - Automatically opens Reconstruction Mode with the Time Machine slider ready for interactive demonstration.

8. **Local Backend Engine**:
   - `monitor.py`: Background thread utilizing `psutil` to log continuous CPU, memory, disk, network, and process telemetry at 1.0 Hz.
   - `database.py`: SQLite persistence (`blackbox.db`) for metrics, event streams, incidents, and report archives.
   - `analyzer.py`: Pre-incident metric extraction, anomaly scoring, and relationship graph generator.
   - `app.py`: High-performance Flask REST API.

---

## 📂 Project Structure

```
digital_black_box/
├── app.py                  # Flask web server & REST API endpoints
├── monitor.py              # Background system recorder using psutil
├── database.py             # SQLite persistence for metrics, events, & incidents
├── analyzer.py             # Incident reconstruction & event relationship analyzer
├── requirements.txt        # Python dependencies (flask, psutil)
├── README.md               # Project documentation
├── templates/
│   └── index.html          # Main single page application (SPA) shell
└── static/
    ├── css/
    │   └── blackbox.css    # Custom dark forensic instrument styling
    └── js/
        ├── app.js          # Master controller & router
        ├── core.js         # SVG Black Box Core & gauge engine
        ├── stream.js       # Live flight recorder console stream
        ├── pulse.js        # Canvas system pulse waveform
        ├── map.js          # SVG Event relationship graph renderer
        └── reconstruction.js # 5-minute pre-failure reconstruction & Time Machine
```

---

## 🛠 Installation & Setup Instructions

### Prerequisites
- Python 3.9+ installed.

### Step-by-Step Setup

1. **Navigate to the Project Directory**:
   ```bash
   cd digital_black_box
   ```

2. **Activate Environment & Install Dependencies**:
   ```bash
   # Using uv (fast python manager)
   uv pip install -r requirements.txt

   # OR standard pip inside virtual environment:
   pip install -r requirements.txt
   ```

3. **Run the Application**:
   ```bash
   python app.py
   ```

4. **Access the Workstation Interface**:
   Open your web browser and navigate to:
   [http://127.0.0.1:5000](http://127.0.0.1:5000)

---

## 🎮 Demo Instructions

1. **Explore the Black Box Core**:
   - Open [http://127.0.0.1:5000](http://127.0.0.1:5000) to view the central Black Box Core ring, real-time CPU/RAM meters, and the continuous System Pulse waveform.
2. **View Live Flight Recorder Stream**:
   - Click `02 LIVE FEED` in the top console navigation to inspect incoming technical system events.
3. **Trigger Simulated Incident**:
   - Click the amber `[ RUN SIMULATED INCIDENT ]` button in the top right corner.
   - Watch as realistic events enter the live feed and the system automatically opens **INCIDENT RECONSTRUCTION MODE**.
4. **Test the Time Machine**:
   - Drag the timeline scrubber slider horizontally from `T-05m:00s` to `T-00m:00s`.
   - Observe how CPU, RAM, active processes, and highlighted event nodes update dynamically at each scrub second.
   - Click `▶ PLAY` to watch automated playback.
5. **Generate Forensic Report**:
   - Click `[ GENERATE BLACK BOX REPORT ]`.
   - Inspect the formatted forensic audit document, and click `🖨 PRINT / EXPORT PDF` to print or save.

---

## ⚠️ Known OS Limitations

- **Process Privilege Restrictions**: On Windows/macOS/Linux without root/administrator privileges, `psutil` may obscure command-line arguments for system-protected kernel processes (returns `AccessDenied`).
- **Windows Event Log Access**: Extracting native Windows Security logs requires elevated PowerShell or administrator execution context.

---

## 🔮 Future Enhancement Ideas

- **Black Box Audio Telemetry**: Integrate synthesized audio chirps/clicks matching flight recorder audio tracks on warning thresholds.
- **Export Flight Data Package**: Export raw SQLite `.db` or JSON bundle for offline analysis on another forensic workstation.
- **Multi-Node Telemetry**: Network black box agent to record metrics across distributed microservices.
