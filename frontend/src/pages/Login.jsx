import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Footer from '../components/layout/Footer';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function Login() {
    const [form, setForm] = useState({ email: '', password: '' });
    const [isLoading, setIsLoading] = useState(false);
    const { login, googleLogin } = useAuth();
    const { error: showError, success: showSuccess } = useToast();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.email.trim()) {
            showError('Email address is required');
            return;
        }
        if (!form.password) {
            showError('Password is required');
            return;
        }
        setIsLoading(true);
        try {
            await login(form);
            navigate('/dashboard');
        } catch (err) {
            showError(err.response?.data?.message || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

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
        if (!GOOGLE_CLIENT_ID) return;

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
                document.getElementById('google-signin-btn'),
                { theme: 'outline', size: 'large', width: '100%', text: 'continue_with' }
            );
        };
        document.head.appendChild(script);

        return () => {
            const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
            if (existing) existing.remove();
        };
    }, [handleGoogleResponse]);

    return (
        <div className="min-h-screen flex flex-col">
            <div className="flex-1 flex">
                {/* Left Panel — Branding */}
                <div className="hidden lg:flex lg:w-1/2 bg-sidebar items-center justify-center p-12 relative overflow-hidden">
                    {/* BG pattern */}
                    <div className="absolute inset-0 opacity-5">
                        <div className="absolute top-10 left-10 w-40 h-40 rounded-full border-2 border-accent" />
                        <div className="absolute bottom-20 right-16 w-60 h-60 rounded-full border-2 border-accent" />
                        <div className="absolute top-1/2 left-1/2 w-80 h-80 rounded-full border border-accent transform -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <div className="relative z-10 text-center">
                        <div className="w-20 h-20 rounded-2xl bg-accent flex items-center justify-center text-white text-3xl font-bold mx-auto mb-6">
                            LM
                        </div>
                        <h1 className="text-4xl font-display text-sidebar-text mb-3">Leave Manager</h1>
                        <p className="text-sidebar-muted max-w-sm text-sm leading-relaxed">
                            Streamline your leave management with data-driven analytics and heuristic-based insights. Take control of your workforce planning.
                        </p>
                        <div className="mt-8 flex items-center justify-center gap-6 text-sidebar-muted text-xs">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-accent-success" />
                                <span>Rule-Based Insights</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-accent" />
                                <span>Real-Time Alerts</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel — Login Form */}
                <div className="flex-1 flex items-center justify-center p-8 bg-base">
                    <div className="w-full max-w-md">
                        <div className="mb-8">
                            <div className="lg:hidden w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-white text-lg font-bold mb-4">
                                LM
                            </div>
                            <h2 className="text-2xl font-display text-txt-primary">Welcome back</h2>
                            <p className="text-txt-muted text-sm mt-1">Sign in to continue to your dashboard</p>
                        </div>

                        {/* Google Sign-In Button */}
                        {GOOGLE_CLIENT_ID && (
                            <>
                                <div id="google-signin-btn" className="w-full mb-4 flex justify-center" />
                                <div className="relative my-5">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-border" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-base px-3 text-txt-muted">or continue with email</span>
                                    </div>
                                </div>
                            </>
                        )}

                        <form onSubmit={handleSubmit} noValidate className="space-y-5">
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
                                placeholder="••••••••"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                required
                            />
                            <Button type="submit" className="w-full" isLoading={isLoading}>
                                Sign In
                            </Button>
                        </form>

                        <div className="mt-3 text-right">
                            <Link to="/forgot-password" className="text-xs text-accent hover:underline">
                                Forgot Password?
                            </Link>
                        </div>

                        <p className="mt-4 text-center text-sm text-txt-muted">
                            Don't have an account?{' '}
                            <Link to="/register" className="text-accent font-medium hover:underline">
                                Create one
                            </Link>
                        </p>

                        {/* Demo credentials */}
                        <div className="mt-6 p-4 bg-elevated rounded-lg border border-border">
                            <p className="text-xs font-semibold text-txt-secondary mb-2">Demo Credentials</p>
                            <div className="space-y-1 text-xs text-txt-muted font-mono">
                                <p>Admin: admin@company.com / Admin@123</p>
                                <p>Manager: manager1@company.com / Manager@123</p>
                                <p>Employee: rahul@company.com / Employee@123</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}
