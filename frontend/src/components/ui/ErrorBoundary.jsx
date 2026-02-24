import React from 'react';

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service here
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-base p-6">
                    <div className="max-w-md w-full text-center">
                        <div className="w-20 h-20 mx-auto bg-accent-danger/10 text-accent-danger rounded-2xl flex items-center justify-center mb-6">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-display font-medium text-txt-primary mb-2">Something went wrong</h1>
                        <p className="text-sm text-txt-muted mb-8">
                            We've encountered an unexpected error. Try refreshing the page or going back to the dashboard.
                        </p>
                        <div className="flex justify-center gap-3">
                            <button
                                onClick={() => window.location.reload()}
                                className="px-5 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors"
                            >
                                Refresh Page
                            </button>
                            <button
                                onClick={() => window.location.href = '/dashboard'}
                                className="px-5 py-2 rounded-lg bg-surface border border-border text-txt-primary text-sm font-medium hover:bg-elevated transition-colors"
                            >
                                Go to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
