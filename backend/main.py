from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from pydantic import BaseModel
import os
import bcrypt
import base64
from database import get_supabase
import google.generativeai as genai

app = FastAPI(title="Mini EHR API")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# AI Setup
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-pro')

# Models
class UserSignup(BaseModel):
    email: str
    password: str
    full_name: str
    role: str

class UserLogin(BaseModel):
    email: str
    password: str

class SymptomCreate(BaseModel):
    description: str
    severity: int
    occurrence_date: Optional[str] = None

class PrescriptionCreate(BaseModel):
    patient_id: str
    medicine_name: str
    dosage: str
    frequency: str
    duration: str
    instructions: Optional[str] = None

# Helper functions
def hash_password(password: str) -> str:
    return base64.b64encode(bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), base64.b64decode(hashed.encode('utf-8')))

@app.get("/")
def read_root():
    return {"message": "Welcome to Mini EHR API"}

# Auth Endpoints
@app.post("/auth/signup")
async def signup(user: UserSignup):
    supabase = get_supabase()
    hashed = hash_password(user.password)
    
    try:
        response = supabase.table("profiles").insert({
            "email": user.email,
            "password": hashed,
            "full_name": user.full_name,
            "role": user.role
        }).execute()
        
        if len(response.data) == 0:
            raise HTTPException(status_code=400, detail="Signup failed")
            
        return response.data[0]
    except Exception as e:
        if "duplicate key" in str(e):
            raise HTTPException(status_code=400, detail="Email already registered")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/auth/login")
async def login(user: UserLogin):
    supabase = get_supabase()
    
    try:
        response = supabase.table("profiles").select("*").eq("email", user.email).execute()
        
        if len(response.data) == 0:
            raise HTTPException(status_code=401, detail="Invalid email or password")
            
        db_user = response.data[0]
        if not verify_password(user.password, db_user['password']):
            raise HTTPException(status_code=401, detail="Invalid email or password")
            
        # Don't return the password to the frontend
        del db_user['password']
        return db_user
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# AI Endpoints
@app.post("/ai/explain-medicine")
async def explain_medicine(medicine: str):
    try:
        prompt = f"Explain the medicine '{medicine}' in very simple language for a patient. Include common uses and general advice. Keep it concise."
        response = model.generate_content(prompt)
        return {"explanation": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ai/summarize-history")
async def summarize_history(patient_id: str):
    supabase = get_supabase()
    # Fetch symptoms and prescriptions
    symptoms = supabase.table("symptoms").select("*").eq("patient_id", patient_id).execute()
    prescriptions = supabase.table("prescriptions").select("*").eq("patient_id", patient_id).execute()
    
    history_text = f"Symptoms: {symptoms.data}\nPrescriptions: {prescriptions.data}"
    
    try:
        prompt = f"Summarize the following patient medical history in simple terms for the patient: {history_text}"
        response = model.generate_content(prompt)
        return {"summary": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Alert Logic
@app.get("/alerts/{patient_id}")
async def check_alerts(patient_id: str):
    supabase = get_supabase()
    response = supabase.table("symptoms").select("*").eq("patient_id", patient_id).order("occurrence_date", desc=True).limit(5).execute()
    symptoms = response.data
    
    alerts = []
    fever_count = 0
    for s in symptoms:
        if "fever" in s['description'].lower() and s['severity'] > 7:
            fever_count += 1
            
    if fever_count >= 3:
        alerts.append({
            "type": "warning",
            "message": "High fever detected for 3 consecutive entries. Please consult a doctor immediately.",
            "code": "persistent_fever"
        })
        
    return {"alerts": alerts}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
