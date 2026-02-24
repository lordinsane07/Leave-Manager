import { cn } from '../../utils/cn';

export default function Card({ children, className, hover, ...props }) {
    return (
        <div
            className={cn(
                'bg-surface border border-border rounded-card p-5 shadow-sm',
                hover && 'card-hover cursor-pointer',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

export function CardHeader({ children, className }) {
    return (
        <div className={cn('flex items-center justify-between mb-4', className)}>
            {children}
        </div>
    );
}

export function CardTitle({ children, className }) {
    return (
        <h3 className={cn('text-base font-semibold text-txt-primary', className)}>
            {children}
        </h3>
    );
}
