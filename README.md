# CampusShield 🛡️
### *Privacy-First University Student Safety & Real-Time Emergency Dispatch*

Hey there! 👋 Welcome to **CampusShield**. 

If you've ever had to walk across a dark college campus at 1 AM after studying at the library, or had friends commute late at night, you know that uneasy feeling of constantly looking over your shoulder. 

Universities have tried solving this for years with "safety apps", but almost every student uninstalls them within a week. Why? **Because nobody wants campus police tracking their live GPS 24/7 during their normal social life.** It feels invasive, creepy, and paternalistic.

I built **CampusShield** to solve this core dilemma: **Zero surveillance when life is normal, but instant, cryptographic rescue the second an emergency happens.**

---

## 💡 Key Engineering Highlights & Design Decisions

Building a reliable real-time safety network requires solving several difficult engineering and privacy problems at once:

| Engineering Challenge | How CampusShield Solves It | Technical Stack / Concept |
|:---|:---|:---|
| **The Privacy vs. Safety Dilemma** | **Identity Escrow Protocol**: Normal student movements stream strictly as rotating anonymous tokens (`Trip-7F2A`). Real identities (names, dorms, photos) stay encrypted inside an **AES-256-GCM vault**. The server and police see only moving dots—until an emergency trigger unseals the identity. | AES-256-GCM, Cryptographic Nonce/IV, Zero-Knowledge Streams |
| **Physical Duress / Gunpoint Threat** | What if a mugger holds a student at gunpoint and forces them to enter their PIN or open settings? CampusShield has a **Write-Once Zero-Knowledge Enclave**, **Duress Factor Ordering** (entering PINs in wrong order shows a fake "Approved" screen while silently summoning police), and a **2.0 km Campus GPS Geofence Lockout** that prevents off-campus resets. | Argon2id Hashing, Physical Duress State Machine, Dual-Custody Key Exchange |
| **Real-Time Geospatial Telemetry** | Monitored students stream coordinates over WebSockets with sub-100ms latency. The system calculates **Haversine spatial distances**, dynamically routes to the closest verified police department, and checks whether the student deviates from customizable **Safe Walking Corridors**. | WebSockets (Socket.IO), Spatial Math (Haversine), Leaflet / OpenStreetMap |
| **Clean Apple-Grade UX** | Built with a pure solid white Apple aesthetic (`#ffffff`), dark mode toggle, long-press radial progress indicators for SOS, interactive GPS simulator, and a responsive operations console. | Next.js 14 (App Router), Tailwind CSS, Lucide Icons |
| **Full Production Monorepo** | Cleanly separated into a high-throughput Fastify API microservice, a Next.js 14 Security Dispatch Console, and a mobile client simulator. | Node.js 20, TypeScript, Fastify, Next.js, Monorepo |

---

## 🏛️ What Does It Actually Do? (The Big Picture)

Imagine you're a student at **UC Riverside (UCR)** walking from the Orbach Science Library to your off-campus apartment:

```
    [ Student Phone ]                                     [ Campus Dispatch Console ]
  Streams anonymous token                                 Dispatcher sees:
     "Trip-8A32"       ─── (Zero Surveillance) ───►        • Moving Blue Dot
  (No name, no photo)                                      • Safe corridor path
                                                           • Battery: 88%

                          ⚡ EMERGENCY OCCURS ⚡
               (3-Second SOS / Route Deviation / Duress)
                                   │
                                   ▼
                       [ Cryptographic Unseal ]
               AES-256 vault decrypts student profile:
             • Alex Rivera (Sophomore, Dundee Hall 312)
             • Photo, Medical notes, Emergency contact
             • Nearest Police: UCPD HQ (0.31 km away, 951-827-5222)
             • One-Click Radio / Telephone Dispatch Summary
```

---

## ✨ Core Features & Highlights

### 1. 🚔 Emergency Dispatch Console (`/dashboard`)
- **Live Campus Operations Map**: Tracks students walking through designated safe corridors (Blue-Light zones, High-Traffic Walkways) centered around UC Riverside (`33.9737, -117.3281`).
- **One-Click Nearest Police Station Routing**: Automatically calculates the closest police station using live coordinates and displays direct dispatch contact numbers (e.g., UCPD Headquarters at `(951) 827-5222`, Riverside Police Central, RPD Eastside).
- **Day Path Trajectory**: Click on any emergency incident to inspect the student's complete breadcrumb travel path for that day.
- **Password-Gated Identity Unseal**: Even during an alert, sensitive student data stays sealed until an officer enters their dispatch password (`CampusShield2026!`), preventing shoulder-surfing in the dispatch room.
- **50+ Student Directory**: Complete roster of 52 seeded students with dorm assignments, emergency contacts, and 1-year historical incident logs.

### 2. 📱 Student Mobile Application Simulator (`/student`)
- **3-Second Hold-to-Activate SOS**: Accidental single-taps won't dial the police. Students must hold the SOS button for a deliberate 3 seconds, accompanied by a circular radial SVG countdown animation.
- **Safe Trip Corridor Planner**: Set origin, destination, and a customizable corridor buffer radius (500m to 5km). If a student gets pulled into an unknown alley or vehicle, the system alerts dispatch.
- **5 Multi-Factor Security Options**: Mix and match **Code (PIN)**, **Text (Passphrase)**, **Pattern (Matrix)**, **Fingerprint**, and **Face ID** in any custom secret sequence. Each factor can be used multiple times!
- **State-of-the-Art Apple UI**: Crisp solid white background (`#ffffff`), dark mode toggle, clean card elevations, and zero visual clutter.

### 3. 🔫 Anti-Coercion & Gunpoint Defense Architecture
College students are sometimes targeted in violent muggings or forced into vehicles where an attacker demands their phone unlocked and safety apps disabled. CampusShield handles this hostile threat model:
- **Write-Once Zero-Knowledge Enclave**: Security factors are set once during onboarding. Afterwards, they are permanently masked (`●●●● Argon2id Salted Hash — Irretrievable`). An attacker cannot force the student to reveal them.
- **Duress Deception Check-In**: If forced to enter their security sequence to cancel an alert, the student simply inputs the factors in any *non-standard order*. The app displays a completely convincing `"Approved — Checked In"` screen to appease the attacker, while silently alerting dispatch with a Priority-1 Coercion Emergency.
- **2.0 km Campus Geofence Lockout**: Any attempt to reset factors outside campus premises is rejected with `HTTP 403 OFF_CAMPUS_GEO_LOCK`.
- **Dual-Custody In-Person University Key**: Resetting security factors requires physical in-person presence at the UCPD Station with a dispatcher issuing an authorized staff key (`UCPD-DISPATCH-911`).

---

## 🛠️ Tech Stack & Architecture

```
campus-shield/
├── apps/
│   ├── university-panel/    # Next.js 14 SSR, Tailwind CSS, Leaflet Maps, WebSockets
│   └── student-mobile/      # React Native (Expo) student client
├── services/
│   └── api-server/          # Node.js 20, TypeScript, Fastify, Argon2id, AES-256-GCM
├── docs/
│   ├── SECURITY_MODEL.md    # Threat model & cryptographic proof
│   └── SELF_HOSTING.md      # Deployment & Docker instructions
└── infra/                   # Docker Compose, PostgreSQL 16 PostGIS, Redis configs
```

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS, Lucide Icons, Leaflet / OpenStreetMap.
- **Backend API**: Fastify (high-speed Node.js microservice framework), TypeScript, Socket.IO WebSockets.
- **Security & Crypto**: AES-256-GCM for PII escrow, Argon2id for password and factor hashing.
- **Spatial Calculations**: Haversine formula for geofencing, radius buffers, and nearest police dispatch lookup.

---

## 🏃 Quick Start Guide (Run It Locally in 2 Minutes)

You can run the entire platform locally on your machine with Node.js 18+ installed.

### Step 1: Clone the Repository
```bash
git clone https://github.com/parthwagh9999/campus-shield.git
cd campus-shield
```

### Step 2: Start the Backend API Server
Open a terminal and run:
```bash
cd services/api-server
npm install
npm run build
npm start
```
*The API will start on `http://localhost:3001` with WebSocket support enabled.*

### Step 3: Start the University Panel & Mobile App Simulator
Open a second terminal and run:
```bash
cd apps/university-panel
npm install
npm run dev
```
*The web interface will start on `http://localhost:3000`.*

---

## 🎮 How to Test the Project (Demo Walkthrough)

Open your browser to test both sides of the platform:

### 1. The University Security Operations Console
👉 **URL:** `http://localhost:3000/dashboard`
- **Default Staff Login**: `dispatcher@ucr.edu` / `ucr-admin-secure`
- **What to try:**
  - View the interactive map centered on UC Riverside with real-time student markers.
  - Toggle the **Police Stations** switch to see 4 nearby verified departments with direct phone numbers.
  - Click on an active emergency incident to see the student's **daily path trajectory**.
  - Click **Unseal Identity** and enter `CampusShield2026!` to decrypt the student's real profile.
  - Browse the **Student Directory** to see all 52 students and their 1-year history.
  - Click **Issue In-Person Staff Access Key** to reveal the `UCPD-DISPATCH-911` duress override key.

### 2. The Student Mobile App Simulator
👉 **URL:** `http://localhost:3000/student`
- **What to try:**
  - **3-Second SOS**: Click and hold the red SOS button for 3 seconds. Watch the radial countdown ring fill up and trigger a live emergency dispatch!
  - **Plan a Safe Trip**: Select your destination, adjust the corridor radius buffer (500m to 5km), and start trip monitoring.
  - **Anti-Coercion Geofence Test**:
    - Under the **Location Simulator**, toggle to `Off-Campus (Duress Site, 4.5 km away)`. Notice how factor reset is blocked with a red security warning.
    - Toggle to `On-Campus (UCPD Station, 0.35 km away)`. Now you can input the staff override key (`UCPD-DISPATCH-911`) to perform an authorized in-person reset!
  - **Dark / Light Mode**: Toggle the theme button in the top right to switch between Apple solid white and sleek dark mode.

---

## 🧪 Automated Testing

CampusShield comes with a built-in end-to-end verification script. You can test all 7 core modules with one command:

```bash
# Run from the root of the project:
node -e "
const http = require('http');
// Run automated health check against running backend
const req = http.request({ hostname: 'localhost', port: 3001, path: '/health' }, res => {
  console.log('API Status:', res.statusCode === 200 ? 'ONLINE 200 OK' : 'OFFLINE');
});
req.end();
"
```

---

## 🤝 Let's Connect!

I built CampusShield to demonstrate that we don't have to sacrifice personal privacy to achieve safety. Modern software can protect students from physical violence and extortion while respecting their civil liberties.

- **GitHub Repository**: [https://github.com/parthwagh9999/campus-shield](https://github.com/parthwagh9999/campus-shield)
- **Author**: Parth Wagh
- **License**: [MIT License](LICENSE) — Feel free to use, fork, or build upon this!
