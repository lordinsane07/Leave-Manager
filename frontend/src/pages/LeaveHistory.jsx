import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { leaveService } from '../services';
import TopBar from '../components/layout/TopBar';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import { Skeleton } from '../components/ui/Loader';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import LeaveCalendar from '../components/ui/LeaveCalendar';
import { formatDate, timeAgo } from '../utils/dateUtils';
import { getLeaveTypeLabel, capitalize, truncate } from '../utils/helpers';
import { exportLeavesToCSV } from '../utils/exportUtils';
import { cn } from '../utils/cn';

const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'expired', label: 'Expired' },
];

const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'annual', label: 'Annual' },
    { value: 'sick', label: 'Sick' },
    { value: 'personal', label: 'Personal' },
];

export default function LeaveHistory() {
    const { user } = useAuth();
    const { success, error: showError } = useToast();
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ status: '', leaveType: '' });
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({});
    const [selectedLeave, setSelectedLeave] = useState(null);
    const [rejectComment, setRejectComment] = useState('');
    const [viewMode, setViewMode] = useState('list');
    const [sortBy, setSortBy] = useState('appliedAt');
    const [sortOrder, setSortOrder] = useState('desc');
    const [selectedIds, setSelectedIds] = useState([]);
    const [cancelConfirm, setCancelConfirm] = useState(null);
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [actionProcessing, setActionProcessing] = useState(null);

    const isManager = user?.role === 'manager' || user?.role === 'admin';

    useEffect(() => {
        fetchLeaves();

        window.addEventListener('app:leaveStatusChanged', fetchLeaves);
        return () => window.removeEventListener('app:leaveStatusChanged', fetchLeaves);
    }, [page, filters]);

    const fetchLeaves = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const params = {
                page,
                limit: 10,
                sortBy: 'appliedAt',
                order: 'desc',
                ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
            };
            const { data } = await leaveService.getAll(params);
            setLeaves(data.data?.leaves || []);
            setPagination(data.pagination || {});
            setSelectedIds([]);
        } catch {
            if (!silent) showError('Failed to load leaves');
        } finally {
            if (!silent) setLoading(false);
        }
    };

    // Client-side sorting
    const sortedLeaves = useMemo(() => {
        const sorted = [...leaves].sort((a, b) => {
            let aVal, bVal;
            switch (sortBy) {
                case 'leaveType': aVal = a.leaveType; bVal = b.leaveType; break;
                case 'totalDays': aVal = a.totalDays; bVal = b.totalDays; break;
                case 'startDate': aVal = new Date(a.startDate); bVal = new Date(b.startDate); break;
                case 'status': aVal = a.status; bVal = b.status; break;
                default: aVal = new Date(a.appliedAt); bVal = new Date(b.appliedAt);
            }
            if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [leaves, sortBy, sortOrder]);

    const handleSort = (col) => {
        if (sortBy === col) {
            setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(col);
            setSortOrder('asc');
        }
    };

    const SortHeader = ({ col, children }) => (
        <th
            className="text-xs font-medium text-txt-muted px-4 py-3 cursor-pointer select-none hover:text-txt-primary transition-colors"
            onClick={() => handleSort(col)}
        >
            <span className="inline-flex items-center gap-1">
                {children}
                {sortBy === col && (
                    <span className="text-accent text-[10px]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                )}
            </span>
        </th>
    );

    const handleAction = async (leaveId, status) => {
        if (actionProcessing) return;
        setActionProcessing({ id: leaveId, status });
        try {
            const payload = { status };
            if (status === 'rejected' && rejectComment) {
                payload.managerComment = rejectComment;
            }
            await leaveService.updateStatus(leaveId, payload);
            // Optimistically update local state so UI reflects the change instantly
            setLeaves(prev => prev.map(l =>
                l._id === leaveId ? { ...l, status } : l
            ));
            success(`Leave ${status} successfully`);
            setSelectedLeave(null);
            setRejectComment('');
            // Delay re-fetch so backend has time to commit the write
            setTimeout(() => fetchLeaves(true), 2000);
        } catch (err) {
            showError(err.response?.data?.message || 'Action failed');
        } finally {
            setActionProcessing(null);
        }
    };

    const handleCancel = async (leaveId) => {
        try {
            await leaveService.cancel(leaveId);
            setLeaves(prev => prev.map(l =>
                l._id === leaveId ? { ...l, status: 'cancelled' } : l
            ));
            success('Leave cancelled');
            setCancelConfirm(null);
            setTimeout(() => fetchLeaves(true), 2000);
        } catch (err) {
            showError(err.response?.data?.message || 'Cancel failed');
        }
    };

    // Bulk actions
    const pendingSelected = selectedIds.filter(id => leaves.find(l => l._id === id && l.status === 'pending'));
    const toggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };
    const toggleSelectAll = () => {
        const pendingIds = leaves.filter(l => l.status === 'pending').map(l => l._id);
        if (pendingIds.every(id => selectedIds.includes(id))) {
            setSelectedIds([]);
        } else {
            setSelectedIds(pendingIds);
        }
    };

    const handleBulkAction = async (status) => {
        setBulkProcessing(true);
        let successCount = 0;
        for (const id of pendingSelected) {
            try {
                await leaveService.updateStatus(id, { status });
                successCount++;
            } catch { /* continue */ }
        }
        setBulkProcessing(false);
        success(`${successCount} leave(s) ${status} successfully`);
        setTimeout(() => fetchLeaves(true), 2000);
    };

    return (
        <>
            <TopBar title={isManager ? 'Leave Requests' : 'Leave History'} />
            <div className="p-4 md:p-6 page-enter">
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 mb-6">
                    <Select
                        options={statusOptions}
                        value={filters.status}
                        onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}
                        className="w-40"
                    />
                    <Select
                        options={typeOptions}
                        value={filters.leaveType}
                        onChange={(e) => { setFilters({ ...filters, leaveType: e.target.value }); setPage(1); }}
                        className="w-40"
                    />

                    {/* View Toggle */}
                    <div className="flex bg-elevated rounded-lg p-1 border border-border mt-2 sm:mt-0 lg:ml-auto">
                        <button
                            className={cn("px-4 py-1.5 text-sm font-medium rounded-md transition-colors", viewMode === 'list' ? "bg-surface text-txt-primary shadow-sm" : "text-txt-muted hover:text-txt-primary")}
                            onClick={() => setViewMode('list')}
                        >
                            List
                        </button>
                        <button
                            className={cn("px-4 py-1.5 text-sm font-medium rounded-md transition-colors", viewMode === 'calendar' ? "bg-surface text-txt-primary shadow-sm" : "text-txt-muted hover:text-txt-primary")}
                            onClick={() => setViewMode('calendar')}
                        >
                            Calendar
                        </button>
                    </div>

                    <Button variant="ghost" size="sm" onClick={() => exportLeavesToCSV(leaves)}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mr-1.5"><path d="M7 1V10M7 10L4 7M7 10L10 7M1.5 12.5H12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        Export CSV
                    </Button>
                </div>

                {/* Bulk Action Bar */}
                {isManager && pendingSelected.length > 0 && (
                    <div className="mb-4 flex items-center gap-3 bg-accent/10 border border-accent/20 rounded-xl px-4 py-2.5 animate-fade-in">
                        <span className="text-sm font-medium text-accent">{pendingSelected.length} selected</span>
                        <div className="flex-1" />
                        <Button size="sm" variant="success" onClick={() => handleBulkAction('approved')} isLoading={bulkProcessing}>
                            Approve All
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => handleBulkAction('rejected')} isLoading={bulkProcessing}>
                            Reject All
                        </Button>
                        <button className="text-xs text-txt-muted hover:text-txt-primary" onClick={() => setSelectedIds([])}>Clear</button>
                    </div>
                )}

                {/* Leave Display Area */}
                {loading ? (
                    <Card className="overflow-hidden p-0">
                        <div className="p-4 space-y-3">
                            {[...Array(6)].map((_, i) => (
                                <Skeleton key={i} className="h-14 rounded-lg" />
                            ))}
                        </div>
                    </Card>
                ) : leaves.length === 0 ? (
                    <EmptyState title="No leaves found" description="No leave records match your filters." />
                ) : viewMode === 'calendar' ? (
                    <LeaveCalendar leaves={leaves} onDateClick={(_, ds) => { if (ds.length > 0) setSelectedLeave(ds[0]) }} />
                ) : (
                    <Card className="overflow-hidden p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border text-left">
                                        {isManager && (
                                            <th className="px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={leaves.filter(l => l.status === 'pending').length > 0 && leaves.filter(l => l.status === 'pending').every(l => selectedIds.includes(l._id))}
                                                    onChange={toggleSelectAll}
                                                    className="rounded border-border accent-accent"
                                                />
                                            </th>
                                        )}
                                        {isManager && <th className="text-xs font-medium text-txt-muted px-4 py-3">Employee</th>}
                                        <SortHeader col="leaveType">Type</SortHeader>
                                        <SortHeader col="totalDays">Duration</SortHeader>
                                        <SortHeader col="startDate">Dates</SortHeader>
                                        <SortHeader col="status">Status</SortHeader>
                                        <SortHeader col="appliedAt">Applied</SortHeader>
                                        <th className="text-xs font-medium text-txt-muted px-4 py-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedLeaves.map((leave) => (
                                        <tr key={leave._id} className="border-b border-border/50 table-row-hover">
                                            {isManager && (
                                                <td className="px-4 py-3">
                                                    {leave.status === 'pending' ? (
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedIds.includes(leave._id)}
                                                            onChange={() => toggleSelect(leave._id)}
                                                            className="rounded border-border accent-accent"
                                                        />
                                                    ) : <span className="w-4" />}
                                                </td>
                                            )}
                                            {isManager && (
                                                <td className="px-4 py-3">
                                                    <p className="text-sm font-medium text-txt-primary">{leave.employee?.name}</p>
                                                    <p className="text-xs text-txt-muted">{leave.employee?.email}</p>
                                                </td>
                                            )}
                                            <td className="px-4 py-3 text-sm text-txt-primary">{getLeaveTypeLabel(leave.leaveType)}</td>
                                            <td className="px-4 py-3 text-sm text-txt-primary">{leave.totalDays} day{leave.totalDays > 1 ? 's' : ''}</td>
                                            <td className="px-4 py-3 text-xs text-txt-muted">{formatDate(leave.startDate)} — {formatDate(leave.endDate)}</td>
                                            <td className="px-4 py-3"><Badge variant={leave.status}>{capitalize(leave.status)}</Badge></td>
                                            <td className="px-4 py-3 text-xs text-txt-muted">{timeAgo(leave.appliedAt)}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5">
                                                    {isManager && leave.status === 'pending' && (
                                                        <>
                                                            <Button size="sm" variant="success"
                                                                isLoading={actionProcessing?.id === leave._id && actionProcessing?.status === 'approved'}
                                                                disabled={!!actionProcessing}
                                                                onClick={() => handleAction(leave._id, 'approved')}>✓</Button>
                                                            <Button size="sm" variant="danger"
                                                                disabled={!!actionProcessing}
                                                                onClick={() => setSelectedLeave(leave)}>✗</Button>
                                                        </>
                                                    )}
                                                    {!isManager && leave.status === 'pending' && (
                                                        <Button size="sm" variant="ghost" onClick={() => setCancelConfirm(leave)}>Cancel</Button>
                                                    )}
                                                    <button
                                                        className="text-xs text-accent hover:underline"
                                                        onClick={() => setSelectedLeave(leave)}
                                                        title={leave.reason}
                                                    >
                                                        View
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {pagination.pages > 1 && (
                            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                                <p className="text-xs text-txt-muted">
                                    Page {pagination.page} of {pagination.pages} ({pagination.total} total)
                                </p>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                                        Previous
                                    </Button>
                                    <Button size="sm" variant="ghost" disabled={page >= pagination.pages} onClick={() => setPage(page + 1)}>
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Card>
                )}
            </div>

            {/* Leave Detail / Reject Modal */}
            <Modal
                isOpen={!!selectedLeave}
                onClose={() => { setSelectedLeave(null); setRejectComment(''); }}
                title="Leave Details"
            >
                {selectedLeave && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div><span className="text-txt-muted">Employee:</span> <span className="text-txt-primary font-medium">{selectedLeave.employee?.name}</span></div>
                            <div><span className="text-txt-muted">Type:</span> <span className="text-txt-primary">{getLeaveTypeLabel(selectedLeave.leaveType)}</span></div>
                            <div><span className="text-txt-muted">Duration:</span> <span className="text-txt-primary">{selectedLeave.totalDays} day(s)</span></div>
                            <div><span className="text-txt-muted">Status:</span> <Badge variant={selectedLeave.status}>{capitalize(selectedLeave.status)}</Badge></div>
                            <div className="col-span-2"><span className="text-txt-muted">Dates:</span> <span className="text-txt-primary">{formatDate(selectedLeave.startDate)} — {formatDate(selectedLeave.endDate)}</span></div>
                            <div className="col-span-2"><span className="text-txt-muted">Reason:</span> <span className="text-txt-primary">{selectedLeave.reason}</span></div>
                            {selectedLeave.managerComment && (
                                <div className="col-span-2"><span className="text-txt-muted">Manager Comment:</span> <span className="text-txt-primary">{selectedLeave.managerComment}</span></div>
                            )}
                        </div>

                        {/* Reject with comment for managers */}
                        {isManager && selectedLeave.status === 'pending' && (
                            <div className="border-t border-border pt-4 space-y-3">
                                <textarea
                                    className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-txt-primary placeholder:text-txt-muted focus:outline-none focus:ring-2 focus:ring-accent/20 min-h-[80px] resize-none"
                                    placeholder="Rejection reason (optional)..."
                                    value={rejectComment}
                                    onChange={(e) => setRejectComment(e.target.value)}
                                />
                                <div className="flex justify-end gap-2">
                                    <Button size="sm" variant="success"
                                        isLoading={actionProcessing?.id === selectedLeave._id && actionProcessing?.status === 'approved'}
                                        disabled={!!actionProcessing}
                                        onClick={() => handleAction(selectedLeave._id, 'approved')}>
                                        Approve
                                    </Button>
                                    <Button size="sm" variant="danger"
                                        isLoading={actionProcessing?.id === selectedLeave._id && actionProcessing?.status === 'rejected'}
                                        disabled={!!actionProcessing}
                                        onClick={() => handleAction(selectedLeave._id, 'rejected')}>
                                        Reject
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* Cancel Confirmation Dialog */}
            <Modal
                isOpen={!!cancelConfirm}
                onClose={() => setCancelConfirm(null)}
                title="Cancel Leave"
            >
                {cancelConfirm && (
                    <div className="space-y-4">
                        <p className="text-sm text-txt-secondary">
                            Are you sure you want to cancel your <strong>{getLeaveTypeLabel(cancelConfirm.leaveType)}</strong> leave
                            from <strong>{formatDate(cancelConfirm.startDate)}</strong> to <strong>{formatDate(cancelConfirm.endDate)}</strong>?
                        </p>
                        <p className="text-xs text-txt-muted">This action cannot be undone.</p>
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
