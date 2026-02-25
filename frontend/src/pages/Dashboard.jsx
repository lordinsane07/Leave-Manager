import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { leaveService, analyticsService, aiService } from '../services';
import TopBar from '../components/layout/TopBar';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';
import Card, { CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Skeleton } from '../components/ui/Loader';
import EmptyState from '../components/ui/EmptyState';
import { formatDate, timeAgo } from '../utils/dateUtils';
import { getLeaveTypeLabel, capitalize } from '../utils/helpers';
import { cn } from '../utils/cn';
import { useNavigate, Link } from 'react-router-dom';
import {
    Chart as ChartJS,
    CategoryScale, LinearScale, BarElement, ArcElement,
    Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

// Register Chart.js modules
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

// Chart.js renders to <canvas> and can't resolve CSS vars — read computed values
function getThemeColor(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || '#999';
}

export default function Dashboard() {
    const { user } = useAuth();
    const role = user?.role;

    return (
        <>
            <TopBar title="Dashboard" />
            <div className="p-4 md:p-6 page-enter">
                {role === 'admin' && <AdminDashboard user={user} />}
                {role === 'manager' && <ManagerDashboard user={user} />}
                {role === 'employee' && <EmployeeDashboard user={user} />}
            </div>
        </>
    );
}

// ━━━━━━━━━━ Employee Dashboard ━━━━━━━━━━
function EmployeeDashboard({ user }) {
    const [leaves, setLeaves] = useState([]);
    const [suggestions, setSuggestions] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [leavesRes, suggestionsRes] = await Promise.all([
                    leaveService.getAll({ limit: 5, sortBy: 'appliedAt', order: 'desc' }),
                    aiService.getSuggestions(user._id).catch(() => ({ data: { data: null } })),
                ]);
                setLeaves(leavesRes.data?.data?.leaves || []);
                setSuggestions(suggestionsRes.data?.data?.suggestions);
            } catch {
                // graceful fail
            } finally {
                setLoading(false);
            }
        };
        fetchData();

        window.addEventListener('app:leaveStatusChanged', fetchData);
        return () => window.removeEventListener('app:leaveStatusChanged', fetchData);
    }, [user._id]);

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-7 w-48 mb-2" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Skeleton className="h-[100px] rounded-2xl" />
                    <Skeleton className="h-[100px] rounded-2xl" />
                    <Skeleton className="h-[100px] rounded-2xl" />
                </div>
                <Skeleton className="h-[300px] rounded-2xl w-full" />
            </div>
        );
    }

    const balance = user.leaveBalance || {};
    const balanceEntries = Object.entries(balance);

    // Donut data for leave balance
    const balanceChartData = balanceEntries.length > 0 ? {
        labels: balanceEntries.map(([t]) => capitalize(t)),
        datasets: [{
            data: balanceEntries.map(([, v]) => v),
            backgroundColor: ['#E86A33', '#41B883', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899'],
            borderWidth: 0,
            hoverOffset: 6,
        }],
    } : null;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-display text-txt-primary">
                        Good {getGreeting()}, {user.name?.split(' ')[0]}
                    </h2>
                    <p className="text-sm text-txt-muted">Here's your leave overview</p>
                </div>
                <Button onClick={() => navigate('/apply-leave')}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mr-2"><path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                    Apply Leave
                </Button>
            </div>

            {/* Balance Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {balanceEntries.map(([type, value]) => (
                    <StatCard key={type} title={capitalize(type) + ' Leave'} value={value} subtitle="days remaining" />
                ))}
            </div>

            {/* Balance Donut + Recent Requests */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {balanceChartData && (
                    <Card>
                        <CardHeader><CardTitle>Balance Breakdown</CardTitle></CardHeader>
                        <div className="flex justify-center">
                            <div className="w-48 h-48">
                                <Doughnut data={balanceChartData} options={{
                                    responsive: true, maintainAspectRatio: false,
                                    cutout: '65%',
                                    plugins: { legend: { position: 'bottom', labels: { color: getThemeColor('--text-muted'), font: { size: 11 }, padding: 12, usePointStyle: true, pointStyleWidth: 8 } } },
                                }} />
                            </div>
                        </div>
                    </Card>
                )}

                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Recent Leave Requests</CardTitle>
                        <Link to="/leave-history" className="text-xs text-accent hover:underline">View all</Link>
                    </CardHeader>
                    {leaves.length === 0 ? (
                        <p className="text-sm text-txt-muted text-center py-6">No leave history yet</p>
                    ) : (
                        <div className="space-y-1">
                            {leaves.map((leave) => (
                                <div key={leave._id} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <span className={cn(
                                            'text-sm font-bold',
                                            leave.totalDays >= 5 ? 'text-accent-danger' : 'text-accent'
                                        )}>
                                            {leave.totalDays}d
                                        </span>
                                        <div>
                                            <p className="text-sm text-txt-primary">{getLeaveTypeLabel(leave.leaveType)}</p>
                                            <p className="text-xs text-txt-muted">{formatDate(leave.startDate)} — {formatDate(leave.endDate)}</p>
                                        </div>
                                    </div>
                                    <Badge variant={leave.status === 'approved' ? 'success' : leave.status === 'rejected' ? 'danger' : leave.status === 'cancelled' ? 'neutral' : 'warning'}>
                                        {capitalize(leave.status)}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            {/* AI Suggestions */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1L10 5.5L15 6.5L11.5 10L12.5 15L8 12.5L3.5 15L4.5 10L1 6.5L6 5.5L8 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg>
                        Smart Suggestions
                    </CardTitle>
                </CardHeader>

                {suggestions?.shouldSuggest ? (
                    <div className="space-y-4">
                        {/* Main message */}
                        <p className="text-sm text-txt-secondary">{suggestions.message}</p>

                        {/* Optimal leave windows */}
                        {suggestions.windows?.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold text-txt-secondary uppercase tracking-wide mb-2">Suggested Time Off</p>
                                <div className="space-y-2">
                                    {suggestions.windows.map((w, i) => (
                                        <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-accent/5 border border-accent/10">
                                            <span className="text-accent mt-0.5 flex-shrink-0">→</span>
                                            <div>
                                                <p className="text-xs font-medium text-txt-primary">{w.startDate}{w.startDate !== w.endDate ? ` — ${w.endDate}` : ''}</p>
                                                <p className="text-xs text-txt-muted mt-0.5">{w.reason}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Upcoming holidays */}
                        {suggestions.upcomingHolidays?.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold text-txt-secondary uppercase tracking-wide mb-2">Upcoming Holidays</p>
                                <div className="flex flex-wrap gap-2">
                                    {suggestions.upcomingHolidays.map((h, i) => (
                                        <Badge key={i} variant="neutral">{h.name} · {h.date}</Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="flex items-start gap-2 text-sm text-txt-secondary">
                            <span className="text-accent-success mt-0.5 flex-shrink-0">✓</span>
                            <span>You're taking regular breaks — great work-life balance!</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm text-txt-secondary">
                            <span className="text-accent mt-0.5 flex-shrink-0">→</span>
                            <span>Check upcoming holidays to plan long weekends.</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm text-txt-secondary">
                            <span className="text-accent mt-0.5 flex-shrink-0">→</span>
                            <span>Use your leave balance wisely — plan ahead for maximum rest.</span>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}

// ━━━━━━━━━━ Manager Dashboard ━━━━━━━━━━
function ManagerDashboard({ user }) {
    const [pendingLeaves, setPendingLeaves] = useState([]);
    const [teamData, setTeamData] = useState(null);
    const [loading, setLoading] = useState(true);
    const { success, error: showError } = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [leavesRes, teamRes] = await Promise.all([
                    leaveService.getAll({ status: 'pending', limit: 10 }),
                    analyticsService.getTeamAnalytics().catch(() => ({ data: { data: null } })),
                ]);
                setPendingLeaves(leavesRes.data?.data?.leaves || []);
                setTeamData(teamRes.data?.data);
            } catch {
                //
            } finally {
                setLoading(false);
            }
        };
        fetchData();

        window.addEventListener('app:leaveStatusChanged', fetchData);
        return () => window.removeEventListener('app:leaveStatusChanged', fetchData);
    }, []);

    const handleAction = async (leaveId, status) => {
        try {
            await leaveService.updateStatus(leaveId, { status });
            success(`Leave ${status} successfully`);
            setPendingLeaves((prev) => prev.filter((l) => l._id !== leaveId));
        } catch (err) {
            showError(err.response?.data?.message || `Failed to ${status} leave`);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-7 w-48 mb-2" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Skeleton className="h-[100px] rounded-2xl" />
                    <Skeleton className="h-[100px] rounded-2xl" />
                    <Skeleton className="h-[100px] rounded-2xl" />
                </div>
                <Skeleton className="h-[300px] rounded-2xl w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-display text-txt-primary">
                Good {getGreeting()}, {user.name?.split(' ')[0]}
            </h2>

            {/* Team Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard title="Team Size" value={teamData?.teamSize || 0} icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="6.75" cy="5.25" r="2.5" stroke="currentColor" strokeWidth="1.5" /><path d="M1.5 15C1.5 12.1 3.85 9.75 6.75 9.75C9.65 9.75 12 12.1 12 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>} />
                <StatCard title="On Leave Today" value={teamData?.onLeaveToday?.length || 0} icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2.25 15.75H15.75M3.75 15.75V9L9 4.5L14.25 9V15.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>} />
                <StatCard title="Pending Approvals" value={pendingLeaves.length} icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.5" /><path d="M9 4.5V9L12 11.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>} />
            </div>

            {/* Pending Approvals */}
            <Card>
                <CardHeader>
                    <CardTitle>Pending Approvals</CardTitle>
                    <Link to="/leave-history" className="text-xs text-accent hover:underline">View all requests</Link>
                </CardHeader>
                {pendingLeaves.length === 0 ? (
                    <EmptyState title="All caught up" description="No pending leave requests." />
                ) : (
                    <div className="space-y-3">
                        {pendingLeaves.map((leave) => (
                            <div key={leave._id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-3 border-b border-border/50 last:border-0 gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xs font-bold">
                                        {leave.employee?.name?.[0] || '?'}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-txt-primary">{leave.employee?.name}</p>
                                        <p className="text-xs text-txt-muted">
                                            {getLeaveTypeLabel(leave.leaveType)} · {leave.totalDays}d · {formatDate(leave.startDate)} — {formatDate(leave.endDate)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <Button size="sm" variant="success" onClick={() => handleAction(leave._id, 'approved')}>
                                        Approve
                                    </Button>
                                    <Button size="sm" variant="danger" onClick={() => handleAction(leave._id, 'rejected')}>
                                        Reject
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* On Leave Today */}
            {teamData?.onLeaveToday?.length > 0 && (
                <Card>
                    <CardHeader><CardTitle>On Leave Today</CardTitle></CardHeader>
                    <div className="flex flex-wrap gap-2">
                        {teamData.onLeaveToday.map((m) => (
                            <Badge key={m.leaveId} variant="neutral">{m.name}</Badge>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
}

// ━━━━━━━━━━ Admin Dashboard ━━━━━━━━━━
function AdminDashboard({ user }) {
    const [overview, setOverview] = useState(null);
    const [monthlyTrend, setMonthlyTrend] = useState([]);
    const [distribution, setDistribution] = useState([]);
    const [recentLeaves, setRecentLeaves] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [overviewRes, trendRes, distRes, recentRes] = await Promise.all([
                    analyticsService.getOverview(),
                    analyticsService.getMonthlyTrend().catch(() => ({ data: { data: { trend: [] } } })),
                    analyticsService.getLeaveDistribution().catch(() => ({ data: { data: { distribution: [] } } })),
                    leaveService.getAll({ limit: 8, sortBy: 'appliedAt', order: 'desc' }).catch(() => ({ data: { data: { leaves: [] } } })),
                ]);
                setOverview(overviewRes.data?.data?.overview);
                setMonthlyTrend(trendRes.data?.data?.trend || []);
                setDistribution(distRes.data?.data?.distribution || []);
                setRecentLeaves(recentRes.data?.data?.leaves || []);
            } catch {
                //
            } finally {
                setLoading(false);
            }
        };
        fetchData();

        window.addEventListener('app:leaveStatusChanged', fetchData);
        return () => window.removeEventListener('app:leaveStatusChanged', fetchData);
    }, []);

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-7 w-64 mb-2" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Skeleton className="h-[100px] rounded-2xl" />
                    <Skeleton className="h-[100px] rounded-2xl" />
                    <Skeleton className="h-[100px] rounded-2xl" />
                    <Skeleton className="h-[100px] rounded-2xl" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <Skeleton className="h-[280px] rounded-2xl lg:col-span-2" />
                    <Skeleton className="h-[280px] rounded-2xl" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Skeleton className="h-[200px] rounded-2xl" />
                    <Skeleton className="h-[200px] rounded-2xl" />
                </div>
            </div>
        );
    }

    // ━━ Chart Data ━━
    const barData = {
        labels: monthlyTrend.map((t) => t.label),
        datasets: [
            {
                label: 'Approved',
                data: monthlyTrend.map((t) => t.approved),
                backgroundColor: '#41B883',
                borderRadius: 4,
                barPercentage: 0.6,
            },
            {
                label: 'Rejected',
                data: monthlyTrend.map((t) => t.rejected),
                backgroundColor: '#E86A33',
                borderRadius: 4,
                barPercentage: 0.6,
            },
        ],
    };

    const barOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                align: 'end',
                labels: { color: getThemeColor('--text-muted'), font: { size: 11 }, usePointStyle: true, pointStyleWidth: 8, padding: 16 },
            },
            tooltip: {
                backgroundColor: getThemeColor('--bg-surface'),
                titleColor: getThemeColor('--text-primary'),
                bodyColor: getThemeColor('--text-secondary'),
                borderColor: getThemeColor('--border'),
                borderWidth: 1,
                cornerRadius: 8,
                padding: 10,
            },
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: getThemeColor('--text-muted'), font: { size: 10 } },
            },
            y: {
                grid: { color: getThemeColor('--border'), lineWidth: 0.5 },
                ticks: { color: getThemeColor('--text-muted'), font: { size: 10 }, stepSize: 1 },
                beginAtZero: true,
            },
        },
    };

    const typeColors = ['#E86A33', '#41B883', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899'];
    const donutData = {
        labels: distribution.map((d) => capitalize(d._id)),
        datasets: [{
            data: distribution.map((d) => d.totalDays),
            backgroundColor: typeColors.slice(0, distribution.length),
            borderWidth: 0,
            hoverOffset: 6,
        }],
    };

    const donutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
            legend: {
                position: 'bottom',
                labels: { color: getThemeColor('--text-muted'), font: { size: 11 }, padding: 12, usePointStyle: true, pointStyleWidth: 8 },
            },
        },
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-display text-txt-primary">
                Good {getGreeting()}, {user.name?.split(' ')[0]}
            </h2>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Employees"
                    value={overview?.totalEmployees || 0}
                    icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="6.75" cy="5.25" r="2.5" stroke="currentColor" strokeWidth="1.5" /><path d="M1.5 15C1.5 12.1 3.85 9.75 6.75 9.75C9.65 9.75 12 12.1 12 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>}
                />
                <StatCard
                    title="Total Leaves"
                    value={overview?.totalLeaves || 0}
                    icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M5.25 2.25V4.5M12.75 2.25V4.5M2.25 7.5H15.75M3 3.75H15C15.4142 3.75 15.75 4.08579 15.75 4.5V15C15.75 15.4142 15.4142 15.75 15 15.75H3C2.58579 15.75 2.25 15.4142 2.25 15V4.5C2.25 4.08579 2.58579 3.75 3 3.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>}
                />
                <StatCard
                    title="Pending"
                    value={overview?.pendingLeaves || 0}
                    icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.5" /><path d="M9 4.5V9L12 11.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>}
                />
                <StatCard
                    title="On Leave Today"
                    value={overview?.onLeaveToday || 0}
                    trend={overview?.approvalDelta}
                    icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2.25 15.75H15.75M3.75 15.75V9L9 4.5L14.25 9V15.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Monthly Trend Bar Chart */}
                <Card className="lg:col-span-2">
                    <CardHeader><CardTitle>Monthly Leave Trend</CardTitle></CardHeader>
                    <div className="h-[250px]">
                        {monthlyTrend.length > 0 ? (
                            <Bar data={barData} options={barOptions} />
                        ) : (
                            <div className="h-full flex items-center justify-center text-sm text-txt-muted">No trend data available</div>
                        )}
                    </div>
                </Card>

                {/* Leave Type Distribution */}
                <Card>
                    <CardHeader><CardTitle>Leave Distribution</CardTitle></CardHeader>
                    <div className="h-[250px] flex items-center justify-center">
                        {distribution.length > 0 ? (
                            <Doughnut data={donutData} options={donutOptions} />
                        ) : (
                            <p className="text-sm text-txt-muted">No distribution data</p>
                        )}
                    </div>
                </Card>
            </div>

            {/* Approval Rate + Recent Activity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader><CardTitle>Approval Rate This Month</CardTitle></CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="text-4xl font-bold font-display text-accent">{overview?.approvalRate || 0}%</div>
                        <div>
                            <p className="text-sm text-txt-muted">Approved: {overview?.approvedThisMonth || 0}</p>
                            <p className="text-xs text-txt-muted">vs last month: {overview?.approvedLastMonth || 0}</p>
                        </div>
                    </div>
                    {/* Mini visual bar */}
                    <div className="mt-4 h-2 bg-elevated rounded-full overflow-hidden">
                        <div
                            className="h-full bg-accent rounded-full transition-all duration-500"
                            style={{ width: `${overview?.approvalRate || 0}%` }}
                        />
                    </div>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <Link to="/leave-history" className="text-xs text-accent hover:underline">View all</Link>
                    </CardHeader>
                    {recentLeaves.length === 0 ? (
                        <p className="text-sm text-txt-muted text-center py-6">No recent activity</p>
                    ) : (
                        <div className="space-y-1 max-h-52 overflow-y-auto">
                            {recentLeaves.map((leave) => (
                                <div key={leave._id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center text-accent text-[10px] font-bold flex-shrink-0">
                                            {leave.employee?.name?.[0] || '?'}
                                        </div>
                                        <div>
                                            <p className="text-xs text-txt-primary">{leave.employee?.name || 'Unknown'}</p>
                                            <p className="text-[10px] text-txt-muted">{getLeaveTypeLabel(leave.leaveType)} · {timeAgo(leave.appliedAt)}</p>
                                        </div>
                                    </div>
                                    <Badge variant={leave.status === 'approved' ? 'success' : leave.status === 'rejected' ? 'danger' : leave.status === 'cancelled' ? 'neutral' : 'warning'} className="text-[10px]">
                                        {capitalize(leave.status)}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            {/* Quick Actions */}
            <Card>
                <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
                <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => window.location.href = '/leave-history'}>Review Leaves</Button>
                    <Button size="sm" variant="secondary" onClick={() => window.location.href = '/admin/users'}>Manage Users</Button>
                    <Button size="sm" variant="secondary" onClick={() => window.location.href = '/admin/departments'}>Departments</Button>
                    <Button size="sm" variant="secondary" onClick={() => window.location.href = '/audit-log'}>Audit Log</Button>
                    <Button size="sm" variant="secondary" onClick={() => window.location.href = '/ai-insights'}>AI Insights</Button>
                </div>
            </Card>
        </div>
    );
}

// Returns time-of-day greeting
function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
}
