import { useToast } from '../../contexts/ToastContext';
import { cn } from '../../utils/cn';

const icons = {
    success: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.5" />
            <path d="M5.5 9L8 11.5L12.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    error: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.5" />
            <path d="M6.5 6.5L11.5 11.5M11.5 6.5L6.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    ),
    warning: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 2L16.8 15H1.2L9 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M9 7V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="9" cy="12.5" r="0.5" fill="currentColor" />
        </svg>
    ),
    info: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.5" />
            <path d="M9 8V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="9" cy="5.5" r="0.5" fill="currentColor" />
        </svg>
    ),
};

const colors = {
    success: 'bg-accent-success text-white',
    error: 'bg-accent-danger text-white',
    warning: 'bg-accent-warning text-txt-primary',
    info: 'bg-accent-info text-white',
};

export default function ToastContainer() {
    const { toasts, removeToast } = useToast();

    return (
        <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 max-w-sm">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-lg shadow-md toast-enter',
                        colors[toast.type]
                    )}
                >
                    <span className="flex-shrink-0">{icons[toast.type]}</span>
                    <p className="text-sm font-medium flex-1">{toast.message}</p>
                    <button
                        onClick={() => removeToast(toast.id)}
                        className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
                    >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>
            ))}
        </div>
    );
}
