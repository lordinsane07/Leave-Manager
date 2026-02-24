import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { authService } from '../services';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Footer from '../components/layout/Footer';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function Register() {
    const [step, setStep] = useState('form'); // 'form' | 'otp'
    const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
    const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const { register, verifyOTP, googleLogin } = useAuth();
    const { error: showError, success: showSuccess, info: showInfo } = useToast();
    const navigate = useNavigate();
    const otpRefs = useRef([]);

    // Handle form submission — Step 1: Register + Send OTP
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) {
            showError('Full name is required');
            return;
        }
        if (!form.email.trim()) {
            showError('Email address is required');
            return;
        }
        if (form.password !== form.confirmPassword) {
            showError('Passwords do not match');
            return;
        }
        if (form.password.length < 8) {
            showError('Password must be at least 8 characters');
            return;
        }
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/.test(form.password)) {
            showError('Password must include uppercase, lowercase, number, and special character');
            return;
        }
        setIsLoading(true);
        try {
            await register({ name: form.name, email: form.email, password: form.password });
            showSuccess('Verification code sent to your email!');
            setStep('otp');
            setResendCooldown(60);
        } catch (err) {
            const data = err.response?.data;
            const errorMessage = data?.errors?.length > 0 ? data.errors[0] : (data?.message || 'Registration failed');
            showError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle OTP input — auto-focus next digit
    const handleOTPChange = (index, value) => {
        if (!/^\d*$/.test(value)) return; // Only digits
        const newDigits = [...otpDigits];
        newDigits[index] = value.slice(-1); // Single digit
        setOtpDigits(newDigits);

        // Auto-focus next input
        if (value && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    // Handle backspace — focus previous digit
    const handleOTPKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    // Handle paste — fill all 6 digits
    const handleOTPPaste = (e) => {
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 6) {
            setOtpDigits(pasted.split(''));
            otpRefs.current[5]?.focus();
            e.preventDefault();
        }
    };

    // Verify OTP — Step 2
    const handleVerifyOTP = async () => {
        const otp = otpDigits.join('');
        if (otp.length !== 6) {
            showError('Please enter the full 6-digit code');
            return;
        }
        setIsLoading(true);
        try {
            await verifyOTP(form.email, otp);
            showSuccess('Email verified! Welcome aboard!');
            navigate('/dashboard');
        } catch (err) {
            showError(err.response?.data?.message || 'Invalid or expired OTP');
            setOtpDigits(['', '', '', '', '', '']);
            otpRefs.current[0]?.focus();
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-submit when all 6 digits entered
    useEffect(() => {
        if (otpDigits.every((d) => d !== '') && step === 'otp') {
            handleVerifyOTP();
        }
    }, [otpDigits, step]);

    // Resend OTP with cooldown
    const handleResendOTP = async () => {
        if (resendCooldown > 0) return;
        try {
            await authService.resendOTP({ email: form.email });
            showInfo('New verification code sent!');
            setResendCooldown(60);
            setOtpDigits(['', '', '', '', '', '']);
            otpRefs.current[0]?.focus();
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to resend code');
        }
    };

    // Cooldown timer
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendCooldown]);

    // Google Sign-In callback
    const handleGoogleResponse = useCallback(async (response) => {
        if (!response.credential) return;
        setIsLoading(true);
        try {
            await googleLogin(response.credential);
            showSuccess('Signed in with Google!');
            navigate('/dashboard');
        } catch (err) {
            showError(err.response?.data?.message || 'Google sign-in failed');
        } finally {
            setIsLoading(false);
        }
    }, [googleLogin, navigate, showError, showSuccess]);

    // Load Google Identity Services script
    useEffect(() => {
        if (!GOOGLE_CLIENT_ID || step !== 'form') return;

        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            window.google?.accounts?.id?.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleGoogleResponse,
            });
            window.google?.accounts?.id?.renderButton(
                document.getElementById('google-signup-btn'),
                { theme: 'outline', size: 'large', text: 'signup_with' }
            );
        };
        document.head.appendChild(script);

        return () => {
            const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
            if (existing) existing.remove();
        };
    }, [handleGoogleResponse, step]);

    return (
        <div className="min-h-screen flex flex-col">
            <div className="flex-1 flex">
                {/* Left Panel — Branding */}
                <div className="hidden lg:flex lg:w-1/2 bg-sidebar items-center justify-center p-12 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-5">
                        <div className="absolute top-20 right-20 w-48 h-48 rounded-full border-2 border-accent" />
                        <div className="absolute bottom-10 left-16 w-32 h-32 rounded-full border-2 border-accent" />
                    </div>
                    <div className="relative z-10 text-center">
                        <div className="w-20 h-20 rounded-2xl bg-accent flex items-center justify-center text-white text-3xl font-bold mx-auto mb-6">
                            LM
                        </div>
                        <h1 className="text-4xl font-display text-sidebar-text mb-3">Join Leave Manager</h1>
                        <p className="text-sidebar-muted max-w-sm text-sm leading-relaxed">
                            Get started with streamlined leave management, data-driven analytics, and transparent burnout assessment tools.
                        </p>
                    </div>
                </div>

                {/* Right Panel */}
                <div className="flex-1 flex items-center justify-center p-8 bg-base">
                    <div className="w-full max-w-md">
                        {step === 'form' ? (
                            <>
                                <div className="mb-8">
                                    <div className="lg:hidden w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-white text-lg font-bold mb-4">
                                        LM
                                    </div>
                                    <h2 className="text-2xl font-display text-txt-primary">Create Account</h2>
                                    <p className="text-txt-muted text-sm mt-1">Fill in your details to get started</p>
                                </div>

                                {/* Google Sign-Up */}
                                {GOOGLE_CLIENT_ID && (
                                    <>
                                        <div id="google-signup-btn" className="w-full mb-4 flex justify-center" />
                                        <div className="relative my-5">
                                            <div className="absolute inset-0 flex items-center">
                                                <div className="w-full border-t border-border" />
                                            </div>
                                            <div className="relative flex justify-center text-xs uppercase">
                                                <span className="bg-base px-3 text-txt-muted">or register with email</span>
                                            </div>
                                        </div>
                                    </>
                                )}

                                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                                    <Input
                                        label="Full Name"
                                        placeholder="John Doe"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        required
                                    />
                                    <Input
                                        label="Email Address"
                                        type="email"
                                        placeholder="you@company.com"
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        required
                                    />
                                    <Input
                                        label="Password"
                                        type="password"
                                        placeholder="Min 8 characters"
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                        required
                                    />
                                    <Input
                                        label="Confirm Password"
                                        type="password"
                                        placeholder="Re-enter password"
                                        value={form.confirmPassword}
                                        onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                                        required
                                    />
                                    <Button type="submit" className="w-full" isLoading={isLoading}>
                                        Continue
                                    </Button>
                                </form>
                            </>
                        ) : (
                            /* OTP Verification Step */
                            <div className="text-center">
                                <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-6">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
                                        <rect x="2" y="4" width="20" height="16" rx="2" />
                                        <path d="M22 4l-10 8L2 4" />
                                    </svg>
                                </div>
                                <h2 className="text-2xl font-display text-txt-primary mb-2">Verify your email</h2>
                                <p className="text-txt-muted text-sm mb-1">
                                    We sent a 6-digit code to
                                </p>
                                <p className="text-accent font-medium text-sm mb-8">{form.email}</p>

                                {/* OTP Input — 6 separate digit boxes */}
                                <div className="flex justify-center gap-3 mb-6">
                                    {otpDigits.map((digit, i) => (
                                        <input
                                            key={i}
                                            ref={(el) => (otpRefs.current[i] = el)}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength="1"
                                            value={digit}
                                            onChange={(e) => handleOTPChange(i, e.target.value)}
                                            onKeyDown={(e) => handleOTPKeyDown(i, e)}
                                            onPaste={i === 0 ? handleOTPPaste : undefined}
                                            className="w-12 h-14 text-center text-xl font-bold rounded-lg border-2 border-border bg-surface text-txt-primary focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                                            autoFocus={i === 0}
                                        />
                                    ))}
                                </div>

                                <Button
                                    className="w-full mb-4"
                                    isLoading={isLoading}
                                    onClick={handleVerifyOTP}
                                >
                                    Verify Email
                                </Button>

                                <p className="text-sm text-txt-muted">
                                    Didn't receive the code?{' '}
                                    {resendCooldown > 0 ? (
                                        <span className="text-txt-secondary">Resend in {resendCooldown}s</span>
                                    ) : (
                                        <button
                                            onClick={handleResendOTP}
                                            className="text-accent font-medium hover:underline"
                                        >
                                            Resend Code
                                        </button>
                                    )}
                                </p>

                                <button
                                    onClick={() => setStep('form')}
                                    className="mt-4 text-xs text-txt-muted hover:text-txt-secondary"
                                >
                                    ← Back to registration
                                </button>
                            </div>
                        )}

                        <p className="mt-6 text-center text-sm text-txt-muted">
                            Already have an account?{' '}
                            <Link to="/login" className="text-accent font-medium hover:underline">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}
