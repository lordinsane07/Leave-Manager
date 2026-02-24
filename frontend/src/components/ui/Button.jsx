import { cn } from '../../utils/cn';

const variants = {
    primary: 'bg-accent text-white hover:bg-accent-hover',
    secondary: 'bg-surface text-txt-primary border border-border hover:bg-elevated',
    danger: 'bg-accent-danger text-white hover:opacity-90',
    success: 'bg-accent-success text-white hover:opacity-90',
    ghost: 'bg-transparent text-txt-secondary hover:bg-surface',
};

const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-2.5 text-base',
};

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    className,
    isLoading,
    disabled,
    ...props
}) {
    return (
        <button
            className={cn(
                'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 btn-press focus:outline-none focus:ring-2 focus:ring-accent/30',
                variants[variant],
                sizes[size],
                (disabled || isLoading) && 'opacity-50 cursor-not-allowed',
                className
            )}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            )}
            {children}
        </button>
    );
}
