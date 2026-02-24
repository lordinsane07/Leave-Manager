import { cn } from '../../utils/cn';

export default function StatCard({ title, value, subtitle, icon, trend, className }) {
    return (
        <div className={cn('bg-surface border border-border rounded-card p-5 card-hover', className)}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-txt-muted mb-1">{title}</p>
                    <p className="text-2xl font-bold text-txt-primary font-display">{value}</p>
                    {subtitle && (
                        <p className="text-xs text-txt-muted mt-1">{subtitle}</p>
                    )}
                </div>
                {icon && (
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
                        {icon}
                    </div>
                )}
            </div>
            {trend !== undefined && (
                <div className="mt-3 flex items-center gap-1">
                    <span className={cn(
                        'text-xs font-medium',
                        trend >= 0 ? 'text-accent-success' : 'text-accent-danger'
                    )}>
                        {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
                    </span>
                    <span className="text-xs text-txt-muted">vs last month</span>
                </div>
            )}
        </div>
    );
}
