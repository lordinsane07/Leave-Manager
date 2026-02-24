import { cn } from '../../utils/cn';

export default function Loader({ size = 'md', className }) {
    const sizes = { sm: 'h-6 w-6', md: 'h-12 w-12', lg: 'h-16 w-16' };

    return (
        <div className={cn('flex items-center justify-center', className)}>
            <div className={cn('relative flex items-center justify-center', sizes[size])}>
                {/* Outer glowing ring */}
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent border-r-accent/30 animate-spin" />

                {/* Inner glossy orb */}
                <div className="absolute inset-1 rounded-full bg-gradient-to-tr from-accent to-accent-hover shadow-[0_0_15px_rgba(249,107,36,0.5)] opacity-80 animate-pulse" style={{ backdropFilter: 'blur(4px)' }}>
                    {/* Glossy reflection */}
                    <div className="absolute top-[10%] left-[15%] w-[30%] h-[30%] bg-white/40 rounded-full blur-[1px]" />
                </div>
            </div>
        </div>
    );
}

export function PageLoader() {
    return (
        <div className="flex flex-col items-center justify-center h-64 gap-4 animate-in fade-in duration-300">
            <Loader size="lg" />
        </div>
    );
}

export function Skeleton({ className, ...props }) {
    return (
        <div
            className={cn('animate-pulse rounded-md bg-txt-muted/10', className)}
            {...props}
        />
    );
}

export function SkeletonText({ lines = 1, className }) {
    return (
        <div className={cn('space-y-2', className)}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    className={cn(
                        'h-4 w-full',
                        i === lines - 1 && lines > 1 && 'w-2/3'
                    )}
                />
            ))}
        </div>
    );
}
