from pydantic import BaseModel, EmailStr
from typing import Optional

class UserSignup(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    age: int
    phone_number: str
    role: str  # "doctor" or "patient"
    doctor_code: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    role: str

class SymptomCreate(BaseModel):
    """
    Model for recording a new patient symptom entry.
    """
    patient_id: str
    description: str
    severity: int
    duration: Optional[str] = None
    location: Optional[str] = None
    associated_symptoms: Optional[str] = None
    occurrence_date: Optional[str] = None

class PrescriptionCreate(BaseModel):
    """
    Model for issuing a new patient prescription.
    """
    patient_id: str
    doctor_id: str
    medicine_name: str
    dosage: str
    frequency: str
    duration: str
    instructions: Optional[str] = None
