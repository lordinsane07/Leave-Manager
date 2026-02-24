import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../utils/cn';

const allRoutes = [
    { label: 'Dashboard', path: '/dashboard', icon: '🏠', roles: ['admin', 'manager', 'employee'] },
    { label: 'Apply Leave', path: '/apply-leave', icon: '✏️', roles: ['admin', 'manager', 'employee'] },
    { label: 'Leave History', path: '/leave-history', icon: '📋', roles: ['admin', 'manager', 'employee'] },
    { label: 'AI Insights', path: '/ai-insights', icon: '✨', roles: ['admin', 'manager', 'employee'] },
    { label: 'Profile', path: '/profile', icon: '👤', roles: ['admin', 'manager', 'employee'] },
    { label: 'Reimbursements', path: '/reimbursements', icon: '🧾', roles: ['admin', 'manager', 'employee'] },
    { label: 'My Leaves', path: '/my-leaves', icon: '💼', roles: ['manager'] },
    { label: 'User Management', path: '/admin/users', icon: '👥', roles: ['admin'] },
    { label: 'Departments', path: '/admin/departments', icon: '🏢', roles: ['admin'] },
    { label: 'Holidays', path: '/admin/holidays', icon: '📅', roles: ['admin'] },
    { label: 'Audit Log', path: '/audit-log', icon: '📝', roles: ['admin'] },
];

export default function CommandPalette() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef(null);
    const navigate = useNavigate();
    const { user } = useAuth();

    const routes = useMemo(() =>
        allRoutes.filter(r => r.roles.includes(user?.role || 'employee')),
        [user?.role]
    );

    const results = useMemo(() => {
        if (!query.trim()) return routes;
        const q = query.toLowerCase();
        return routes.filter(r => r.label.toLowerCase().includes(q));
    }, [query, routes]);

    // Ctrl+K listener
    useEffect(() => {
        const handler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setOpen(prev => !prev);
            }
            if (e.key === 'Escape') setOpen(false);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    // Focus input on open
    useEffect(() => {
        if (open) {
            setQuery('');
            setActiveIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    // Reset active index when results change
    useEffect(() => {
        setActiveIndex(0);
    }, [results.length]);

    const handleSelect = (path) => {
        setOpen(false);
        navigate(path);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(i => Math.min(i + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' && results[activeIndex]) {
            handleSelect(results[activeIndex].path);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]" onClick={() => setOpen(false)}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

            {/* Palette */}
            <div
                className="relative w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden modal-enter"
                onClick={e => e.stopPropagation()}
            >
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-txt-muted flex-shrink-0">
                        <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M12.5 12.5L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search pages..."
                        className="flex-1 bg-transparent text-txt-primary placeholder:text-txt-muted text-sm outline-none"
                    />
                    <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 bg-elevated rounded text-[10px] text-txt-muted border border-border/50 font-mono">
                        ESC
                    </kbd>
                </div>

                {/* Results */}
                <div className="max-h-72 overflow-y-auto py-2">
                    {results.length === 0 ? (
                        <p className="text-center text-sm text-txt-muted py-8">No results found</p>
                    ) : (
                        results.map((route, i) => (
                            <button
                                key={route.path}
                                onClick={() => handleSelect(route.path)}
                                className={cn(
                                    'w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors',
                                    i === activeIndex ? 'bg-accent/10 text-accent' : 'text-txt-secondary hover:bg-elevated'
                                )}
                            >
                                <span className="text-base">{route.icon}</span>
                                <span className="font-medium">{route.label}</span>
                            </button>
                        ))
                    )}
                </div>

                {/* Footer hint */}
                <div className="border-t border-border px-4 py-2 flex items-center gap-4 text-[10px] text-txt-muted">
                    <span>↑↓ navigate</span>
                    <span>↵ open</span>
                    <span>esc close</span>
                </div>
            </div>
        </div>
    );
}
