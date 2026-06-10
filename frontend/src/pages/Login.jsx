import React, { useState, useRef, useEffect } from 'react';
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
  FileText,
  CheckCircle,
  RefreshCw,
  Send,
  Eye,
  EyeOff
} from 'lucide-react';
import { API_BASE } from '../lib/config';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState('patient');
  const [doctorCode, setDoctorCode] = useState('');
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [createdDoctorCode, setCreatedDoctorCode] = useState(null);
  const [animationClass, setAnimationClass] = useState('slide-in');

  // Forgot password states
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetSending, setResetSending] = useState(false);

  // OTP state
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const otpRefs = useRef([]);

  const API_URL = API_BASE;

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const resetAll = () => {
    setIsRegistering(false);
    setIsForgotPassword(false);
    setResetSent(false);
    setResetSending(false);
    setShowPassword(false);
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
    setOtpDigits(['', '', '', '', '', '']);
    setShowSuccess(false);
    setAnimationClass('slide-in');
  };

  const toggleMode = () => {
    const nextRegistering = !isRegistering;
    resetAll();
    setIsRegistering(nextRegistering);
  };

  const goToStep = (targetStep) => {
    setAnimationClass('');
    setTimeout(() => {
      setStep(targetStep);
      setAnimationClass('slide-in');
    }, 50);
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    setError(null);

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
        setError(role === 'doctor' ? 'Please set your custom Doctor ID.' : "Please enter your Doctor's ID.");
        return;
      }
    }
    goToStep(step + 1);
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) { setError('Please enter your email address.'); return; }
    if (!password) { setError('Please enter a password.'); return; }

    setOtpSending(true);
    try {
      const res = await fetch(`${API_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to send verification code.');
      goToStep(5);
      setResendCooldown(60);
    } catch (err) {
      setError(err.message);
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    setError(null);

    const otpCode = otpDigits.join('');
    if (otpCode.length !== 6) {
      setError('Please enter all 6 digits of your verification code.');
      return;
    }

    setOtpVerifying(true);
    try {
      // Verify OTP
      const verifyRes = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp: otpCode })
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.detail || 'Verification failed.');

      // Register
      const signupRes = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          age: parseInt(age),
          phone_number: phoneNumber.trim(),
          role,
          doctor_code: doctorCode.trim().toUpperCase()
        })
      });
      const signupData = await signupRes.json();
      if (!signupRes.ok) throw new Error(signupData.detail || 'Registration failed.');

      if (role === 'doctor') setCreatedDoctorCode(signupData.data?.doctor_code);
      setShowSuccess(true);
      setTimeout(() => { resetAll(); }, 4000);

    } catch (err) {
      setError(err.message);
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    setError(null);
    setOtpSending(true);
    try {
      const res = await fetch(`${API_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to resend code.');
      setResendCooldown(60);
      setOtpDigits(['', '', '', '', '', '']);
    } catch (err) {
      setError(err.message);
    } finally {
      setOtpSending(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = value;
    setOtpDigits(newDigits);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) newDigits[i] = pasted[i];
    setOtpDigits(newDigits);
    otpRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, role })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Authentication failed');
      localStorage.setItem('user', JSON.stringify(data));
      window.location.href = '/';
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetLink = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setError(null);
    setResetSending(true);
    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to send reset link.');
      setResetSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setResetSending(false);
    }
  };

  const getSubmitHandler = () => {
    if (isForgotPassword) return handleSendResetLink;
    if (!isRegistering) return handleLogin;
    if (step === 4) return handleSendOTP;
    if (step === 5) return handleVerifyAndRegister;
    return handleNextStep;
  };

  const isBusy = loading || otpSending || otpVerifying || resetSending;
  const TOTAL_STEPS = 5;

  return (
    <div className="login-container">
      {/* LEFT COLUMN */}
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
          <div className="highlight-cards">
            <div className="highlight-card">
              <div className="card-icon-wrapper success"><ShieldCheck size={20} /></div>
              <div className="card-content">
                <h4>HIPAA Compliant Security</h4>
                <p>Direct Postgres connection protocols bypass legals and secure health records.</p>
              </div>
            </div>
            <div className="highlight-card">
              <div className="card-icon-wrapper accent"><Activity size={20} /></div>
              <div className="card-content">
                <h4>Low-latency SQL Architecture</h4>
                <p>No high-level abstractions or API gates, providing maximum database throughput.</p>
              </div>
            </div>
            <div className="highlight-card">
              <div className="card-icon-wrapper primary"><Heart size={20} /></div>
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

      {/* RIGHT COLUMN */}
      <div className="form-column">
        <div className="auth-card">

          {/* ===== SUCCESS SCREEN ===== */}
          {showSuccess ? (
            <div className="success-screen">
              <div className="success-icon-ring">
                <CheckCircle size={48} className="success-icon" />
              </div>
              <h2 className="success-title">Successfully Registered!</h2>
              <p className="success-subtitle">
                Welcome to CareMed EHR. Redirecting you to the login page…
              </p>
              {createdDoctorCode && (
                <div className="success-code-box">
                  <span className="success-code-label">Your Doctor ID</span>
                  <span className="success-doctor-code">{createdDoctorCode}</span>
                  <span className="success-code-note">Share this code with your patients</span>
                </div>
              )}
              <div className="success-redirect-bar">
                <div className="success-redirect-fill"></div>
              </div>
            </div>
          ) : (
            <>
              {/* HEADER */}
              <div className="auth-header">
                <h2>{isForgotPassword ? 'Reset Password' : isRegistering ? 'Register Profile' : 'Secure Sign In'}</h2>
                <p>
                  {isForgotPassword
                    ? 'Request a secure email verification reset link'
                    : isRegistering
                      ? step === 5
                        ? `Step ${step} of ${TOTAL_STEPS}: Verify your email`
                        : `Step ${step} of ${TOTAL_STEPS}: Setup your medical profile`
                      : 'Access clinical systems using secure credentials'}
                </p>
              </div>

              {/* STEP INDICATOR */}
              {isRegistering && (
                <div className="steps-bar">
                  <div className="steps-line"></div>
                  <div
                    className="steps-line-active"
                    style={{ width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%` }}
                  ></div>
                  {[1, 2, 3, 4, 5].map(s => (
                    <div key={s} className={`step-dot ${step >= s ? 'active' : ''} ${step > s ? 'completed' : ''}`}>
                      {s}
                    </div>
                  ))}
                </div>
              )}

              {/* FORM */}
              <form onSubmit={getSubmitHandler()} className={animationClass}>
                {error && <div className="error-alert">{error}</div>}

                {isRegistering ? (
                  <>
                    {/* STEP 1 */}
                    {step === 1 && (
                      <div className="step-slide">
                        <h3 className="slide-title">Tell us who you are</h3>
                        <div className="form-group">
                          <label className="form-label">First Name</label>
                          <div className="input-with-icon">
                            <User className="input-icon" size={18} />
                            <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} required placeholder="e.g. John" />
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Last Name</label>
                          <div className="input-with-icon">
                            <User className="input-icon" size={18} />
                            <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} required placeholder="e.g. Doe" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* STEP 2 */}
                    {step === 2 && (
                      <div className="step-slide">
                        <h3 className="slide-title">Profile parameters</h3>
                        <div className="form-group">
                          <label className="form-label">Age</label>
                          <div className="input-with-icon">
                            <Calendar className="input-icon" size={18} />
                            <input type="number" value={age} onChange={e => setAge(e.target.value)} required placeholder="Years" min="1" />
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Register as a</label>
                          <select value={role} onChange={e => setRole(e.target.value)} className="custom-select">
                            <option value="patient">Patient Profile</option>
                            <option value="doctor">Doctor / Practitioner</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {/* STEP 3 */}
                    {step === 3 && (
                      <div className="step-slide">
                        <h3 className="slide-title">Verification &amp; Linking</h3>
                        <div className="form-group">
                          <label className="form-label">Phone Number</label>
                          <div className="input-with-icon">
                            <Phone className="input-icon" size={18} />
                            <input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} required placeholder="+1 (555) 000-0000" />
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="form-label">
                            {role === 'doctor' ? 'Create Doctor ID (e.g., DOC123) *' : 'Doctor ID Code *'}
                          </label>
                          <div className="input-with-icon">
                            <Stethoscope className="input-icon" size={18} />
                            <input type="text" value={doctorCode} onChange={e => setDoctorCode(e.target.value)} placeholder={role === 'doctor' ? "e.g. DOC778" : "e.g. DOC112"} required />
                          </div>
                          <div className="helper-text">
                            {role === 'doctor'
                              ? 'Set a unique alphanumeric code that patients can use to link with you.'
                              : 'Enter the unique ID code supplied by your attending physician.'}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* STEP 4 */}
                    {step === 4 && (
                      <div className="step-slide">
                        <h3 className="slide-title">Account Credentials</h3>
                        <div className="form-group">
                          <label className="form-label">Email Address</label>
                          <div className="input-with-icon">
                            <Mail className="input-icon" size={18} />
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="johndoe@clinical.com" />
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Password</label>
                          <div className="input-with-icon">
                            <Lock className="input-icon" size={18} />
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
                          </div>
                        </div>
                        <div className="helper-text" style={{display:'flex', alignItems:'center', gap:'5px', marginTop:'-0.25rem'}}>
                          <Mail size={12} />
                          A 6-digit verification code will be sent to your email after this step.
                        </div>
                      </div>
                    )}

                    {/* STEP 5 — OTP */}
                    {step === 5 && (
                      <div className="step-slide">
                        <h3 className="slide-title">Verify Your Email</h3>
                        <div className="otp-email-hint">
                          <Mail size={15} />
                          <span>Code sent to <strong>{email}</strong></span>
                        </div>
                        <p className="otp-instruction">Enter the 6-digit code from your inbox:</p>

                        <div className="otp-boxes" onPaste={handleOtpPaste}>
                          {otpDigits.map((digit, i) => (
                            <input
                              key={i}
                              ref={el => (otpRefs.current[i] = el)}
                              type="text"
                              inputMode="numeric"
                              maxLength={1}
                              value={digit}
                              onChange={e => handleOtpChange(i, e.target.value)}
                              onKeyDown={e => handleOtpKeyDown(i, e)}
                              className={`otp-box${digit ? ' otp-filled' : ''}`}
                              autoFocus={i === 0}
                            />
                          ))}
                        </div>

                        <div className="otp-resend-row">
                          <span className="otp-resend-label">Didn't receive it?</span>
                          <button
                            type="button"
                            onClick={handleResendOTP}
                            disabled={resendCooldown > 0 || otpSending}
                            className="otp-resend-btn"
                          >
                            <RefreshCw size={13} />
                            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : isForgotPassword ? (
                  resetSent ? (
                    <div className="forgot-success-box">
                      <div className="success-glowing-border">
                        <Mail size={40} className="success-icon-pulse" />
                        <h3>Reset Link Sent!</h3>
                        <p>A password reset link has been successfully sent to <strong style={{ color: '#0ea5e9' }}>{email}</strong>. Please check your inbox.</p>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => {
                            setIsForgotPassword(false);
                            setResetSent(false);
                            setError(null);
                          }}
                          style={{ margin: '1rem auto 0', display: 'block' }}
                        >
                          Back to Sign In
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="form-group">
                        <label className="form-label">Account System Role</label>
                        <select value={role} onChange={e => setRole(e.target.value)} className="custom-select">
                          <option value="patient">Patient System</option>
                          <option value="doctor">Doctor Network</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <div className="input-with-icon">
                          <Mail className="input-icon" size={18} />
                          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="name@example.com" />
                        </div>
                      </div>
                    </>
                  )
                ) : isRegistering ? (
                  <>
                    {/* STEP 1 */}
                    {step === 1 && (
                      <div className="step-slide">
                        <h3 className="slide-title">Tell us who you are</h3>
                        <div className="form-group">
                          <label className="form-label">First Name</label>
                          <div className="input-with-icon">
                            <User className="input-icon" size={18} />
                            <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} required placeholder="e.g. John" />
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Last Name</label>
                          <div className="input-with-icon">
                            <User className="input-icon" size={18} />
                            <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} required placeholder="e.g. Doe" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* STEP 2 */}
                    {step === 2 && (
                      <div className="step-slide">
                        <h3 className="slide-title">Profile parameters</h3>
                        <div className="form-group">
                          <label className="form-label">Age</label>
                          <div className="input-with-icon">
                            <Calendar className="input-icon" size={18} />
                            <input type="number" value={age} onChange={e => setAge(e.target.value)} required placeholder="Years" min="1" />
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Register as a</label>
                          <select value={role} onChange={e => setRole(e.target.value)} className="custom-select">
                            <option value="patient">Patient Profile</option>
                            <option value="doctor">Doctor / Practitioner</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {/* STEP 3 */}
                    {step === 3 && (
                      <div className="step-slide">
                        <h3 className="slide-title">Verification &amp; Linking</h3>
                        <div className="form-group">
                          <label className="form-label">Phone Number</label>
                          <div className="input-with-icon">
                            <Phone className="input-icon" size={18} />
                            <input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} required placeholder="+1 (555) 000-0000" />
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="form-label">
                            {role === 'doctor' ? 'Create Doctor ID (e.g., DOC123) *' : 'Doctor ID Code *'}
                          </label>
                          <div className="input-with-icon">
                            <Stethoscope className="input-icon" size={18} />
                            <input type="text" value={doctorCode} onChange={e => setDoctorCode(e.target.value)} placeholder={role === 'doctor' ? "e.g. DOC778" : "e.g. DOC112"} required />
                          </div>
                          <div className="helper-text">
                            {role === 'doctor'
                              ? 'Set a unique alphanumeric code that patients can use to link with you.'
                              : 'Enter the unique ID code supplied by your attending physician.'}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* STEP 4 */}
                    {step === 4 && (
                      <div className="step-slide">
                        <h3 className="slide-title">Account Credentials</h3>
                        <div className="form-group">
                          <label className="form-label">Email Address</label>
                          <div className="input-with-icon">
                            <Mail className="input-icon" size={18} />
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="johndoe@clinical.com" />
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Password</label>
                          <div className="input-with-icon">
                            <Lock className="input-icon" size={18} />
                            <input 
                              type={showPassword ? "text" : "password"} 
                              value={password} 
                              onChange={e => setPassword(e.target.value)} 
                              required 
                              placeholder="••••••••" 
                            />
                            <button
                              type="button"
                              className="password-toggle-btn"
                              onClick={() => setShowPassword(!showPassword)}
                              tabIndex="-1"
                            >
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </div>
                        <div className="helper-text" style={{display:'flex', alignItems:'center', gap:'5px', marginTop:'-0.25rem'}}>
                          <Mail size={12} />
                          A 6-digit verification code will be sent to your email after this step.
                        </div>
                      </div>
                    )}

                    {/* STEP 5 — OTP */}
                    {step === 5 && (
                      <div className="step-slide">
                        <h3 className="slide-title">Verify Your Email</h3>
                        <div className="otp-email-hint">
                          <Mail size={15} />
                          <span>Code sent to <strong>{email}</strong></span>
                        </div>
                        <p className="otp-instruction">Enter the 6-digit code from your inbox:</p>

                        <div className="otp-boxes" onPaste={handleOtpPaste}>
                          {otpDigits.map((digit, i) => (
                            <input
                              key={i}
                              ref={el => (otpRefs.current[i] = el)}
                              type="text"
                              inputMode="numeric"
                              maxLength={1}
                              value={digit}
                              onChange={e => handleOtpChange(i, e.target.value)}
                              onKeyDown={e => handleOtpKeyDown(i, e)}
                              className={`otp-box${digit ? ' otp-filled' : ''}`}
                              autoFocus={i === 0}
                            />
                          ))}
                        </div>

                        <div className="otp-resend-row">
                          <span className="otp-resend-label">Didn't receive it?</span>
                          <button
                            type="button"
                            onClick={handleResendOTP}
                            disabled={resendCooldown > 0 || otpSending}
                            className="otp-resend-btn"
                          >
                            <RefreshCw size={13} />
                            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* LOGIN VIEW */
                  <>
                    <div className="form-group">
                      <label className="form-label">Account System Role</label>
                      <select value={role} onChange={e => setRole(e.target.value)} className="custom-select">
                        <option value="patient">Patient System</option>
                        <option value="doctor">Doctor Network</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email Address</label>
                      <div className="input-with-icon">
                        <Mail className="input-icon" size={18} />
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="name@example.com" />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Password</label>
                      <div className="input-with-icon">
                        <Lock className="input-icon" size={18} />
                        <input 
                          type={showPassword ? "text" : "password"} 
                          value={password} 
                          onChange={e => setPassword(e.target.value)} 
                          required 
                          placeholder="••••••••" 
                        />
                        <button
                          type="button"
                          className="password-toggle-btn"
                          onClick={() => setShowPassword(!showPassword)}
                          tabIndex="-1"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
                        <button
                          type="button"
                          className="btn-link"
                          onClick={() => {
                            setError(null);
                            setIsForgotPassword(true);
                          }}
                          style={{ fontSize: '0.8rem', padding: 0 }}
                        >
                          Forgot Password?
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* ACTIONS */}
                <div className="form-actions">
                  {isForgotPassword && !resetSent && (
                    <button type="button" onClick={() => { setError(null); setIsForgotPassword(false); }} className="btn btn-outline flex-1" disabled={isBusy}>
                      Cancel
                    </button>
                  )}
                  {isRegistering && step > 1 && step <= 4 && (
                    <button type="button" onClick={() => { setError(null); goToStep(step - 1); }} className="btn btn-outline flex-1" disabled={isBusy}>
                      <ChevronLeft size={18} /> Back
                    </button>
                  )}
                  {isRegistering && step === 5 && (
                    <button type="button" onClick={() => { setError(null); goToStep(4); }} className="btn btn-outline flex-1" disabled={isBusy}>
                      <ChevronLeft size={18} /> Back
                    </button>
                  )}
                  {!resetSent && (
                    <button className="btn btn-primary flex-1 action-submit-btn" type="submit" disabled={isBusy}>
                      {isBusy ? (
                        <span className="btn-spinner">
                          <span className="spinner-dot"></span>
                          <span className="spinner-dot"></span>
                          <span className="spinner-dot"></span>
                        </span>
                      ) : isForgotPassword ? (
                        <><Send size={17} /> Send Reset Link</>
                      ) : isRegistering ? (
                        step === 4 ? <><Mail size={17} /> Send Code</> :
                        step === 5 ? <><CheckCircle size={17} /> Verify &amp; Register</> :
                        <>Continue <ChevronRight size={18} /></>
                      ) : (
                        <>Sign In <LogIn size={18} /></>
                      )}
                    </button>
                  )}
                </div>
              </form>

              <div className="auth-footer">
                {!isForgotPassword && (
                  <button className="btn-link" type="button" onClick={toggleMode} disabled={isBusy}>
                    {isRegistering
                      ? 'Already have a clinical account? Sign In'
                      : 'Request a new clinical profile? Sign Up'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ===== STYLES ===== */}
      <style jsx>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          background-color: #0b0f19;
          overflow: hidden;
          font-family: 'Inter', sans-serif;
        }

        /* LEFT COLUMN */
        .visual-column {
          flex: 1.2;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 4.5rem;
          background: radial-gradient(circle at 10% 20%, #171c35 0%, #070913 100%);
          position: relative;
          overflow: hidden;
          border-right: 1px solid rgba(255,255,255,0.03);
        }
        @media (max-width: 1024px) { .visual-column { display: none; } }

        .glow-spot-1 {
          position: absolute; width: 450px; height: 450px; border-radius: 50%;
          background: radial-gradient(circle, rgba(37,99,235,0.12) 0%, rgba(37,99,235,0) 70%);
          filter: blur(60px); top: -10%; left: -10%;
        }
        .glow-spot-2 {
          position: absolute; width: 500px; height: 500px; border-radius: 50%;
          background: radial-gradient(circle, rgba(14,165,233,0.08) 0%, rgba(14,165,233,0) 70%);
          filter: blur(80px); bottom: -15%; right: -10%;
        }

        .brand-logo { display: flex; align-items: center; gap: 0.75rem; position: relative; z-index: 10; }
        .logo-icon { color: var(--accent); filter: drop-shadow(0 0 8px rgba(14,165,233,0.5)); }
        .brand-name { font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 1.6rem; color: white; letter-spacing: -0.5px; }
        .brand-badge {
          background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
          color: white; font-size: 0.7rem; font-weight: 700;
          padding: 0.2rem 0.5rem; border-radius: var(--radius-sm); letter-spacing: 0.5px;
        }

        .visual-body { position: relative; z-index: 10; max-width: 620px; margin: auto 0; }
        .visual-body h1 {
          font-family: 'Outfit', sans-serif; font-size: 3.2rem; font-weight: 700;
          line-height: 1.15; color: white; margin-bottom: 1.5rem; letter-spacing: -1.5px;
          background: linear-gradient(to right, #ffffff, #94a3b8);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .subtitle { color: #94a3b8; font-size: 1.15rem; line-height: 1.6; margin-bottom: 3.5rem; }

        .highlight-cards { display: flex; flex-direction: column; gap: 1.5rem; }
        .highlight-card {
          display: flex; gap: 1.25rem; align-items: flex-start; padding: 1.25rem;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);
          border-radius: var(--radius-lg); backdrop-filter: blur(12px);
          transition: transform 0.2s, background 0.2s;
        }
        .highlight-card:hover { transform: translateX(4px); background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.08); }
        .card-icon-wrapper { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: var(--radius-md); flex-shrink: 0; }
        .card-icon-wrapper.success { background: rgba(16,185,129,0.1); color: var(--success); }
        .card-icon-wrapper.accent { background: rgba(14,165,233,0.1); color: var(--accent); }
        .card-icon-wrapper.primary { background: rgba(37,99,235,0.1); color: var(--primary); }
        .card-content h4 { color: white; font-size: 1rem; font-weight: 600; margin-bottom: 0.25rem; }
        .card-content p { color: #64748b; font-size: 0.85rem; line-height: 1.4; }
        .visual-footer p { color: #475569; font-size: 0.85rem; position: relative; z-index: 10; }

        /* RIGHT COLUMN */
        .form-column {
          flex: 0.9; display: flex; align-items: center; justify-content: center;
          padding: 3rem; background-color: #070913; position: relative; overflow-y: auto;
        }
        @media (max-width: 640px) { .form-column { padding: 1.5rem; } }

        .auth-card {
          width: 100%; max-width: 460px;
          background: rgba(15,23,42,0.45); border: 1px solid rgba(255,255,255,0.06);
          border-radius: var(--radius-xl); padding: 3rem;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.6); backdrop-filter: blur(20px);
        }
        @media (max-width: 480px) { .auth-card { padding: 1.75rem 1.5rem; } }

        /* SUCCESS SCREEN */
        .success-screen {
          display: flex; flex-direction: column; align-items: center;
          text-align: center; padding: 1rem 0;
          animation: successFadeIn 0.5s ease forwards;
        }
        @keyframes successFadeIn {
          from { opacity: 0; transform: scale(0.93); }
          to   { opacity: 1; transform: scale(1); }
        }

        .success-icon-ring {
          width: 96px; height: 96px; border-radius: 50%;
          background: rgba(16,185,129,0.08);
          border: 3px solid #10b981;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 1.75rem;
          animation: successBlink 1.1s ease-in-out infinite;
        }
        @keyframes successBlink {
          0%   { box-shadow: 0 0 0 0 rgba(16,185,129,0.55); border-color: #10b981; }
          50%  { box-shadow: 0 0 0 18px rgba(16,185,129,0); border-color: #34d399; }
          100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); border-color: #10b981; }
        }

        .success-icon { color: #10b981; }
        .success-title { color: white; font-size: 1.65rem; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 0.75rem; }
        .success-subtitle { color: #94a3b8; font-size: 0.92rem; line-height: 1.6; margin-bottom: 1.75rem; max-width: 340px; }

        .success-code-box {
          display: flex; flex-direction: column; align-items: center; gap: 0.35rem;
          padding: 1.25rem 2rem; width: 100%;
          background: rgba(16,185,129,0.05); border: 1px solid rgba(16,185,129,0.2);
          border-radius: var(--radius-lg); margin-bottom: 1.75rem;
        }
        .success-code-label { color: #10b981; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
        .success-doctor-code { color: white; font-size: 2rem; font-weight: 700; font-family: 'Courier New', monospace; letter-spacing: 3px; }
        .success-code-note { color: #64748b; font-size: 0.78rem; }

        .success-redirect-bar {
          width: 100%; height: 3px; background: rgba(255,255,255,0.06);
          border-radius: 999px; overflow: hidden;
        }
        .success-redirect-fill {
          height: 100%; background: linear-gradient(90deg, #10b981, #34d399);
          border-radius: 999px;
          animation: redirectCountdown 4s linear forwards;
        }
        @keyframes redirectCountdown {
          from { width: 100%; }
          to   { width: 0%; }
        }

        /* HEADER */
        .auth-header { margin-bottom: 2.25rem; }
        .auth-header h2 { color: white; font-size: 1.85rem; font-weight: 700; letter-spacing: -0.75px; margin-bottom: 0.5rem; }
        .auth-header p { color: #64748b; font-size: 0.9rem; }

        /* PROGRESS BAR */
        .steps-bar { display: flex; justify-content: space-between; margin-bottom: 2.5rem; position: relative; }
        .steps-line { position: absolute; top: 15px; left: 0; right: 0; height: 2px; background: rgba(255,255,255,0.05); z-index: 0; }
        .steps-line-active {
          position: absolute; top: 15px; left: 0; height: 2px;
          background: linear-gradient(95deg, var(--primary) 0%, var(--accent) 100%);
          z-index: 0; transition: width 0.35s ease;
        }
        .step-dot {
          width: 32px; height: 32px; border-radius: 50%;
          background: #0f172a; border: 2px solid rgba(255,255,255,0.08);
          color: #475569; font-size: 0.85rem; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          position: relative; z-index: 10; transition: all 0.3s ease;
        }
        .step-dot.active { border-color: var(--accent); color: white; background: #172554; box-shadow: 0 0 12px rgba(14,165,233,0.3); }
        .step-dot.completed { border-color: var(--success); background: var(--success); color: white; }

        /* SLIDE */
        .slide-in { animation: slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .slide-title { color: white; font-size: 1.15rem; font-weight: 600; margin-bottom: 1.5rem; letter-spacing: -0.25px; }

        /* OTP BOXES */
        .otp-email-hint {
          display: flex; align-items: center; gap: 0.5rem;
          color: #94a3b8; font-size: 0.85rem; margin-bottom: 0.6rem;
        }
        .otp-email-hint strong { color: var(--accent); }
        .otp-instruction { color: #64748b; font-size: 0.85rem; margin-bottom: 1.4rem; }

        .otp-boxes { display: flex; gap: 0.55rem; justify-content: center; margin-bottom: 1.4rem; }

        .otp-box {
          width: 48px; height: 58px; text-align: center;
          font-size: 1.5rem; font-weight: 700; color: white;
          background: rgba(15,23,42,0.8); border: 2px solid rgba(255,255,255,0.08);
          border-radius: 10px; transition: border-color 0.2s, box-shadow 0.2s;
          caret-color: var(--accent); font-family: 'Courier New', monospace;
        }
        .otp-box:focus {
          outline: none; border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(14,165,233,0.18);
        }
        .otp-box.otp-filled { border-color: rgba(14,165,233,0.45); background: rgba(14,165,233,0.06); }

        .otp-resend-row { display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
        .otp-resend-label { color: #475569; font-size: 0.8rem; }
        .otp-resend-btn {
          display: flex; align-items: center; gap: 0.3rem;
          background: none; border: none; color: var(--accent);
          font-size: 0.8rem; font-weight: 600; cursor: pointer;
          transition: color 0.2s, opacity 0.2s; padding: 0;
        }
        .otp-resend-btn:disabled { color: #475569; cursor: not-allowed; opacity: 0.6; }
        .otp-resend-btn:not(:disabled):hover { color: white; }

        /* INPUTS */
        .form-group { margin-bottom: 1.5rem; }
        .form-label { display: block; color: #94a3b8; font-size: 0.85rem; font-weight: 500; margin-bottom: 0.5rem; }
        .input-with-icon { position: relative; display: flex; align-items: center; }
        .input-icon { position: absolute; left: 1rem; color: #475569; pointer-events: none; transition: color 0.2s; }
        .input-with-icon input {
          width: 100%; padding: 0.75rem 2.5rem 0.75rem 2.75rem;
          background: rgba(15,23,42,0.8); border: 1px solid rgba(255,255,255,0.08);
          color: white; font-size: 0.95rem; border-radius: var(--radius-md);
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .password-toggle-btn {
          position: absolute;
          right: 1rem;
          background: none;
          border: none;
          color: #475569;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          transition: color 0.2s;
        }
        .password-toggle-btn:hover {
          color: var(--accent);
        }
        .input-with-icon input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(14,165,233,0.15); }
        .custom-select {
          background-color: rgba(15,23,42,0.8); border: 1px solid rgba(255,255,255,0.08);
          color: white; font-size: 0.95rem; padding: 0.75rem 1rem;
          border-radius: var(--radius-md); outline: none; width: 100%;
        }
        .custom-select:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(14,165,233,0.15); }
        .helper-text { margin-top: 0.5rem; font-size: 0.75rem; color: #475569; line-height: 1.4; }

        /* ERRORS */
        .error-alert {
          background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2);
          color: #fca5a5; padding: 0.75rem 1rem; border-radius: var(--radius-md);
          font-size: 0.85rem; margin-bottom: 1.5rem; line-height: 1.4;
        }

        /* BUTTONS */
        .form-actions { display: flex; gap: 1rem; margin-top: 2.25rem; }
        .flex-1 { flex: 1; }
        .action-submit-btn { height: 48px; }

        .btn-outline {
          background: transparent; border: 1px solid rgba(255,255,255,0.08);
          color: #94a3b8; font-weight: 600; display: flex; align-items: center; gap: 6px; justify-content: center;
        }
        .btn-outline:hover { background: rgba(255,255,255,0.03); color: white; border-color: rgba(255,255,255,0.15); }

        .btn-primary {
          background: linear-gradient(95deg, var(--primary) 0%, var(--accent) 100%);
          border: none; color: white; font-weight: 600;
          box-shadow: 0 4px 12px rgba(37,99,235,0.25);
          display: flex; align-items: center; gap: 6px; justify-content: center;
        }
        .btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(37,99,235,0.4); }
        .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }

        .btn-spinner { display: flex; gap: 5px; align-items: center; justify-content: center; }
        .spinner-dot { width: 7px; height: 7px; background: white; border-radius: 50%; animation: spinnerBounce 1s infinite ease-in-out; }
        .spinner-dot:nth-child(2) { animation-delay: 0.15s; }
        .spinner-dot:nth-child(3) { animation-delay: 0.3s; }
        @keyframes spinnerBounce {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }

        .auth-footer { margin-top: 1.75rem; text-align: center; }
        .btn-link { background: none; border: none; color: var(--accent); font-weight: 600; font-size: 0.85rem; transition: color 0.2s; cursor: pointer; }
        .btn-link:hover { color: white; text-decoration: none; }

        /* Forgot Password Success Box */
        .forgot-success-box {
          text-align: center;
          padding: 0.5rem;
          animation: slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .success-glowing-border {
          border: 2px solid rgba(16, 185, 129, 0.4);
          background: rgba(16, 185, 129, 0.04);
          border-radius: 1rem;
          padding: 2rem 1.5rem;
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.1);
          animation: blink-border 1.5s infinite alternate;
        }
        @keyframes blink-border {
          0% {
            border-color: rgba(16, 185, 129, 0.2);
            box-shadow: 0 0 10px rgba(16, 185, 129, 0.03);
          }
          100% {
            border-color: #10b981;
            box-shadow: 0 0 25px rgba(16, 185, 129, 0.35);
          }
        }
        .success-icon-pulse {
          color: #10b981;
          margin-bottom: 1rem;
          animation: scaleUpIcon 0.5s ease-out;
        }
        @keyframes scaleUpIcon {
          0% { transform: scale(0.6); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .success-glowing-border h3 {
          color: #ffffff;
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0 0 0.5rem;
          font-family: 'Outfit', sans-serif;
        }
        .success-glowing-border p {
          color: #94a3b8;
          font-size: 0.88rem;
          line-height: 1.5;
          margin: 0;
        }
      `}</style>
    </div>
  );
};

export default Login;