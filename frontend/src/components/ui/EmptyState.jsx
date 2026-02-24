import { cn } from '../../utils/cn';

export default function EmptyState({ icon, title, description, action, className }) {
    return (
        <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
            {icon && (
                <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center text-accent mb-4">
                    {icon}
                </div>
            )}
            <h3 className="text-lg font-semibold text-txt-primary mb-1">{title}</h3>
            {description && (
                <p className="text-sm text-txt-muted max-w-md mb-4">{description}</p>
            )}
            {action}
        </div>
    );
}
