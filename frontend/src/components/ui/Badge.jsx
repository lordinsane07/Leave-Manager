import { cn } from '../../utils/cn';

const badgeStyles = {
    pending: 'badge-pending',
    approved: 'badge-approved',
    rejected: 'badge-rejected',
    cancelled: 'badge-cancelled',
    info: 'bg-accent-info/15 text-accent-info',
    warning: 'bg-accent-warning/15 text-accent-warning',
    success: 'bg-accent-success/15 text-accent-success',
    danger: 'bg-accent-danger/15 text-accent-danger',
    neutral: 'bg-border/40 text-txt-secondary',
};

export default function Badge({ children, variant = 'neutral', className, dot }) {
    return (
        <span className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
            badgeStyles[variant],
            className
        )}>
            {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
            {children}
        </span>
    );
}
