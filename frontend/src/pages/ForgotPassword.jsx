import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Footer from '../components/layout/Footer';

export default function ForgotPassword() {
    const [step, setStep] = useState(1); // 1=email, 2=otp+newPassword
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        if (!email) { setError('Email is required'); return; }

        setLoading(true);
        try {
            const { data } = await authService.forgotPassword({ email });
            setMessage(data.message);
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send reset OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (!otp || !newPassword) { setError('All fields are required'); return; }
        if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
        if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }

        setLoading(true);
        try {
            const { data } = await authService.resetPassword({ email, otp, newPassword });
            setMessage(data.message);
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-base">
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    {/* Logo */}
                    <div className="flex items-center justify-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-white font-bold text-lg">LM</div>
                        <span className="text-xl font-display text-txt-primary">Leave Manager</span>
                    </div>

                    <div className="bg-surface rounded-card border border-border p-6">
                        <h2 className="text-lg font-semibold text-txt-primary font-display mb-1">
                            {step === 1 ? 'Forgot Password' : 'Reset Password'}
                        </h2>
                        <p className="text-sm text-txt-muted mb-6">
                            {step === 1
                                ? 'Enter your email to receive a password reset OTP.'
                                : 'Enter the OTP sent to your email and your new password.'}
                        </p>

                        {error && (
                            <div className="bg-accent-danger/10 border border-accent-danger/20 rounded-lg p-3 mb-4 text-sm text-accent-danger">
                                {error}
                            </div>
                        )}
                        {message && (
                            <div className="bg-accent-success/10 border border-accent-success/20 rounded-lg p-3 mb-4 text-sm text-accent-success">
                                {message}
                            </div>
                        )}

                        {step === 1 ? (
                            <form onSubmit={handleSendOTP} className="space-y-4">
                                <Input
                                    label="Email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="your@email.com"
                                />
                                <Button type="submit" className="w-full" isLoading={loading}>
                                    Send Reset OTP
                                </Button>
                            </form>
                        ) : (
                            <form onSubmit={handleResetPassword} className="space-y-4">
                                <Input
                                    label="OTP Code"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    placeholder="Enter 6-digit OTP"
                                    maxLength={6}
                                />
                                <Input
                                    label="New Password"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Min 8 characters"
                                />
                                <Input
                                    label="Confirm Password"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Re-enter password"
                                />
                                <Button type="submit" className="w-full" isLoading={loading}>
                                    Reset Password
                                </Button>
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="w-full text-sm text-txt-muted hover:text-accent transition-colors"
                                >
                                    Back to email step
                                </button>
                            </form>
                        )}

                        <div className="mt-6 text-center">
                            <Link to="/login" className="text-sm text-accent hover:underline">
                                Back to Login
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}
