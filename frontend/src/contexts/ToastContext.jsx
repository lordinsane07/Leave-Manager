import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

let toastId = 0;
const MAX_TOASTS = 3;

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info', duration = 4000) => {
        // Deduplicate: if the same message+type is already visible, skip
        setToasts((prev) => {
            const isDuplicate = prev.some((t) => t.message === message && t.type === type);
            if (isDuplicate) return prev;

            const id = ++toastId;

            // Auto-dismiss after duration
            setTimeout(() => {
                setToasts((current) => current.filter((t) => t.id !== id));
            }, duration);

            // Cap at MAX_TOASTS — remove oldest if over the limit
            const next = [...prev, { id, message, type }];
            return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
        });
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    // Convenience methods
    const success = useCallback((msg) => addToast(msg, 'success', 4000), [addToast]);
    const error = useCallback((msg) => addToast(msg, 'error', 7000), [addToast]);
    const warning = useCallback((msg) => addToast(msg, 'warning', 5000), [addToast]);
    const info = useCallback((msg) => addToast(msg, 'info', 4000), [addToast]);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
            {children}
        </ToastContext.Provider>
    );
}

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within ToastProvider');
    return context;
};

