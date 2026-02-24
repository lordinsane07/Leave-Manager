import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { leaveService } from '../services';
import TopBar from '../components/layout/TopBar';
import Card, { CardHeader, CardTitle } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import StatCard from '../components/ui/StatCard';
import Modal from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Loader';
import EmptyState from '../components/ui/EmptyState';
import { formatDate, timeAgo } from '../utils/dateUtils';
import { getLeaveTypeLabel, capitalize } from '../utils/helpers';
import { cn } from '../utils/cn';

const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'cancelled', label: 'Cancelled' },
];

export default function MyLeaves() {
    const { user } = useAuth();
    const { success, error: showError } = useToast();
    const navigate = useNavigate();

    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [cancelConfirm, setCancelConfirm] = useState(null);
    const [sortBy, setSortBy] = useState('appliedAt');
    const [sortOrder, setSortOrder] = useState('desc');

    useEffect(() => {
        fetchLeaves();

        window.addEventListener('app:leaveStatusChanged', fetchLeaves);
        return () => window.removeEventListener('app:leaveStatusChanged', fetchLeaves);
    }, [filter]);

    const fetchLeaves = async () => {
        setLoading(true);
        try {
            const params = { employee: user._id, limit: 50, sortBy: 'appliedAt', order: 'desc' };
            if (filter) params.status = filter;
            const { data } = await leaveService.getAll(params);
            setLeaves(data.data?.leaves || []);
        } catch {
            showError('Failed to load your leaves');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (leaveId) => {
        try {
            await leaveService.cancel(leaveId);
            success('Leave cancelled');
            setCancelConfirm(null);
            fetchLeaves();
        } catch (err) {
            showError(err.response?.data?.message || 'Cancel failed');
        }
    };

    // Balance
    const balance = user?.leaveBalance || {};
    const balanceEntries = Object.entries(balance);
    const totalBalance = balanceEntries.reduce((sum, [, v]) => sum + v, 0);

    // Quick stats from fetched leaves
    const pendingCount = leaves.filter(l => l.status === 'pending').length;
    const approvedCount = leaves.filter(l => l.status === 'approved').length;
    const usedDays = leaves.filter(l => l.status === 'approved').reduce((s, l) => s + (l.totalDays || 0), 0);

    // Sorting
    const sortedLeaves = useMemo(() => {
        return [...leaves].sort((a, b) => {
            let aVal, bVal;
            switch (sortBy) {
                case 'leaveType': aVal = a.leaveType; bVal = b.leaveType; break;
                case 'totalDays': aVal = a.totalDays; bVal = b.totalDays; break;
                case 'status': aVal = a.status; bVal = b.status; break;
                default: aVal = new Date(a.appliedAt); bVal = new Date(b.appliedAt);
            }
            if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }, [leaves, sortBy, sortOrder]);

    const handleSort = (col) => {
        if (sortBy === col) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
        else { setSortBy(col); setSortOrder('asc'); }
    };

    const SortHeader = ({ col, children }) => (
        <th
            className="text-xs font-medium text-txt-muted px-4 py-3 cursor-pointer select-none hover:text-txt-primary transition-colors text-left"
            onClick={() => handleSort(col)}
        >
            <span className="inline-flex items-center gap-1">
                {children}
                {sortBy === col && <span className="text-accent text-[10px]">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
            </span>
        </th>
    );

    return (
        <>
            <TopBar title="My Leaves" />
            <div className="p-4 md:p-6 page-enter">

                {/* Header with apply button */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
                    <div>
                        <h2 className="text-lg font-display text-txt-primary">Your Personal Leave Overview</h2>
                        <p className="text-sm text-txt-muted">Manage your own leave requests here</p>
                    </div>
                    <Button onClick={() => navigate('/apply-leave')}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mr-2"><path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                        Apply Leave
                    </Button>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <StatCard
                        title="Total Balance"
                        value={`${totalBalance} days`}
                        icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.5" /><path d="M9 4.5V9L12 11.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>}
                    />
                    <StatCard
                        title="Days Used"
                        value={usedDays}
                        icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4.5 9L7.5 12L13.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    />
                    <StatCard
                        title="Pending"
                        value={pendingCount}
                        icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.5" /><path d="M6.75 9H11.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>}
                    />
                    <StatCard
                        title="Approved"
                        value={approvedCount}
                        icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4.5 9L7.5 12L13.5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    />
                </div>

                {/* Leave Balance Breakdown */}
                {balanceEntries.length > 0 && (
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle>Leave Balance</CardTitle>
                        </CardHeader>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                            {balanceEntries.map(([type, days]) => (
                                <div key={type} className="bg-accent/5 rounded-xl p-3 text-center">
                                    <p className="text-xl font-bold font-display text-accent">{days}</p>
                                    <p className="text-[11px] text-txt-muted mt-1">{capitalize(type)}</p>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}

                {/* Filter */}
                <div className="flex items-center gap-3 mb-4">
                    <Select
                        options={statusOptions}
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="w-40"
                    />
                    <p className="text-xs text-txt-muted ml-auto">{leaves.length} request{leaves.length !== 1 ? 's' : ''}</p>
                </div>

                {/* Leave History Table */}
                {loading ? (
                    <Card className="overflow-hidden p-0">
                        <div className="p-4 space-y-3">
                            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
                        </div>
                    </Card>
                ) : leaves.length === 0 ? (
                    <EmptyState
                        title="No leave requests"
                        description="You haven't applied for any leave yet."
                        action={<Button size="sm" onClick={() => navigate('/apply-leave')}>Apply Now</Button>}
                    />
                ) : (
                    <Card className="overflow-hidden p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border text-left">
                                        <SortHeader col="leaveType">Type</SortHeader>
                                        <SortHeader col="totalDays">Duration</SortHeader>
                                        <th className="text-xs font-medium text-txt-muted px-4 py-3">Dates</th>
                                        <SortHeader col="status">Status</SortHeader>
                                        <SortHeader col="appliedAt">Applied</SortHeader>
                                        <th className="text-xs font-medium text-txt-muted px-4 py-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedLeaves.map((leave) => (
                                        <tr key={leave._id} className="border-b border-border/50 table-row-hover">
                                            <td className="px-4 py-3 text-sm text-txt-primary font-medium">{getLeaveTypeLabel(leave.leaveType)}</td>
                                            <td className="px-4 py-3">
                                                <span className={cn(
                                                    'text-sm font-bold',
                                                    leave.totalDays >= 5 ? 'text-accent-danger' : 'text-accent'
                                                )}>
                                                    {leave.totalDays}d
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-txt-muted">
                                                {formatDate(leave.startDate)} — {formatDate(leave.endDate)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant={
                                                    leave.status === 'approved' ? 'success' :
                                                        leave.status === 'rejected' ? 'danger' :
                                                            leave.status === 'cancelled' ? 'neutral' : 'warning'
                                                }>
                                                    {capitalize(leave.status)}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-txt-muted">{timeAgo(leave.appliedAt)}</td>
                                            <td className="px-4 py-3">
                                                {leave.status === 'pending' && (
                                                    <Button size="sm" variant="ghost" onClick={() => setCancelConfirm(leave)}>Cancel</Button>
                                                )}
                                                {leave.managerComment && (
                                                    <span className="text-[10px] text-txt-muted ml-1" title={leave.managerComment}>💬</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}
            </div>

            {/* Cancel confirmation */}
            <Modal isOpen={!!cancelConfirm} onClose={() => setCancelConfirm(null)} title="Cancel Leave Request">
                {cancelConfirm && (
                    <div className="space-y-4">
                        <p className="text-sm text-txt-secondary">
                            Cancel your <strong>{getLeaveTypeLabel(cancelConfirm.leaveType)}</strong> request for{' '}
                            <strong>{cancelConfirm.totalDays} day{cancelConfirm.totalDays > 1 ? 's' : ''}</strong>?
                        </p>
                        <p className="text-xs text-txt-muted">{formatDate(cancelConfirm.startDate)} — {formatDate(cancelConfirm.endDate)}</p>
                        <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setCancelConfirm(null)}>Keep it</Button>
                            <Button size="sm" variant="danger" onClick={() => handleCancel(cancelConfirm._id)}>Yes, Cancel</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
}
