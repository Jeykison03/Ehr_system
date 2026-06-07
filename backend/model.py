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
    Required: patient_id, description, occurrence_date
    Everything else is optional.
    """
    patient_id: str
    description: str
    severity: Optional[int] = 5
    duration: Optional[str] = None
    location: Optional[str] = None
    associated_symptoms: Optional[str] = None
    occurrence_date: str  # required — ISO date string
    # New extended check-in fields
    notes: Optional[str] = None
    blood_sugar: Optional[float] = None
    meal_info: Optional[str] = None
    medication_taken: Optional[str] = None  # "yes" | "no" | "partial"
    image_url: Optional[str] = None         # base64 data URI

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

class PrescriptionScanRequest(BaseModel):
    """
    Model for AI prescription image analysis.
    """
    image_base64: str  # base64-encoded image string (data URI or raw base64)
    patient_id: Optional[str] = None  # optional patient ID to log scan history

class PatientProfileUpdate(BaseModel):
    first_name: str
    last_name: str
    phone_number: str
    age: int
    address: Optional[str] = None
    avatar_url: Optional[str] = None

class DoctorProfileUpdate(BaseModel):
    first_name: str
    last_name: str
    phone_number: str
    age: int
    avatar_url: Optional[str] = None

class ReportSaveRequest(BaseModel):
    patient_id: str
    file_name: str
    file_url: str
    file_type: str

class AlertCreate(BaseModel):
    patient_id: str
    symptom_id: Optional[str] = None
    message: str  # short message from patient to doctor
    severity: Optional[int] = None

class AlertComment(BaseModel):
    comment: str  # doctor's reply text

class EmailOTPRequest(BaseModel):
    email: EmailStr

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr
    role: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

