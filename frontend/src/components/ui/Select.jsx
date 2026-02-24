import { cn } from '../../utils/cn';

export default function Select({ label, error, options = [], className, ...props }) {
    return (
        <div className="relative w-full">
            {label && (
                <label className="block text-sm font-medium text-txt-secondary mb-1.5">{label}</label>
            )}
            <select
                className={cn(
                    'w-full rounded-lg border bg-surface px-3 py-2.5 text-sm text-txt-primary',
                    'focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-border-focus',
                    'transition-all duration-200 appearance-none cursor-pointer',
                    error ? 'border-accent-danger' : 'border-border',
                    className
                )}
                {...props}
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            {/* Dropdown arrow */}
            <div className="pointer-events-none absolute right-3 top-[50%] transform -translate-y-1/2 text-txt-muted">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
            </div>
            {error && <p className="mt-1 text-xs text-accent-danger">{error}</p>}
        </div>
    );
}
