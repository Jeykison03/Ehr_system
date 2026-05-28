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
from model import UserSignup, UserLogin, SymptomCreate, PrescriptionCreate, PrescriptionScanRequest
import google.generativeai as genai

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
    GEMINI_KEY = os.environ.get("GEMINI_API_KEY")
    if not GEMINI_KEY:
        logger.warning("GEMINI_API_KEY not found in environment variables.")
    genai.configure(api_key=GEMINI_KEY)
    ai_model = genai.GenerativeModel('gemini-pro')
    logger.info("Generative AI Model initialized successfully.")
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
    Consults Gemini to explain a medicine to a patient.
    """
    try:
        prompt = (
            f"You are a helpful medical assistant. A patient is prescribed '{medicine}'. "
            f"Explain what this medicine is for, how it works generally, and 3 safety tips. "
            f"Use simple language and keep it under 150 words."
        )
        response = ai_model.generate_content(prompt)
        return {"explanation": response.text}
    except Exception as e:
        logger.error(f"Gemini API Error: {str(e)}")
        return {"explanation": "AI service is currently busy. Please consult your doctor for details."}

@app.post("/ai/summarize-history")
async def summarize_history(patient_id: str = Body(..., embed=True)):
    """
    Fetches symptoms and prescriptions using direct SQL, and sends them to Gemini for patient health summary.
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
        
        response = ai_model.generate_content(prompt)
        return {"summary": response.text}
    except Exception as e:
        logger.error(f"Summarization Error: {str(e)}")
        raise HTTPException(status_code=500, detail="AI Summarization failed.")

@app.post("/ai/scan-prescription")
async def scan_prescription(req: PrescriptionScanRequest):
    """
    Analyzes a base64-encoded prescription photo using Gemini Vision (gemini-1.5-flash).
    Returns side effects and a brief description per medicine identified.
    """
    try:
        import re as _re
        import base64 as _base64
        import google.generativeai as _genai

        # Strip data URI prefix if present (e.g. "data:image/jpeg;base64,...")
        raw_b64 = _re.sub(r'^data:image/[^;]+;base64,', '', req.image_base64)
        image_bytes = _base64.b64decode(raw_b64)

        vision_model = _genai.GenerativeModel('gemini-1.5-flash')

        prompt = (
            "You are a clinical pharmacist AI. Analyze the prescription image provided. "
            "Identify all medicines or drugs listed. "
            "For each medicine, output in this exact JSON format: "
            '{"medicines": [{"name": "...", "description": "one sentence description", "side_effects": ["...", "..."]}]}. '
            "Only list side effects. Do not give dosage advice. Keep language simple and patient-friendly. "
            "If you cannot read the image clearly, return an empty medicines array."
        )

        image_part = {"mime_type": "image/jpeg", "data": image_bytes}
        response = vision_model.generate_content([prompt, image_part])

        # Try to parse JSON from the response
        import json as _json
        text = response.text.strip()
        # Extract JSON block if wrapped in markdown
        json_match = _re.search(r'\{[\s\S]*\}', text)
        if json_match:
            result = _json.loads(json_match.group())
        else:
            result = {"medicines": []}

        return result

    except Exception as e:
        logger.error(f"Prescription Scan Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI scan failed: {str(e)}")


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
        "ai_status": "connected" if GEMINI_KEY else "disconnected",
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