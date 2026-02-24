import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { NAV_ITEMS } from '../../utils/constants';
import { getInitials } from '../../utils/helpers';
import { cn } from '../../utils/cn';

const iconMap = {
    home: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2.25 6.75L9 1.5L15.75 6.75V15C15.75 15.4142 15.4142 15.75 15 15.75H3C2.58579 15.75 2.25 15.4142 2.25 15V6.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    plus: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 3V15M3 9H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>,
    clock: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.5" /><path d="M9 4.5V9L12 11.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>,
    sparkle: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 1.5L10.5 6.75L15.75 8.25L10.5 9.75L9 15L7.5 9.75L2.25 8.25L7.5 6.75L9 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>,
    user: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="5.25" r="3" stroke="currentColor" strokeWidth="1.5" /><path d="M3 15.75C3 12.4363 5.68629 9.75 9 9.75C12.3137 9.75 15 12.4363 15 15.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>,
    inbox: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2.25 10.5H5.63604L7.13604 12.75H10.864L12.364 10.5H15.75M2.25 10.5V14.25C2.25 15.0784 2.92157 15.75 3.75 15.75H14.25C15.0784 15.75 15.75 15.0784 15.75 14.25V10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M4.5 4.5L2.25 10.5H15.75L13.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    users: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="6.75" cy="5.25" r="2.5" stroke="currentColor" strokeWidth="1.5" /><circle cx="12.75" cy="5.25" r="2" stroke="currentColor" strokeWidth="1.5" /><path d="M1.5 15C1.5 12.1005 3.85051 9.75 6.75 9.75C9.64949 9.75 12 12.1005 12 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><path d="M12 9.75C14.0711 9.75 15.75 11.4289 15.75 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>,
    building: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 15.75V3C3 2.58579 3.33579 2.25 3.75 2.25H10.5C10.9142 2.25 11.25 2.58579 11.25 3V7.5H14.25C14.6642 7.5 15 7.83579 15 8.25V15.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M6 6H8.25M6 9H8.25M6 12H8.25M12 10.5V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>,
    calendar: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M5.25 2.25V4.5M12.75 2.25V4.5M2.25 7.5H15.75M3 3.75H15C15.4142 3.75 15.75 4.08579 15.75 4.5V15C15.75 15.4142 15.4142 15.75 15 15.75H3C2.58579 15.75 2.25 15.4142 2.25 15V4.5C2.25 4.08579 2.58579 3.75 3 3.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>,
    shield: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 1.5L15 4.5V8.25C15 12.2541 12.48 15.6 9 16.5C5.52 15.6 3 12.2541 3 8.25V4.5L9 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>,
    receipt: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4.5 1.5L3 3L4.5 4.5L3 6L4.5 7.5L3 9L4.5 10.5L3 12L4.5 13.5L3 15L4.5 16.5H13.5L15 15L13.5 13.5L15 12L13.5 10.5L15 9L13.5 7.5L15 6L13.5 4.5L15 3L13.5 1.5H4.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M7.5 6H10.5M7.5 9H10.5M7.5 12H9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>,
    briefcase: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2.25" y="5.25" width="13.5" height="10.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" /><path d="M6 5.25V3.75C6 3.33579 6.33579 3 6.75 3H11.25C11.6642 3 12 3.33579 12 3.75V5.25" stroke="currentColor" strokeWidth="1.5" /><path d="M2.25 9.75H15.75" stroke="currentColor" strokeWidth="1.5" /></svg>,
};

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
    const { user, logout } = useAuth();
    const { theme, toggleTheme, isDark } = useTheme();
    const navigate = useNavigate();
    const navItems = NAV_ITEMS[user?.role] || NAV_ITEMS.employee;

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const handleNavClick = () => {
        // Close sidebar on mobile when a link is clicked
        if (onMobileClose) onMobileClose();
    };

    const sidebarContent = (
        <aside className={cn(
            'fixed left-0 top-0 h-screen bg-sidebar flex flex-col transition-all duration-300 z-40 border-r border-border/10',
            // Desktop: normal sidebar behavior
            'hidden md:flex',
            collapsed ? 'w-16' : 'w-60'
        )}>
            {/* Logo */}
            <div className="flex items-center gap-3 px-4 h-16 border-b border-white/5">
                <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    LM
                </div>
                {!collapsed && (
                    <span className="text-sidebar-text font-display text-base whitespace-nowrap">
                        Leave Manager
                    </span>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200',
                            isActive
                                ? 'bg-accent text-white'
                                : 'text-sidebar-muted hover:text-sidebar-text hover:bg-white/5'
                        )}
                    >
                        <span className="flex-shrink-0">{iconMap[item.icon]}</span>
                        {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                ))}
            </nav>

            {/* Footer — Theme toggle + User */}
            <div className="border-t border-white/5 p-3 space-y-2">
                {/* Theme toggle */}
                <button
                    onClick={toggleTheme}
                    className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sidebar-muted hover:text-sidebar-text hover:bg-white/5 transition-all text-sm"
                >
                    <span className="flex-shrink-0">
                        {isDark ? (
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="4" stroke="currentColor" strokeWidth="1.5" /><path d="M9 1.5V3M9 15V16.5M1.5 9H3M15 9H16.5M3.7 3.7L4.76 4.76M13.24 13.24L14.3 14.3M14.3 3.7L13.24 4.76M4.76 13.24L3.7 14.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M15 10.25C14.2 13.25 11.39 15.5 8 15.5C4.13401 15.5 1 12.366 1 8.5C1 5.11 3.25 2.3 6.25 1.5C5.15 3.08 4.5 5.02 4.5 7.1C4.5 11.52 8.08 15.1 12.5 15.1C13.78 15.1 14.98 14.79 16.05 14.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        )}
                    </span>
                    {!collapsed && <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
                </button>

                {/* Collapse toggle */}
                <button
                    onClick={onToggle}
                    className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sidebar-muted hover:text-sidebar-text hover:bg-white/5 transition-all text-sm"
                >
                    <span className="flex-shrink-0">
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className={cn('transition-transform', collapsed && 'rotate-180')}>
                            <path d="M11.25 3.75L5.25 9L11.25 14.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </span>
                    {!collapsed && <span>Collapse</span>}
                </button>

                {/* User info */}
                <div className="flex items-center gap-3 px-3 py-2">
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold flex-shrink-0">
                        {getInitials(user?.name)}
                    </div>
                    {!collapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-sidebar-text font-medium truncate">{user?.name}</p>
                            <p className="text-[10px] text-sidebar-muted capitalize">{user?.role}</p>
                        </div>
                    )}
                </div>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-accent-danger opacity-80 hover:opacity-100 hover:bg-white/5 transition-all text-sm"
                >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="flex-shrink-0">
                        <path d="M6.75 15.75H3.75C3.33579 15.75 3 15.4142 3 15V3C3 2.58579 3.33579 2.25 3.75 2.25H6.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        <path d="M12 12.75L15.75 9L12 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M15.75 9H6.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    {!collapsed && <span>Logout</span>}
                </button>
            </div>
        </aside>
    );

    // Mobile sidebar as overlay
    const mobileSidebar = (
        <>
            {/* Backdrop */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={onMobileClose}
                />
            )}
            {/* Sidebar drawer */}
            <aside className={cn(
                'fixed left-0 top-0 h-screen w-64 bg-sidebar flex flex-col z-50 border-r border-border/10 transition-transform duration-300 md:hidden',
                mobileOpen ? 'translate-x-0' : '-translate-x-full'
            )}>
                {/* Logo + Close */}
                <div className="flex items-center justify-between px-4 h-16 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            LM
                        </div>
                        <span className="text-sidebar-text font-display text-base whitespace-nowrap">
                            Leave Manager
                        </span>
                    </div>
                    <button
                        onClick={onMobileClose}
                        className="p-1.5 rounded-lg text-sidebar-muted hover:text-sidebar-text hover:bg-white/5 transition-colors"
                    >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <path d="M5 5L13 13M13 5L5 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={handleNavClick}
                            className={({ isActive }) => cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200',
                                isActive
                                    ? 'bg-accent text-white'
                                    : 'text-sidebar-muted hover:text-sidebar-text hover:bg-white/5'
                            )}
                        >
                            <span className="flex-shrink-0">{iconMap[item.icon]}</span>
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* Footer */}
                <div className="border-t border-white/5 p-3 space-y-2">
                    {/* Theme toggle */}
                    <button
                        onClick={toggleTheme}
                        className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sidebar-muted hover:text-sidebar-text hover:bg-white/5 transition-all text-sm"
                    >
                        <span className="flex-shrink-0">
                            {isDark ? (
                                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="4" stroke="currentColor" strokeWidth="1.5" /><path d="M9 1.5V3M9 15V16.5M1.5 9H3M15 9H16.5M3.7 3.7L4.76 4.76M13.24 13.24L14.3 14.3M14.3 3.7L13.24 4.76M4.76 13.24L3.7 14.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                            ) : (
                                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M15 10.25C14.2 13.25 11.39 15.5 8 15.5C4.13401 15.5 1 12.366 1 8.5C1 5.11 3.25 2.3 6.25 1.5C5.15 3.08 4.5 5.02 4.5 7.1C4.5 11.52 8.08 15.1 12.5 15.1C13.78 15.1 14.98 14.79 16.05 14.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            )}
                        </span>
                        <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                    </button>

                    {/* User info */}
                    <div className="flex items-center gap-3 px-3 py-2">
                        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold flex-shrink-0">
                            {getInitials(user?.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-sidebar-text font-medium truncate">{user?.name}</p>
                            <p className="text-[10px] text-sidebar-muted capitalize">{user?.role}</p>
                        </div>
                    </div>

                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-accent-danger opacity-80 hover:opacity-100 hover:bg-white/5 transition-all text-sm"
                    >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="flex-shrink-0">
                            <path d="M6.75 15.75H3.75C3.33579 15.75 3 15.4142 3 15V3C3 2.58579 3.33579 2.25 3.75 2.25H6.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            <path d="M12 12.75L15.75 9L12 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M15.75 9H6.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                        <span>Logout</span>
                    </button>
                </div>
            </aside>
        </>
    );

    return (
        <>
            {sidebarContent}
            {mobileSidebar}
        </>
    );
}
