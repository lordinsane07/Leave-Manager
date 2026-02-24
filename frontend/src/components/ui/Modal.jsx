import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';

export default function Modal({ isOpen, onClose, title, children, className, size = 'md' }) {
    const modalRef = useRef(null);

    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen) return null;

    const sizes = {
        sm: 'max-w-sm',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
    };

    const handleBackdropClick = (e) => {
        if (modalRef.current && !modalRef.current.contains(e.target)) {
            onClose();
        }
    };

    return createPortal(
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                overflowY: 'auto',
            }}
            className="bg-black/50 backdrop-blur-sm"
            onClick={handleBackdropClick}
        >
            <div
                style={{
                    display: 'flex',
                    minHeight: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem 1rem',
                }}
            >
                <div
                    ref={modalRef}
                    className={cn(
                        'w-full bg-surface rounded-card shadow-lg border border-border modal-enter',
                        sizes[size],
                        className
                    )}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                        <h2 className="text-lg font-semibold text-txt-primary font-display">{title}</h2>
                        <button
                            onClick={onClose}
                            className="text-txt-muted hover:text-txt-primary transition-colors p-1 rounded-lg hover:bg-elevated"
                        >
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path d="M6 6L14 14M14 6L6 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="px-6 py-4">
                        {children}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
