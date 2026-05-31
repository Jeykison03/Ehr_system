# pyrefly: ignore [missing-import]
from fastapi import FastAPI, HTTPException, status, Query, Body, Depends
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Dict, Any
import os
import logging
import datetime
import uuid
# pyrefly: ignore [missing-import]
import bcrypt
from database import execute_query
from model import UserSignup, UserLogin, SymptomCreate, PrescriptionCreate, PrescriptionScanRequest, PatientProfileUpdate, DoctorProfileUpdate, ReportSaveRequest, AlertCreate, AlertComment
from groq import Groq

# --- LOGGING CONFIGURATION ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("MiniEHR-Backend")

app = FastAPI(
    title="Mini EHR - Advanced Medical API",
    description="Secure Backend for Healthcare Data Management with Custom SQL Engine",
    version="2.1.0"
)

# --- CORS CONFIGURATION ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
)

# --- AI CONFIGURATION ---
try:
    GROQ_KEY = os.environ.get("GROQ_API_KEY")
    if not GROQ_KEY:
        logger.warning("GROQ_API_KEY not found in environment variables.")
    ai_client = Groq(api_key=GROQ_KEY)
    logger.info("Groq AI Client initialized successfully.")
except Exception as e:
    logger.error(f"Critical Error: AI Initialization failed: {str(e)}")

# --- AUTHENTICATION ENDPOINTS ---

@app.post("/auth/signup", status_code=201)
async def signup_user(user: UserSignup):
    """
    Registers a user and creates a doctor or patient profile using manual SQL.
    """
    logger.info(f"Attempting signup for email: {user.email}")
    
    try:
        password_hash = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        new_id = str(uuid.uuid4())

        if user.role == "doctor":
            if not user.doctor_code:
                raise HTTPException(status_code=400, detail="Doctor Code is required for professionals.")

            # Check existing doctor code
            existing = execute_query(
                "SELECT id FROM doctors WHERE doctor_code = %s",
                (user.doctor_code,),
                fetch="one"
            )
            if existing:
                raise HTTPException(status_code=400, detail="This Doctor Code is already registered.")

            # Check existing email in doctors
            existing_email = execute_query(
                "SELECT id FROM doctors WHERE email = %s",
                (user.email,),
                fetch="one"
            )
            if existing_email:
                raise HTTPException(status_code=400, detail="This email is already registered as a doctor.")

            # Insert doctor
            data = execute_query(
                """
                INSERT INTO doctors (id, email, hash_password, first_name, last_name, age, phone_number, doctor_code)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (new_id, user.email, password_hash, user.first_name, user.last_name, user.age, user.phone_number, user.doctor_code),
                fetch="one"
            )
            
            if not data:
                raise HTTPException(status_code=500, detail="Failed to create account.")
            
            # Map object to standard types
            data_dict = dict(data)
            data_dict["id"] = str(data_dict["id"])
            data_dict["full_name"] = f"{data_dict['first_name']} {data_dict['last_name']}"
            if data_dict.get("created_at"):
                data_dict["created_at"] = str(data_dict["created_at"])
            
            return {"status": "success", "data": data_dict}

        elif user.role == "patient":
            if not user.doctor_code:
                raise HTTPException(status_code=400, detail="Doctor Code is required for patient registration.")

            # Look up doctor
            doc_lookup = execute_query(
                "SELECT id FROM doctors WHERE doctor_code = %s",
                (user.doctor_code,),
                fetch="one"
            )
            if not doc_lookup:
                raise HTTPException(status_code=404, detail="The provided Doctor Code does not exist.")

            # Check existing email in patients
            existing_email = execute_query(
                "SELECT id FROM patients WHERE email = %s",
                (user.email,),
                fetch="one"
            )
            if existing_email:
                raise HTTPException(status_code=400, detail="This email is already registered as a patient.")

            # Insert patient
            data = execute_query(
                """
                INSERT INTO patients (id, email, hash_password, first_name, last_name, age, phone_number, doctor_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (new_id, user.email, password_hash, user.first_name, user.last_name, user.age, user.phone_number, str(doc_lookup["id"])),
                fetch="one"
            )
            
            if not data:
                raise HTTPException(status_code=500, detail="Failed to create account.")
            
            # Map object to standard types
            data_dict = dict(data)
            data_dict["id"] = str(data_dict["id"])
            data_dict["doctor_id"] = str(data_dict["doctor_id"]) if data_dict.get("doctor_id") else None
            data_dict["full_name"] = f"{data_dict['first_name']} {data_dict['last_name']}"
            if data_dict.get("created_at"):
                data_dict["created_at"] = str(data_dict["created_at"])
            
            return {"status": "success", "data": data_dict}

        else:
            raise HTTPException(status_code=400, detail="Invalid role specified.")

    except HTTPException:
        raise
    except Exception as err:
        logger.error(f"Signup exception: {str(err)}")
        raise HTTPException(status_code=500, detail=f"Server-side error: {str(err)}")

@app.post("/auth/login")
async def login_user(user: UserLogin):
    """
    Verifies credentials and ensures the user exists in the correct role table.
    """
    logger.info(f"Login attempt: {user.email} as {user.role}")
    
    try:
        if user.role == "doctor":
            query = "SELECT * FROM doctors WHERE email = %s"
        elif user.role == "patient":
            query = "SELECT * FROM patients WHERE email = %s"
        else:
            raise HTTPException(status_code=400, detail="Invalid role specified.")

        profile = execute_query(query, (user.email,), fetch="one")

        if not profile:
            raise HTTPException(status_code=401, detail="Invalid credentials.")

        stored_password = profile.get("hash_password")
        if not stored_password or not bcrypt.checkpw(user.password.encode('utf-8'), stored_password.encode('utf-8')):
            raise HTTPException(status_code=401, detail="Invalid credentials.")

        full_name_val = f"{profile.get('first_name') or ''} {profile.get('last_name') or ''}".strip()
        response = {
            "id": str(profile["id"]),
            "email": profile["email"],
            "first_name": profile.get("first_name"),
            "last_name": profile.get("last_name"),
            "full_name": full_name_val,
            "age": profile.get("age"),
            "phone_number": profile.get("phone_number"),
            "role": user.role,
        }
        if user.role == "doctor":
            response["doctor_code"] = profile.get("doctor_code")
        else:
            response["doctor_id"] = str(profile["doctor_id"]) if profile.get("doctor_id") else None

        return response
    except HTTPException:
        raise
    except Exception as err:
        logger.error(f"Login Failure: {str(err)}")
        raise HTTPException(status_code=401, detail="Authentication failed.")

# --- SYMPTOM ENDPOINTS ---

@app.post("/symptoms/save")
async def save_symptom(symptom: SymptomCreate):
    """
    Saves a patient's symptom to the database using direct SQL queries.
    """
    logger.info(f"Saving symptom for patient: {symptom.patient_id}")
    
    try:
        # Check if patient exists
        patient_check = execute_query(
            "SELECT id FROM patients WHERE id = %s",
            (symptom.patient_id,),
            fetch="one"
        )
        if not patient_check:
            raise HTTPException(status_code=404, detail="Patient profile does not exist.")

        entry_date = symptom.occurrence_date or datetime.date.today().isoformat()
        new_id = str(uuid.uuid4())
        
        data = execute_query(
            """
            INSERT INTO symptoms (
                id, patient_id, description, severity, duration, location,
                associated_symptoms, occurrence_date,
                notes, blood_sugar, meal_info, medication_taken, image_url
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                new_id,
                symptom.patient_id,
                symptom.description,
                symptom.severity,
                symptom.duration,
                symptom.location,
                symptom.associated_symptoms,
                entry_date,
                symptom.notes,
                symptom.blood_sugar,
                symptom.meal_info,
                symptom.medication_taken,
                symptom.image_url
            ),
            fetch="one"
        )
        
        if not data:
            logger.error("Empty data returned on symptom insert.")
            raise HTTPException(status_code=500, detail="Data was not saved to database.")
        
        # Serialize fields for output consistency
        data["id"] = str(data["id"])
        data["patient_id"] = str(data["patient_id"])
        if data.get("occurrence_date"):
            data["occurrence_date"] = str(data["occurrence_date"])
        if data.get("created_at"):
            data["created_at"] = str(data["created_at"])
            
        return {"status": "success", "message": "Symptom recorded", "data": data}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Symptom Save Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")

@app.get("/symptoms/patient/{patient_id}")
async def get_patient_symptoms(patient_id: str):
    """
    Retrieves all symptoms for a specific patient.
    """
    try:
        res = execute_query(
            "SELECT * FROM symptoms WHERE patient_id = %s ORDER BY occurrence_date DESC, created_at DESC",
            (patient_id,),
            fetch="all"
        )
        # Ensure serialization
        for row in res:
            row["id"] = str(row["id"])
            row["patient_id"] = str(row["patient_id"])
            if row.get("occurrence_date"):
                row["occurrence_date"] = str(row["occurrence_date"])
            if row.get("created_at"):
                row["created_at"] = str(row["created_at"])
        return res
    except Exception as e:
        logger.error(f"Fetch Symptoms Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Could not retrieve symptoms.")

@app.delete("/symptoms/{symptom_id}")
async def delete_symptom(symptom_id: str):
    """
    Deletes a symptom by ID.
    """
    try:
        res = execute_query(
            "DELETE FROM symptoms WHERE id = %s RETURNING id",
            (symptom_id,),
            fetch="one"
        )
        if not res:
            raise HTTPException(status_code=404, detail="Symptom not found.")
        return {"status": "deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete Symptom Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Could not delete symptom.")

@app.get("/doctor/my-patients/{doctor_id}")
async def get_doctor_patients(doctor_id: str):
    """
    Retrieves all patients registered under a specific doctor.
    """
    try:
        res = execute_query(
            "SELECT id, email, full_name, doctor_id, created_at FROM patients WHERE doctor_id = %s ORDER BY created_at DESC",
            (doctor_id,),
            fetch="all"
        )
        # Ensure serialization
        for row in res:
            row["id"] = str(row["id"])
            row["doctor_id"] = str(row["doctor_id"]) if row.get("doctor_id") else None
            if row.get("created_at"):
                row["created_at"] = str(row["created_at"])
        return res
    except Exception as e:
        logger.error(f"Fetch Patients Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal data retrieval error.")

@app.post("/doctor/prescribe")
async def create_prescription(pres: PrescriptionCreate):
    """
    Creates a new prescription record.
    """
    try:
        # Validate doctor and patient exist
        doc_check = execute_query("SELECT id FROM doctors WHERE id = %s", (pres.doctor_id,), fetch="one")
        if not doc_check:
            raise HTTPException(status_code=404, detail="Doctor profile not found.")
            
        pat_check = execute_query("SELECT id FROM patients WHERE id = %s", (pres.patient_id,), fetch="one")
        if not pat_check:
            raise HTTPException(status_code=404, detail="Patient profile not found.")

        new_id = str(uuid.uuid4())
        data = execute_query(
            """
            INSERT INTO prescriptions (id, patient_id, doctor_id, medicine_name, dosage, frequency, duration, instructions)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                new_id,
                pres.patient_id,
                pres.doctor_id,
                pres.medicine_name,
                pres.dosage,
                pres.frequency,
                pres.duration,
                pres.instructions
            ),
            fetch="one"
        )
        
        if not data:
            raise HTTPException(status_code=500, detail="Failed to record prescription.")

        # Serialize fields
        data["id"] = str(data["id"])
        data["patient_id"] = str(data["patient_id"])
        data["doctor_id"] = str(data["doctor_id"])
        if data.get("created_at"):
            data["created_at"] = str(data["created_at"])
            
        return {"message": "Prescription recorded successfully", "data": data}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Prescription Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to issue prescription.")

# --- AI & ANALYTICS ENDPOINTS ---

@app.post("/ai/explain-medicine")
async def explain_medicine(medicine: str = Body(..., embed=True)):
    """
    Consults Groq to explain a medicine to a patient.
    """
    try:
        prompt = (
            f"You are a helpful medical assistant. A patient is prescribed '{medicine}'. "
            f"Explain what this medicine is for, how it works generally, and 3 safety tips. "
            f"Use simple language and keep it under 150 words."
        )
        completion = ai_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        explanation = completion.choices[0].message.content
        return {"explanation": explanation}
    except Exception as e:
        logger.error(f"Groq API Error: {str(e)}")
        return {"explanation": "AI service is currently busy. Please consult your doctor for details."}

@app.post("/ai/summarize-history")
async def summarize_history(patient_id: str = Body(..., embed=True)):
    """
    Fetches symptoms and prescriptions using direct SQL, and sends them to Groq for patient health summary.
    """
    try:
        symptoms = execute_query(
            "SELECT description, severity, occurrence_date FROM symptoms WHERE patient_id = %s ORDER BY occurrence_date DESC LIMIT 10",
            (patient_id,),
            fetch="all"
        )
        meds = execute_query(
            "SELECT medicine_name, dosage, frequency, duration FROM prescriptions WHERE patient_id = %s ORDER BY created_at DESC LIMIT 5",
            (patient_id,),
            fetch="all"
        )
        
        # Format list to be clean strings for AI consumption
        symptoms_list = [
            f"Symptom: {s['description']}, Severity: {s['severity']}/10, Date: {str(s['occurrence_date'])}"
            for s in symptoms
        ]
        meds_list = [
            f"Medicine: {m['medicine_name']}, Dosage: {m['dosage']}, Freq: {m['frequency']}, Duration: {m['duration']}"
            for m in meds
        ]
        
        context = f"History of recent symptoms:\n" + "\n".join(symptoms_list) + "\n\nRecent Prescriptions:\n" + "\n".join(meds_list)
        prompt = f"As a clinical analyst, provide a 3-sentence summary of the patient's current health status based on this data:\n\n{context}"
        
        completion = ai_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        summary_text = completion.choices[0].message.content
        return {"summary": summary_text}
    except Exception as e:
        logger.error(f"Summarization Error: {str(e)}")
        raise HTTPException(status_code=500, detail="AI Summarization failed.")

@app.post("/ai/scan-prescription")
async def scan_prescription(req: PrescriptionScanRequest):
    """
    Analyzes a base64-encoded prescription photo using Groq Vision (llama-3.2-11b-vision-preview).
    Returns side effects and a brief description per medicine identified.
    """
    try:
        import re as _re
        from groq import Groq as _Groq
        import os as _os
        import json as _json

        # Explicitly configure Groq client inside function context for container robustness
        groq_api_key = _os.environ.get("GROQ_API_KEY")
        local_client = _Groq(api_key=groq_api_key)

        # Strip data URI prefix if present (e.g. "data:image/jpeg;base64,...")
        raw_b64 = _re.sub(r'^data:image/[^;]+;base64,', '', req.image_base64)

        prompt = (
            "You are a clinical pharmacist AI. Analyze the prescription image provided. "
            "Identify all medicines or drugs listed. "
            "Important: This may be a German prescription containing patient name, address, and insurance number. "
            "OMIT all personal data, name, address, and insurance information entirely to protect privacy and save tokens. "
            "ONLY identify and analyze the actual prescribed medicines/drugs. "
            "For each medicine, output in this exact JSON format: "
            '{"medicines": [{"name": "...", "description": "one sentence description", "side_effects": ["...", "..."]}]}. '
            "Only list side effects. Do not give dosage advice. Keep language simple and patient-friendly. "
            "If you cannot read the image clearly, return an empty medicines array."
        )

        completion = local_client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{raw_b64}"
                            }
                        }
                    ]
                }
            ],
            response_format={"type": "json_object"}
        )

        text = completion.choices[0].message.content.strip()
        # Parse JSON
        result = _json.loads(text)

        # If patient_id is provided, automatically archive this scan in database history
        if req.patient_id and result.get("medicines"):
            try:
                # Save base64 preview only if it's within a reasonable size constraint to prevent DB bloat
                image_save = req.image_base64 if len(req.image_base64) < 500000 else "Image_Too_Large_To_Store"
                execute_query(
                    """
                    INSERT INTO prescription_scans (patient_id, image_url, medicines)
                    VALUES (%s, %s, %s)
                    """,
                    (req.patient_id, image_save, _json.dumps(result)),
                    fetch="none"
                )
                logger.info(f"Automatically archived AI prescription scan for patient: {req.patient_id}")
            except Exception as sql_err:
                logger.error(f"Failed to auto-archive scan: {str(sql_err)}")

        return result

    except Exception as e:
        logger.error(f"Prescription Scan Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI scan failed: {str(e)}")


@app.get("/ai/scans/patient/{patient_id}")
async def get_patient_scans(patient_id: str):
    """
    Fetches all saved AI prescription scans for a patient using manual SQL.
    """
    try:
        res = execute_query(
            "SELECT * FROM prescription_scans WHERE patient_id = %s ORDER BY scanned_at DESC",
            (patient_id,),
            fetch="all"
        )
        import json as _json
        for row in res:
            row["id"] = str(row["id"])
            row["patient_id"] = str(row["patient_id"])
            if row.get("scanned_at"):
                row["scanned_at"] = str(row["scanned_at"])
            
            # row["medicines"] is a dict if psycopg2 parsed it, or a JSON string
            if isinstance(row.get("medicines"), str):
                row["medicines"] = _json.loads(row["medicines"])
        return res
    except Exception as e:
        logger.error(f"Fetch Scans Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Could not retrieve past prescription scans.")


@app.delete("/ai/scans/{scan_id}")
async def delete_scan(scan_id: str):
    """
    Deletes an AI prescription scan from history.
    """
    try:
        res = execute_query(
            "DELETE FROM prescription_scans WHERE id = %s RETURNING id",
            (scan_id,),
            fetch="one"
        )
        if not res:
            raise HTTPException(status_code=404, detail="Scan not found.")
        return {"status": "deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete Scan Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Could not delete scan record.")


# --- PATIENT PROFILE ENDPOINTS ---

@app.get("/patients/{patient_id}")
async def get_patient_profile(patient_id: str):
    """
    Retrieves patient's profile details including their assigned doctor's information.
    """
    try:
        # Perform query joining doctor details
        profile = execute_query(
            """
            SELECT p.id, p.email, p.first_name, p.last_name, p.age, p.phone_number, p.address, p.avatar_url, p.doctor_id,
                   d.first_name as doctor_first_name, d.last_name as doctor_last_name, d.email as doctor_email, d.doctor_code
            FROM patients p
            LEFT JOIN doctors d ON p.doctor_id = d.id
            WHERE p.id = %s
            """,
            (patient_id,),
            fetch="one"
        )
        if not profile:
            raise HTTPException(status_code=404, detail="Patient profile not found.")
        
        # Serialize fields for consistency
        profile["id"] = str(profile["id"])
        profile["doctor_id"] = str(profile["doctor_id"]) if profile.get("doctor_id") else None
        profile["full_name"] = f"{profile.get('first_name') or ''} {profile.get('last_name') or ''}".strip()
        if profile.get("doctor_first_name") or profile.get("doctor_last_name"):
            profile["doctor_name"] = f"Dr. {profile.get('doctor_first_name') or ''} {profile.get('doctor_last_name') or ''}".strip()
        else:
            profile["doctor_name"] = "No Doctor Assigned"
            
        return profile
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Fetch Patient Profile Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Could not retrieve patient profile.")

@app.put("/patients/{patient_id}")
async def update_patient_profile(patient_id: str, profile_update: PatientProfileUpdate):
    """
    Updates the patient's editable profile information.
    """
    try:
        res = execute_query(
            """
            UPDATE patients
            SET first_name = %s, last_name = %s, phone_number = %s, age = %s, address = %s, avatar_url = %s
            WHERE id = %s
            RETURNING *
            """,
            (
                profile_update.first_name,
                profile_update.last_name,
                profile_update.phone_number,
                profile_update.age,
                profile_update.address,
                profile_update.avatar_url,
                patient_id
            ),
            fetch="one"
        )
        if not res:
            raise HTTPException(status_code=404, detail="Patient profile not found.")
            
        # Serialize returned fields
        res["id"] = str(res["id"])
        res["doctor_id"] = str(res["doctor_id"]) if res.get("doctor_id") else None
        res["full_name"] = f"{res.get('first_name') or ''} {res.get('last_name') or ''}".strip()
        return {"status": "success", "message": "Profile updated", "data": res}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update Patient Profile Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update profile.")



# --- DOCTOR PROFILE ENDPOINTS ---

@app.get("/doctors/{doctor_id}")
async def get_doctor_profile(doctor_id: str):
    """
    Retrieves doctor's profile details.
    """
    try:
        # Automatically ensure avatar_url column exists in doctors table
        try:
            execute_query("ALTER TABLE doctors ADD COLUMN IF NOT EXISTS avatar_url TEXT", fetch="none")
        except Exception:
            pass

        profile = execute_query(
            """
            SELECT id, email, first_name, last_name, age, phone_number, doctor_code, avatar_url
            FROM doctors
            WHERE id = %s
            """,
            (doctor_id,),
            fetch="one"
        )
        if not profile:
            raise HTTPException(status_code=404, detail="Doctor profile not found.")
        
        # Serialize fields for consistency
        profile["id"] = str(profile["id"])
        profile["full_name"] = f"Dr. {profile.get('first_name') or ''} {profile.get('last_name') or ''}".strip()
        return profile
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Fetch Doctor Profile Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Could not retrieve doctor profile.")

@app.put("/doctors/{doctor_id}")
async def update_doctor_profile(doctor_id: str, profile_update: DoctorProfileUpdate):
    """
    Updates the doctor's editable profile information.
    """
    try:
        res = execute_query(
            """
            UPDATE doctors
            SET first_name = %s, last_name = %s, phone_number = %s, age = %s, avatar_url = %s
            WHERE id = %s
            RETURNING *
            """,
            (
                profile_update.first_name,
                profile_update.last_name,
                profile_update.phone_number,
                profile_update.age,
                profile_update.avatar_url,
                doctor_id
            ),
            fetch="one"
        )
        if not res:
            raise HTTPException(status_code=404, detail="Doctor profile not found.")
            
        # Serialize returned fields
        res["id"] = str(res["id"])
        res["full_name"] = f"Dr. {res.get('first_name') or ''} {res.get('last_name') or ''}".strip()
        return {"status": "success", "message": "Profile updated", "data": res}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update Doctor Profile Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update profile.")


# --- MEDICAL REPORTS ENDPOINTS ---

@app.get("/reports/patient/{patient_id}")
async def get_patient_reports(patient_id: str):
    """
    Fetches all medical reports for a given patient.
    """
    try:
        res = execute_query(
            "SELECT * FROM reports WHERE patient_id = %s ORDER BY upload_date DESC",
            (patient_id,),
            fetch="all"
        )
        for row in res:
            row["id"] = str(row["id"])
            row["patient_id"] = str(row["patient_id"])
            row["doctor_id"] = str(row["doctor_id"]) if row.get("doctor_id") else None
            if row.get("upload_date"):
                row["upload_date"] = str(row["upload_date"])
        return res
    except Exception as e:
        logger.error(f"Fetch Reports Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Could not retrieve reports.")

@app.post("/reports/save", status_code=201)
async def save_report(report: ReportSaveRequest):
    """
    Saves a diagnostic medical report record using direct SQL.
    """
    try:
        # Check patient
        pat = execute_query("SELECT doctor_id FROM patients WHERE id = %s", (report.patient_id,), fetch="one")
        if not pat:
            raise HTTPException(status_code=404, detail="Patient not found.")
            
        new_id = str(uuid.uuid4())
        res = execute_query(
            """
            INSERT INTO reports (id, patient_id, doctor_id, file_name, file_url, file_type)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (new_id, report.patient_id, str(pat["doctor_id"]) if pat.get("doctor_id") else None, report.file_name, report.file_url, report.file_type),
            fetch="one"
        )
        if not res:
            raise HTTPException(status_code=500, detail="Failed to save report.")
            
        res["id"] = str(res["id"])
        res["patient_id"] = str(res["patient_id"])
        res["doctor_id"] = str(res["doctor_id"]) if res.get("doctor_id") else None
        if res.get("upload_date"):
            res["upload_date"] = str(res["upload_date"])
            
        return {"status": "success", "message": "Report uploaded", "data": res}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Save Report Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.delete("/reports/{report_id}")
async def delete_report(report_id: str):
    """
    Deletes a report by ID.
    """
    try:
        res = execute_query("DELETE FROM reports WHERE id = %s RETURNING id", (report_id,), fetch="one")
        if not res:
            raise HTTPException(status_code=404, detail="Report not found.")
        return {"status": "deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete Report Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Could not delete report.")


@app.post("/patients/{patient_id}/connect-doctor")
async def connect_doctor(patient_id: str, doctor_code: str = Body(..., embed=True)):
    """
    Connects a patient to a doctor using doctor code.
    """
    try:
        # Find doctor
        doc = execute_query("SELECT id, first_name, last_name FROM doctors WHERE doctor_code = %s", (doctor_code.strip().upper(),), fetch="one")
        if not doc:
            raise HTTPException(status_code=404, detail="Invalid Doctor Code.")
            
        # Update patient
        res = execute_query("UPDATE patients SET doctor_id = %s WHERE id = %s RETURNING *", (str(doc["id"]), patient_id), fetch="one")
        if not res:
            raise HTTPException(status_code=404, detail="Patient profile not found.")
            
        doc_name = f"Dr. {doc['first_name'] or ''} {doc['last_name'] or ''}".strip()
        return {"status": "success", "message": f"Connected to {doc_name}", "doctor_id": str(doc["id"]), "doctor_name": doc_name}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Connect Doctor Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to connect to doctor.")


@app.get("/patients/{patient_id}/settings")
async def get_patient_settings(patient_id: str):
    try:
        res = execute_query("SELECT alerts_enabled FROM user_settings WHERE user_id = %s", (patient_id,), fetch="one")
        if not res:
            # Insert default settings if not exists
            execute_query("INSERT INTO user_settings (user_id, alerts_enabled) VALUES (%s, TRUE)", (patient_id,), fetch="none")
            return {"alerts_enabled": True}
        return res
    except Exception as e:
        logger.error(f"Get Settings Error: {str(e)}")
        return {"alerts_enabled": True}


@app.put("/patients/{patient_id}/settings")
async def update_patient_settings(patient_id: str, alerts_enabled: bool = Body(..., embed=True)):
    try:
        execute_query(
            """
            INSERT INTO user_settings (user_id, alerts_enabled, updated_at)
            VALUES (%s, %s, NOW())
            ON CONFLICT (user_id) DO UPDATE SET alerts_enabled = EXCLUDED.alerts_enabled, updated_at = NOW()
            """,
            (patient_id, alerts_enabled),
            fetch="none"
        )
        return {"status": "success", "alerts_enabled": alerts_enabled}
    except Exception as e:
        logger.error(f"Update Settings Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to save settings.")


# --- ALERTS / DOCTOR COMMENT SYSTEM ---

def ensure_alerts_table():
    """Auto-creates the alerts table if it doesn't exist yet."""
    try:
        execute_query(
            """
            CREATE TABLE IF NOT EXISTS alerts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
                symptom_id UUID REFERENCES symptoms(id) ON DELETE SET NULL,
                message TEXT NOT NULL,
                severity INTEGER,
                doctor_comment TEXT,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT NOW(),
                replied_at TIMESTAMP
            )
            """,
            fetch="none"
        )
    except Exception as e:
        logger.warning(f"Could not ensure alerts table: {str(e)}")

ensure_alerts_table()

@app.post("/alerts", status_code=201)
async def create_alert(alert: AlertCreate):
    """Patient sends an alert (with optional linked symptom) to their doctor."""
    try:
        ensure_alerts_table()
        new_id = str(uuid.uuid4())
        data = execute_query(
            """
            INSERT INTO alerts (id, patient_id, symptom_id, message, severity)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING *
            """,
            (new_id, alert.patient_id, alert.symptom_id, alert.message, alert.severity),
            fetch="one"
        )
        if not data:
            raise HTTPException(status_code=500, detail="Failed to create alert.")
        data["id"] = str(data["id"])
        data["patient_id"] = str(data["patient_id"])
        if data.get("symptom_id"): data["symptom_id"] = str(data["symptom_id"])
        if data.get("created_at"): data["created_at"] = str(data["created_at"])
        return {"status": "success", "data": data}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create Alert Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Alert error: {str(e)}")


@app.get("/alerts/doctor/{doctor_id}")
async def get_doctor_alerts(doctor_id: str):
    """Returns all alerts for patients under a given doctor, newest first."""
    try:
        ensure_alerts_table()
        res = execute_query(
            """
            SELECT a.*, p.first_name, p.last_name, p.email as patient_email,
                   s.description as symptom_description
            FROM alerts a
            JOIN patients p ON a.patient_id = p.id
            LEFT JOIN symptoms s ON a.symptom_id = s.id
            WHERE p.doctor_id = %s
            ORDER BY a.created_at DESC
            """,
            (doctor_id,),
            fetch="all"
        )
        for row in res:
            row["id"] = str(row["id"])
            row["patient_id"] = str(row["patient_id"])
            if row.get("symptom_id"): row["symptom_id"] = str(row["symptom_id"])
            if row.get("created_at"): row["created_at"] = str(row["created_at"])
            if row.get("replied_at"): row["replied_at"] = str(row["replied_at"])
            row["patient_name"] = f"{row.get('first_name') or ''} {row.get('last_name') or ''}".strip()
        return res
    except Exception as e:
        logger.error(f"Get Doctor Alerts Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Could not retrieve alerts.")


@app.put("/alerts/{alert_id}/comment")
async def reply_to_alert(alert_id: str, body: AlertComment):
    """Doctor replies with a comment to a patient's alert."""
    try:
        ensure_alerts_table()
        res = execute_query(
            """
            UPDATE alerts
            SET doctor_comment = %s, is_read = TRUE, replied_at = NOW()
            WHERE id = %s
            RETURNING *
            """,
            (body.comment, alert_id),
            fetch="one"
        )
        if not res:
            raise HTTPException(status_code=404, detail="Alert not found.")
        res["id"] = str(res["id"])
        res["patient_id"] = str(res["patient_id"])
        if res.get("symptom_id"): res["symptom_id"] = str(res["symptom_id"])
        if res.get("created_at"): res["created_at"] = str(res["created_at"])
        if res.get("replied_at"): res["replied_at"] = str(res["replied_at"])
        return {"status": "success", "data": res}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reply Alert Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Comment error: {str(e)}")


@app.get("/alerts/patient/{patient_id}")
async def get_patient_alerts(patient_id: str):
    """Returns all alerts (with doctor comments) for a given patient."""
    try:
        ensure_alerts_table()
        res = execute_query(
            """
            SELECT a.*, s.description as symptom_description
            FROM alerts a
            LEFT JOIN symptoms s ON a.symptom_id = s.id
            WHERE a.patient_id = %s
            ORDER BY a.created_at DESC
            """,
            (patient_id,),
            fetch="all"
        )
        for row in res:
            row["id"] = str(row["id"])
            row["patient_id"] = str(row["patient_id"])
            if row.get("symptom_id"): row["symptom_id"] = str(row["symptom_id"])
            if row.get("created_at"): row["created_at"] = str(row["created_at"])
            if row.get("replied_at"): row["replied_at"] = str(row["replied_at"])
        return res
    except Exception as e:
        logger.error(f"Get Patient Alerts Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Could not retrieve alerts.")


@app.put("/symptoms/{symptom_id}")
async def update_symptom(symptom_id: str, symptom: SymptomCreate):
    """Updates an existing symptom record."""
    try:
        res = execute_query(
            """
            UPDATE symptoms SET
                description = %s, severity = %s, duration = %s, location = %s,
                occurrence_date = %s, notes = %s, blood_sugar = %s,
                meal_info = %s, medication_taken = %s, image_url = %s
            WHERE id = %s
            RETURNING *
            """,
            (
                symptom.description, symptom.severity, symptom.duration, symptom.location,
                symptom.occurrence_date, symptom.notes, symptom.blood_sugar,
                symptom.meal_info, symptom.medication_taken, symptom.image_url,
                symptom_id
            ),
            fetch="one"
        )
        if not res:
            raise HTTPException(status_code=404, detail="Symptom not found.")
        res["id"] = str(res["id"])
        res["patient_id"] = str(res["patient_id"])
        if res.get("occurrence_date"): res["occurrence_date"] = str(res["occurrence_date"])
        if res.get("created_at"): res["created_at"] = str(res["created_at"])
        return {"status": "success", "data": res}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update Symptom Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Update error: {str(e)}")


# --- SYSTEM MONITORING ---

@app.get("/health")
def health_check():
    """
    Returns the current status of the API and external service connectivity.
    """
    return {
        "status": "operational",
        "api_version": "2.1.0",
        "timestamp": datetime.datetime.now().isoformat(),
        "ai_status": "connected" if os.environ.get("GROQ_API_KEY") else "disconnected",
        "server_region": "local-main"
    }

@app.get("/debug/info")
def debug_info():
    """
    Internal endpoint to verify environment setup.
    """
    return {
        "os_env": os.name,
        "logging_level": "INFO",
        "cors_origins": "*",
        "pydantic_version": "2.x"
    }

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting Mini EHR API on http://0.0.0.0:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")