import { cn } from '../../utils/cn';

export default function Input({
    label,
    error,
    className,
    type = 'text',
    ...props
}) {
    const isDark = document.documentElement.classList.contains('dark');

    return (
        <div className="relative w-full">
            {label && (
                <label className="block text-sm font-medium text-txt-secondary mb-1.5">
                    {label}
                </label>
            )}
            <input
                type={type}
                className={cn(
                    'w-full rounded-lg border bg-surface px-3 py-2.5 text-sm text-txt-primary placeholder:text-txt-muted',
                    'focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-border-focus',
                    'transition-all duration-200',
                    error ? 'border-accent-danger' : 'border-border',
                    className
                )}
                style={type === 'date' && isDark ? { colorScheme: 'dark' } : undefined}
                {...props}
            />
            {error && (
                <p className="mt-1 text-xs text-accent-danger">{error}</p>
            )}
        </div>
    );
}
