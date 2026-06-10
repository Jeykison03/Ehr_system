# 🩺 Mini EHR — Advanced Healthcare Portal & AI Diagnostics

Welcome to **Mini EHR**, a modern, secure, and state-of-the-art Electronic Health Record (EHR) web application. Designed for seamless collaboration between patients and healthcare professionals, Mini EHR combines rich dashboards, interactive charting, secure messaging/alerts, and a vision-based AI parser to scan and decode medical prescriptions.

---

## 🚀 Key Features

### 👤 Patient Portal
* **Dashboard Snapshots**: At-a-glance health metrics, check-in schedules, and recent doctor replies.
* **Symptom Tracker**: Check-in symptoms with duration, location, notes, and photos.
* **Blood Sugar Analytics**: Interactive charts graphing blood sugar fluctuations (mg/dL) over time.
* **AI Prescription Scanner**: Upload handwritten or printed prescription images to automatically extract medication names, dosages, frequencies, and instructions using AI.
* **Reminders**: Alerts for medications, upcoming appointments, and general tasks.
* **Medical Reports Vault**: Secure repository to upload and view clinical reports with built-in PDF/Image previews.

### 🥼 Doctor Portal
* **Patient Network List**: Search and filter patients linked under the physician's unique identifier code.
* **Patient Details & Timeline**: Deep-dive clinical view showing a history of check-ins, blood sugar trends, and past prescriptions.
* **Prescription Manager**: Directly prescribe medications with dosage, frequency, and instructions.
* **Report Management**: View patient-uploaded reports and upload new clinical reports.
* **Urgent Patient Alerts**: Actively monitor alerts sent by patients, submit replies, and resolve incidents.

---

## 🛠 Tech Stack

* **Frontend**: React 18, Vite, React Router DOM, Recharts (for medical graphing), Lucide React (for premium icons), Vanilla CSS (custom glassmorphism & neon dark aesthetics).
* **Backend**: FastAPI (Python 3.10), Uvicorn, PostgreSQL (with Threaded Connection Pooling), bcrypt (secure password hashing), Pydantic (data validation).
* **AI Services**: Groq Vision client (using `llama-3.2-11b-vision-preview` to analyze prescription scans).
* **Environment**: Docker Compose (multi-container setup with independent frontend & backend build pipelines).

---

## 🔑 Test Credentials

Use these pre-configured credentials to explore the patient and doctor portal features:

> [!IMPORTANT]
> ### 👤 Patient Profile
> - **Email**: `jeykison2013@gmail.com`
> - **Password**: `Jeykison`
>
> ### 🥼 Doctor Profile
> - **Email**: `jeykison2000@gmail.com`
> - **Password**: `Jeykison`

---

## 🏗 Directory Structure

```text
mini-ehr/
├── backend/                  # FastAPI Python backend
│   ├── database.py           # PostgreSQL database client & pooled execution
│   ├── main.py               # REST API endpoints, CORS, & SMTP routing
│   ├── model.py              # Pydantic schemas & payload validators
│   ├── Dockerfile            # Python builder configuration
│   └── requirements.txt      # Backend dependencies
│
├── frontend/                 # React Vite frontend
│   ├── src/
│   │   ├── components/       # Reusable components (Sidebars, Page Layouts)
│   │   ├── pages/            # View Pages (Dashboard, Symptoms, Profiles, Reports)
│   │   ├── App.jsx           # Routing & global session state
│   │   └── index.css         # Styling system & dark mode tokens
│   ├── Dockerfile            # Multi-stage production Nginx builder
│   └── nginx.conf            # Reverse proxy setup
│
└── docker-compose.yml        # Orchestration script for backend & frontend
```

---

## ⚡ Quick Start (Local Deployment)

### Prerequisites
1. **Docker & Docker Compose** installed.
2. Configure environment variables in `backend/.env` (duplicate `backend/.env.example` and add your credentials):
   - `DATABASE_URL` (Supabase or custom PostgreSQL server URL)
   - `GROQ_API_KEY` (For AI prescription scanner)
   - `SMTP_USER` / `SMTP_PASS` (Gmail credentials for password recovery & registration OTP checks)

### Running the Application
From the root directory, run the following command to build images and launch the containers in the background:

```bash
docker compose up --build -d
```

Once started, access the services:
- **Frontend App**: [http://localhost:5173](http://localhost:5173)
- **Backend API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

To view active container logs:
```bash
docker compose logs -f
```

To stop the services:
```bash
docker compose down
```

---

## 🔒 Security & HIPAA Compliance Guidelines
- **End-to-End Encryption**: Secure connection pooling with SSL mode enforced for external databases.
- **Credential Hashing**: Passwords stored as salted hashes using `bcrypt` (never in plain text).
- **Access Control**: Dynamic session verification and role separation logic.