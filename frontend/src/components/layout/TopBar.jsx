import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { notificationService } from '../../services';
import { timeAgo } from '../../utils/dateUtils';
import { cn } from '../../utils/cn';

export default function TopBar({ title }) {
    const { user } = useAuth();
    const { onMenuClick } = useOutletContext() || {};
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    // Fetch unread count on mount and periodically
    useEffect(() => {
        const fetchUnread = async () => {
            try {
                const { data } = await notificationService.getUnreadCount();
                setUnreadCount(data.data?.unreadCount || 0);
            } catch {
                // silently fail
            }
        };
        fetchUnread();
        const interval = setInterval(fetchUnread, 30000);
        return () => clearInterval(interval);
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleBellClick = async () => {
        setShowDropdown(!showDropdown);
        if (!showDropdown) {
            try {
                const { data } = await notificationService.getAll({ limit: 10 });
                setNotifications(data.data?.notifications || []);
            } catch {
                // silently fail
            }
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await notificationService.markAllAsRead();
            setUnreadCount(0);
            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        } catch {
            // silently fail
        }
    };

    return (
        <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
            <div className="flex items-center gap-3">
                {/* Hamburger — mobile only */}
                {onMenuClick && (
                    <button
                        onClick={onMenuClick}
                        className="p-2 rounded-lg text-txt-muted hover:text-txt-primary hover:bg-elevated transition-colors md:hidden"
                        aria-label="Open menu"
                    >
                        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                            <path d="M3 6H19M3 11H19M3 16H19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                    </button>
                )}
                {/* Page Title */}
                <h1 className="text-lg md:text-xl font-display text-txt-primary">{title}</h1>
            </div>

            <div className="flex items-center gap-3 md:gap-4">
                {/* Greeting */}
                <span className="text-sm text-txt-muted hidden md:block">
                    Welcome, <span className="text-txt-primary font-medium">{user?.name?.split(' ')[0]}</span>
                </span>

                {/* Notification Bell */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={handleBellClick}
                        className="relative p-2 rounded-lg text-txt-muted hover:text-txt-primary hover:bg-elevated transition-colors"
                    >
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M8 16.5C8 17.6046 8.89543 18.5 10 18.5C11.1046 18.5 12 17.6046 12 16.5M4 7C4 3.68629 6.68629 1 10 1C13.3137 1 16 3.68629 16 7C16 12.3333 18 14 18 14H2C2 14 4 12.3333 4 7Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {unreadCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-accent-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center min-w-[18px] h-[18px]">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {/* Notification Dropdown */}
                    {showDropdown && (
                        <div className="absolute right-0 top-12 w-72 sm:w-80 bg-surface border border-border rounded-card shadow-lg overflow-hidden modal-enter">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                                <span className="text-sm font-semibold text-txt-primary">Notifications</span>
                                {unreadCount > 0 && (
                                    <button onClick={handleMarkAllRead} className="text-xs text-accent hover:underline">
                                        Mark all read
                                    </button>
                                )}
                            </div>
                            <div className="max-h-80 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <p className="text-center text-txt-muted text-sm py-8">No notifications</p>
                                ) : (
                                    notifications.map((n) => (
                                        <div
                                            key={n._id}
                                            className={cn(
                                                'px-4 py-3 border-b border-border/50 text-sm',
                                                !n.isRead && 'bg-accent/5'
                                            )}
                                        >
                                            <p className="text-txt-primary text-xs">{n.message}</p>
                                            <p className="text-[10px] text-txt-muted mt-1">{timeAgo(n.createdAt)}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
