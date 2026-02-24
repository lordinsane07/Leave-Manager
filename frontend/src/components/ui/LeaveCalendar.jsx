import { useState, useMemo } from 'react';
import Badge from './Badge';
import { getLeaveTypeLabel, capitalize } from '../../utils/helpers';
import { cn } from '../../utils/cn';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function LeaveCalendar({ leaves = [], onDateClick }) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    // Map leaves to specific dates
    const leavesByDate = useMemo(() => {
        const map = {};
        leaves.forEach((leave) => {
            const start = new Date(leave.startDate);
            const end = new Date(leave.endDate);

            // Normalize to midnight
            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);

            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                if (!map[dateStr]) map[dateStr] = [];
                map[dateStr].push(leave);
            }
        });
        return map;
    }, [leaves]);

    const renderCells = () => {
        const cells = [];

        // Empty cells for days before the 1st
        for (let i = 0; i < firstDayOfMonth; i++) {
            cells.push(<div key={`empty-${i}`} className="min-h-[100px] border border-border/40 bg-base/30 p-2" />);
        }

        const todayStr = new Date().toISOString().split('T')[0];

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const dateStr = date.toISOString().split('T')[0];
            const isToday = dateStr === todayStr;
            const dayLeaves = leavesByDate[dateStr] || [];

            cells.push(
                <div
                    key={day}
                    className={cn(
                        "min-h-[100px] border border-border/40 p-2 overflow-y-auto transition-colors",
                        isToday ? "bg-accent/5 focus-within:ring-1 ring-accent/30" : "bg-surface hover:bg-elevated",
                        "cursor-pointer"
                    )}
                    onClick={() => onDateClick && onDateClick(date, dayLeaves)}
                >
                    <div className={cn(
                        "w-7 h-7 flex items-center justify-center rounded-full text-sm mb-1 font-medium",
                        isToday ? "bg-accent text-white" : "text-txt-primary"
                    )}>
                        {day}
                    </div>

                    <div className="space-y-1">
                        {dayLeaves.map((leave, idx) => (
                            <div
                                key={`${leave._id}-${idx}`}
                                className={cn(
                                    "text-[10px] px-1.5 py-0.5 rounded truncate font-medium",
                                    leave.status === 'approved' ? "bg-accent-success/20 text-accent-success" :
                                        leave.status === 'pending' ? "bg-accent-warning/20 text-accent-warning" :
                                            leave.status === 'rejected' ? "bg-accent-danger/20 text-accent-danger" :
                                                "bg-border text-txt-muted"
                                )}
                                title={`${leave.employee?.name || 'Leave'} — ${getLeaveTypeLabel(leave.leaveType)}`}
                            >
                                {leave.employee?.name || capitalize(getLeaveTypeLabel(leave.leaveType))}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return cells;
    };

    return (
        <div className="bg-surface rounded-card border border-border overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-base/50">
                <h3 className="text-lg font-display text-txt-primary font-medium">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h3>
                <div className="flex gap-2 text-txt-muted">
                    <button onClick={prevMonth} className="p-1 hover:text-txt-primary transition-colors">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                    </button>
                    <button onClick={() => setCurrentDate(new Date())} className="px-2 py-1 text-xs font-medium hover:text-txt-primary transition-colors">
                        Today
                    </button>
                    <button onClick={nextMonth} className="p-1 hover:text-txt-primary transition-colors">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 text-center border-b border-border/40 bg-base/30">
                {DAYS.map(day => (
                    <div key={day} className="py-2 text-xs font-medium text-txt-muted uppercase tracking-wider">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 text-left">
                {renderCells()}
            </div>
        </div>
    );
}
