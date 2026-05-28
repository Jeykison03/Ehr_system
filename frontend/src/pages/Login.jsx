import React, { useState } from 'react';
import { 
  Stethoscope, 
  LogIn, 
  User, 
  Calendar, 
  Phone, 
  ShieldCheck, 
  Activity, 
  ChevronRight, 
  ChevronLeft, 
  UserPlus, 
  Mail, 
  Lock,
  Heart,
  FileText
} from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  
  // New profile fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState('patient');
  const [doctorCode, setDoctorCode] = useState('');
  
  // Wizard flow state
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [createdDoctorCode, setCreatedDoctorCode] = useState(null);
  const [animationClass, setAnimationClass] = useState('slide-in');

  const API_URL = "http://localhost:8000";

  const toggleMode = () => {
    setIsRegistering((prev) => !prev);
    setError(null);
    setCreatedDoctorCode(null);
    setDoctorCode('');
    setRole('patient');
    setStep(1);
    setFirstName('');
    setLastName('');
    setAge('');
    setPhoneNumber('');
    setEmail('');
    setPassword('');
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    setError(null);

    // Validate fields per step before advancing
    if (step === 1) {
      if (!firstName.trim() || !lastName.trim()) {
        setError('Please enter your first name and last name.');
        return;
      }
    } else if (step === 2) {
      if (!age || parseInt(age) <= 0) {
        setError('Please enter a valid age.');
        return;
      }
    } else if (step === 3) {
      if (!phoneNumber.trim()) {
        setError('Please enter your phone number.');
        return;
      }
      if (!doctorCode.trim()) {
        setError(role === 'doctor' ? 'Please set your custom Doctor ID.' : 'Please enter your Doctor\'s ID.');
        return;
      }
    }

    setAnimationClass('');
    setTimeout(() => {
      setStep((prev) => prev + 1);
      setAnimationClass('slide-in');
    }, 50);
  };

  const handlePrevStep = () => {
    setError(null);
    setAnimationClass('');
    setTimeout(() => {
      setStep((prev) => prev - 1);
      setAnimationClass('slide-in');
    }, 50);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const endpoint = isRegistering ? `${API_URL}/auth/signup` : `${API_URL}/auth/login`;
    
    // Prepare exact payload matching the backend refactors
    const payload = isRegistering 
      ? { 
          email: email.trim(), 
          password, 
          first_name: firstName.trim(), 
          last_name: lastName.trim(),
          age: parseInt(age),
          phone_number: phoneNumber.trim(),
          role, 
          doctor_code: doctorCode.trim().toUpperCase() 
        }
      : { 
          email: email.trim(), 
          password, 
          role 
        };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }

      if (isRegistering) {
        // Registration success
        if (role === 'doctor') {
          setCreatedDoctorCode(data.data.doctor_code);
          setError(null);
          // Don't auto-redirect immediately, let doctor see their generated code
          setTimeout(() => {
            toggleMode();
          }, 6000);
        } else {
          toggleMode();
        }
      } else {
        // Login success, save session profile (including combined full_name)
        localStorage.setItem('user', JSON.stringify(data));
        window.location.href = '/';
      }
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* LEFT COLUMN: BRAND HERO BANNER (Desktop Only) */}
      <div className="visual-column">
        <div className="glow-spot-1"></div>
        <div className="glow-spot-2"></div>
        
        <div className="visual-header">
          <div className="brand-logo">
            <Stethoscope size={32} className="logo-icon" />
            <span className="brand-name">CareMed</span>
            <span className="brand-badge">EHR</span>
          </div>
        </div>

        <div className="visual-body">
          <h1>Orchestrating Clinical Excellence.</h1>
          <p className="subtitle">
            Secure, direct-SQL powered electronic health record network bridging patient symptoms and physician diagnoses instantly.
          </p>

          {/* Floating Glassmorphic Highlight Cards */}
          <div className="highlight-cards">
            <div className="highlight-card">
              <div className="card-icon-wrapper success">
                <ShieldCheck size={20} />
              </div>
              <div className="card-content">
                <h4>HIPAA Compliant Security</h4>
                <p>Direct Postgres connection protocols bypass legals and secure health records.</p>
              </div>
            </div>

            <div className="highlight-card">
              <div className="card-icon-wrapper accent">
                <Activity size={20} />
              </div>
              <div className="card-content">
                <h4>Low-latency SQL Architecture</h4>
                <p>No high-level abstractions or API gates, providing maximum database throughput.</p>
              </div>
            </div>

            <div className="highlight-card">
              <div className="card-icon-wrapper primary">
                <Heart size={20} />
              </div>
              <div className="card-content">
                <h4>Clinical AI Integration</h4>
                <p>Instant patient medical histories synthesized by deep-learning models.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="visual-footer">
          <p>© 2026 CareMed EHR Network. All health records encrypted end-to-end.</p>
        </div>
      </div>

      {/* RIGHT COLUMN: SECURE AUTHENTICATION CARD WIZARD */}
      <div className="form-column">
        <div className="auth-card">
          <div className="auth-header">
            <h2>{isRegistering ? 'Register Profile' : 'Secure Sign In'}</h2>
            <p>
              {isRegistering 
                ? `Step ${step} of 4: Setup your medical profile` 
                : 'Access clinical systems using secure credentials'}
            </p>
          </div>

          {/* REGISTER FLOW WIZARD STEP INDICATOR */}
          {isRegistering && (
            <div className="steps-bar">
              <div className="steps-line"></div>
              <div 
                className="steps-line-active" 
                style={{ width: `${((step - 1) / 3) * 100}%` }}
              ></div>
              <div className={`step-dot ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>1</div>
              <div className={`step-dot ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>2</div>
              <div className={`step-dot ${step >= 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}>3</div>
              <div className={`step-dot ${step >= 4 ? 'active' : ''} ${step > 4 ? 'completed' : ''}`}>4</div>
            </div>
          )}

          {/* AUTHENTICATION FORM CONTAINER */}
          <form onSubmit={step === 4 || !isRegistering ? handleAuth : handleNextStep} className={animationClass}>
            {error && <div className="error-alert">{error}</div>}
            
            {createdDoctorCode && (
              <div className="success-alert">
                Account created successfully! Your unique Doctor ID is: 
                <span className="doc-code-highlight">{createdDoctorCode}</span>.
                You will be redirected shortly.
              </div>
            )}

            {/* --- REGISTRATION WIZARD SLIDES --- */}
            {isRegistering ? (
              <>
                {/* STEP 1: IDENTITY */}
                {step === 1 && (
                  <div className="step-slide">
                    <h3 className="slide-title">Tell us who you are</h3>
                    <div className="form-group">
                      <label className="form-label">First Name</label>
                      <div className="input-with-icon">
                        <User className="input-icon" size={18} />
                        <input 
                          type="text" 
                          value={firstName} 
                          onChange={(e) => setFirstName(e.target.value)} 
                          required 
                          placeholder="e.g. John"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Last Name</label>
                      <div className="input-with-icon">
                        <User className="input-icon" size={18} />
                        <input 
                          type="text" 
                          value={lastName} 
                          onChange={(e) => setLastName(e.target.value)} 
                          required 
                          placeholder="e.g. Doe"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: PROFILE DETAILS */}
                {step === 2 && (
                  <div className="step-slide">
                    <h3 className="slide-title">Profile parameters</h3>
                    <div className="form-group">
                      <label className="form-label">Age</label>
                      <div className="input-with-icon">
                        <Calendar className="input-icon" size={18} />
                        <input 
                          type="number" 
                          value={age} 
                          onChange={(e) => setAge(e.target.value)} 
                          required 
                          placeholder="Years"
                          min="1"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Register as a</label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="custom-select"
                      >
                        <option value="patient">Patient Profile</option>
                        <option value="doctor">Doctor / Practitioner</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* STEP 3: CONTACT & CLINICAL LINK */}
                {step === 3 && (
                  <div className="step-slide">
                    <h3 className="slide-title">Verification & Linking</h3>
                    <div className="form-group">
                      <label className="form-label">Phone Number</label>
                      <div className="input-with-icon">
                        <Phone className="input-icon" size={18} />
                        <input 
                          type="tel" 
                          value={phoneNumber} 
                          onChange={(e) => setPhoneNumber(e.target.value)} 
                          required 
                          placeholder="+1 (555) 000-0000"
                        />
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">
                        {role === 'doctor' ? 'Create Doctor ID (e.g., DOC123) *' : 'Doctor ID Code *'}
                      </label>
                      <div className="input-with-icon">
                        <Stethoscope className="input-icon" size={18} />
                        <input
                          type="text"
                          value={doctorCode}
                          onChange={(e) => setDoctorCode(e.target.value)}
                          placeholder={role === 'doctor' ? "e.g. DOC778" : "e.g. DOC112"}
                          required
                        />
                      </div>
                      <div className="helper-text">
                        {role === 'doctor' 
                          ? 'Set a unique alphanumeric code that patients can use to link with you.' 
                          : 'Enter the unique ID code supplied by your attending physician.'}
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 4: CREDENTIALS */}
                {step === 4 && (
                  <div className="step-slide">
                    <h3 className="slide-title">Account Credentials</h3>
                    <div className="form-group">
                      <label className="form-label">Email Address</label>
                      <div className="input-with-icon">
                        <Mail className="input-icon" size={18} />
                        <input 
                          type="email" 
                          value={email} 
                          onChange={(e) => setEmail(e.target.value)} 
                          required 
                          placeholder="johndoe@clinical.com"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Password</label>
                      <div className="input-with-icon">
                        <Lock className="input-icon" size={18} />
                        <input 
                          type="password" 
                          value={password} 
                          onChange={(e) => setPassword(e.target.value)} 
                          required 
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* --- SECURE LOGIN VIEW --- */
              <>
                <div className="form-group">
                  <label className="form-label">Account System Role</label>
                  <select 
                    value={role} 
                    onChange={(e) => setRole(e.target.value)}
                    className="custom-select"
                  >
                    <option value="patient">Patient System</option>
                    <option value="doctor">Doctor Network</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <div className="input-with-icon">
                    <Mail className="input-icon" size={18} />
                    <input 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      required 
                      placeholder="name@example.com"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div className="input-with-icon">
                    <Lock className="input-icon" size={18} />
                    <input 
                      type="password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      required 
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </>
            )}

            {/* ACTION FOOTER BUTTONS */}
            <div className="form-actions">
              {isRegistering && step > 1 && (
                <button 
                  type="button" 
                  onClick={handlePrevStep} 
                  className="btn btn-outline flex-1"
                  disabled={loading}
                >
                  <ChevronLeft size={18} />
                  Back
                </button>
              )}

              <button 
                className="btn btn-primary flex-1 action-submit-btn" 
                type="submit" 
                disabled={loading}
              >
                {loading ? (
                  'Processing...'
                ) : isRegistering ? (
                  step === 4 ? (
                    <>Complete Signup <UserPlus size={18} /></>
                  ) : (
                    <>Continue <ChevronRight size={18} /></>
                  )
                ) : (
                  <>Sign In <LogIn size={18} /></>
                )}
              </button>
            </div>
          </form>

          {/* TOGGLE AUTH SYSTEM MODE */}
          <div className="auth-footer">
            <button className="btn-link" type="button" onClick={toggleMode} disabled={loading}>
              {isRegistering 
                ? 'Already have a clinical account? Sign In' 
                : 'Request a new clinical profile? Sign Up'}
            </button>
          </div>
        </div>
      </div>

      {/* --- PREMIUM COMPONENT STYLING --- */}
      <style jsx>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          background-color: #0b0f19;
          overflow: hidden;
          font-family: 'Inter', sans-serif;
        }

        /* --- VISUAL DISPLAY SIDEBAR (Left Column) --- */
        .visual-column {
          flex: 1.2;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 4.5rem;
          background: radial-gradient(circle at 10% 20%, #171c35 0%, #070913 100%);
          position: relative;
          overflow: hidden;
          border-right: 1px solid rgba(255, 255, 255, 0.03);
        }
        @media (max-width: 1024px) {
          .visual-column {
            display: none; /* Hide visual on tablet and phone */
          }
        }

        .glow-spot-1 {
          position: absolute;
          width: 450px;
          height: 450px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(37, 99, 235, 0.12) 0%, rgba(37, 99, 235, 0) 70%);
          filter: blur(60px);
          top: -10%;
          left: -10%;
        }

        .glow-spot-2 {
          position: absolute;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(14, 165, 233, 0.08) 0%, rgba(14, 165, 233, 0) 70%);
          filter: blur(80px);
          bottom: -15%;
          right: -10%;
        }

        .brand-logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          position: relative;
          z-index: 10;
        }

        .logo-icon {
          color: var(--accent);
          filter: drop-shadow(0 0 8px rgba(14, 165, 233, 0.5));
        }

        .brand-name {
          font-family: 'Outfit', sans-serif;
          font-weight: 700;
          font-size: 1.6rem;
          color: white;
          letter-spacing: -0.5px;
        }

        .brand-badge {
          background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
          color: white;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.2rem 0.5rem;
          border-radius: var(--radius-sm);
          letter-spacing: 0.5px;
        }

        .visual-body {
          position: relative;
          z-index: 10;
          max-width: 620px;
          margin: auto 0;
        }

        .visual-body h1 {
          font-family: 'Outfit', sans-serif;
          font-size: 3.2rem;
          font-weight: 700;
          line-height: 1.15;
          color: white;
          margin-bottom: 1.5rem;
          letter-spacing: -1.5px;
          background: linear-gradient(to right, #ffffff, #94a3b8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .subtitle {
          color: #94a3b8;
          font-size: 1.15rem;
          line-height: 1.6;
          margin-bottom: 3.5rem;
        }

        .highlight-cards {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .highlight-card {
          display: flex;
          gap: 1.25rem;
          align-items: flex-start;
          padding: 1.25rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: var(--radius-lg);
          backdrop-filter: blur(12px);
          transition: transform 0.2s, background 0.2s;
        }

        .highlight-card:hover {
          transform: translateX(4px);
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.08);
        }

        .card-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: var(--radius-md);
        }

        .card-icon-wrapper.success {
          background: rgba(16, 185, 129, 0.1);
          color: var(--success);
        }

        .card-icon-wrapper.accent {
          background: rgba(14, 165, 233, 0.1);
          color: var(--accent);
        }

        .card-icon-wrapper.primary {
          background: rgba(37, 99, 235, 0.1);
          color: var(--primary);
        }

        .card-content h4 {
          color: white;
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .card-content p {
          color: #64748b;
          font-size: 0.85rem;
          line-height: 1.4;
        }

        .visual-footer p {
          color: #475569;
          font-size: 0.85rem;
          position: relative;
          z-index: 10;
        }

        /* --- SECURE FORM COLUMN (Right Column) --- */
        .form-column {
          flex: 0.9;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          background-color: #070913;
          position: relative;
          overflow-y: auto;
        }
        @media (max-width: 640px) {
          .form-column {
            padding: 1.5rem;
          }
        }

        .auth-card {
          width: 100%;
          max-width: 460px;
          background: rgba(15, 23, 42, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: var(--radius-xl);
          padding: 3rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(20px);
        }
        @media (max-width: 480px) {
          .auth-card {
            padding: 1.75rem 1.5rem;
          }
        }

        .auth-header {
          margin-bottom: 2.25rem;
        }

        .auth-header h2 {
          color: white;
          font-size: 1.85rem;
          font-weight: 700;
          letter-spacing: -0.75px;
          margin-bottom: 0.5rem;
        }

        .auth-header p {
          color: #64748b;
          font-size: 0.9rem;
        }

        /* --- SIGNUP WIZARD PROGRESS BAR --- */
        .steps-bar {
          display: flex;
          justify-content: space-between;
          margin-bottom: 2.5rem;
          position: relative;
        }

        .steps-line {
          position: absolute;
          top: 15px;
          left: 0;
          right: 0;
          height: 2px;
          background: rgba(255, 255, 255, 0.05);
          z-index: 0;
        }

        .steps-line-active {
          position: absolute;
          top: 15px;
          left: 0;
          height: 2px;
          background: linear-gradient(95deg, var(--primary) 0%, var(--accent) 100%);
          z-index: 0;
          transition: width 0.35s ease;
        }

        .step-dot {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #0f172a;
          border: 2px solid rgba(255, 255, 255, 0.08);
          color: #475569;
          font-size: 0.85rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 10;
          transition: all 0.3s ease;
        }

        .step-dot.active {
          border-color: var(--accent);
          color: white;
          background: #172554;
          box-shadow: 0 0 12px rgba(14, 165, 233, 0.3);
        }

        .step-dot.completed {
          border-color: var(--success);
          background: var(--success);
          color: white;
        }

        /* --- SLIDE ANIMATIONS --- */
        .slide-in {
          animation: slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .slide-title {
          color: white;
          font-size: 1.15rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
          letter-spacing: -0.25px;
        }

        /* --- INPUT ELEMENT OVERRIDES --- */
        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-label {
          display: block;
          color: #94a3b8;
          font-size: 0.85rem;
          font-weight: 500;
          margin-bottom: 0.5rem;
        }

        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 1rem;
          color: #475569;
          pointer-events: none;
          transition: color 0.2s;
        }

        .input-with-icon input {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.75rem;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: white;
          font-size: 0.95rem;
          border-radius: var(--radius-md);
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .input-with-icon input:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15);
        }

        .input-with-icon input:focus + .input-icon {
          color: var(--accent);
        }

        .custom-select {
          background-color: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: white;
          font-size: 0.95rem;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-md);
          outline: none;
        }

        .custom-select:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15);
        }

        .helper-text {
          margin-top: 0.5rem;
          font-size: 0.75rem;
          color: #475569;
          line-height: 1.4;
        }

        /* --- ERRORS & ALERTS --- */
        .error-alert {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #fca5a5;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          margin-bottom: 1.5rem;
          line-height: 1.4;
        }

        .success-alert {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
          color: #a7f3d0;
          padding: 1rem;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }

        .doc-code-highlight {
          display: inline-block;
          margin: 0.25rem 0.5rem;
          padding: 0.2rem 0.6rem;
          background: #065f46;
          border: 1px solid #059669;
          border-radius: var(--radius-sm);
          font-weight: 700;
          color: white;
          font-family: monospace;
          font-size: 1rem;
        }

        /* --- BUTTONS & ACTIONS --- */
        .form-actions {
          display: flex;
          gap: 1rem;
          margin-top: 2.25rem;
        }

        .flex-1 {
          flex: 1;
        }

        .action-submit-btn {
          height: 48px;
        }

        .btn-outline {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #94a3b8;
          font-weight: 600;
        }

        .btn-outline:hover {
          background: rgba(255, 255, 255, 0.03);
          color: white;
          border-color: rgba(255, 255, 255, 0.15);
        }

        .btn-primary {
          background: linear-gradient(95deg, var(--primary) 0%, var(--accent) 100%);
          border: none;
          color: white;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
        }

        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4);
        }

        .auth-footer {
          margin-top: 1.75rem;
          text-align: center;
        }

        .btn-link {
          background: none;
          border: none;
          color: var(--accent);
          font-weight: 600;
          font-size: 0.85rem;
          transition: color 0.2s;
        }

        .btn-link:hover {
          color: white;
          text-decoration: none;
        }
      `}</style>
    </div>
  );
};

export default Login;