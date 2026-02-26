import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { reimbursementService } from '../services';
import TopBar from '../components/layout/TopBar';
import Card, { CardHeader, CardTitle } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import StatCard from '../components/ui/StatCard';
import { Skeleton } from '../components/ui/Loader';
import EmptyState from '../components/ui/EmptyState';
import { formatDate, timeAgo } from '../utils/dateUtils';
import { capitalize } from '../utils/helpers';
import { cn } from '../utils/cn';

const categoryOptions = [
    { value: '', label: 'All Categories' },
    { value: 'travel', label: '✈️ Travel' },
    { value: 'medical', label: '🏥 Medical' },
    { value: 'food', label: '🍽️ Food' },
    { value: 'equipment', label: '💻 Equipment' },
    { value: 'training', label: '📚 Training' },
    { value: 'other', label: '📦 Other' },
];

const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'manager_approved', label: 'Pending Admin Approval' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'cancelled', label: 'Cancelled' },
];

// Human-readable status labels
const statusLabels = {
    pending: 'Pending',
    manager_approved: 'Pending Admin Approval',
    approved: 'Approved',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
};

const categoryLabels = {
    travel: '✈️ Travel', medical: '🏥 Medical', food: '🍽️ Food',
    equipment: '💻 Equipment', training: '📚 Training', other: '📦 Other',
};

const categoryFormOptions = [
    { value: 'travel', label: 'Travel' },
    { value: 'medical', label: 'Medical' },
    { value: 'food', label: 'Food & Meals' },
    { value: 'equipment', label: 'Equipment' },
    { value: 'training', label: 'Training & Courses' },
    { value: 'other', label: 'Other' },
];

export default function Reimbursements() {
    const { user } = useAuth();
    const { success, error: showError } = useToast();
    const isManager = user?.role === 'manager' || user?.role === 'admin';

    // State
    const [claims, setClaims] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ status: '', category: '' });
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({});
    const [showForm, setShowForm] = useState(false);
    const [selectedClaim, setSelectedClaim] = useState(null);
    const [approverComment, setApproverComment] = useState('');
    const [cancelConfirm, setCancelConfirm] = useState(null);
    const [sortBy, setSortBy] = useState('submittedAt');
    const [sortOrder, setSortOrder] = useState('desc');

    // Form state
    const [form, setForm] = useState({
        category: 'travel',
        amount: '',
        description: '',
        receiptUrl: '',
        expenseDate: '',
    });
    const [submitting, setSubmitting] = useState(false);

    // Fetch data
    useEffect(() => {
        fetchClaims();
        fetchStats();
    }, [page, filters]);

    const fetchClaims = async () => {
        setLoading(true);
        try {
            const params = {
                page, limit: 10,
                sortBy: 'submittedAt', order: 'desc',
                ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
            };
            const { data } = await reimbursementService.getAll(params);
            setClaims(data.data?.claims || []);
            setPagination(data.pagination || {});
        } catch {
            showError('Failed to load claims');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const { data } = await reimbursementService.getStats();
            setStats(data.data?.stats);
        } catch { /* silent */ }
    };

    // Submit form
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.amount || !form.description || !form.expenseDate) {
            showError('Please fill all required fields');
            return;
        }
        setSubmitting(true);
        try {
            await reimbursementService.submit({
                ...form,
                amount: parseFloat(form.amount),
            });
            success('Reimbursement claim submitted!');
            setShowForm(false);
            setForm({ category: 'travel', amount: '', description: '', receiptUrl: '', expenseDate: '' });
            fetchClaims();
            fetchStats();
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to submit claim');
        } finally {
            setSubmitting(false);
        }
    };

    // Approve / Reject
    const handleAction = async (claimId, status) => {
        try {
            await reimbursementService.updateStatus(claimId, { status, approverComment });
            success(`Claim ${status} successfully`);
            setSelectedClaim(null);
            setApproverComment('');
            fetchClaims();
            fetchStats();
        } catch (err) {
            showError(err.response?.data?.message || 'Action failed');
        }
    };

    // Cancel
    const handleCancel = async (claimId) => {
        try {
            await reimbursementService.cancel(claimId);
            success('Claim cancelled');
            setCancelConfirm(null);
            fetchClaims();
            fetchStats();
        } catch (err) {
            showError(err.response?.data?.message || 'Cancel failed');
        }
    };

    // Sorting
    const sortedClaims = useMemo(() => {
        return [...claims].sort((a, b) => {
            let aVal, bVal;
            switch (sortBy) {
                case 'amount': aVal = a.amount; bVal = b.amount; break;
                case 'category': aVal = a.category; bVal = b.category; break;
                case 'status': aVal = a.status; bVal = b.status; break;
                case 'expenseDate': aVal = new Date(a.expenseDate); bVal = new Date(b.expenseDate); break;
                default: aVal = new Date(a.submittedAt); bVal = new Date(b.submittedAt);
            }
            if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }, [claims, sortBy, sortOrder]);

    const handleSort = (col) => {
        if (sortBy === col) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
        else { setSortBy(col); setSortOrder('asc'); }
    };

    const SortHeader = ({ col, children }) => (
        <th
            className="text-xs font-medium text-txt-muted px-4 py-3 cursor-pointer select-none hover:text-txt-primary transition-colors"
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
            <TopBar title="Reimbursements" />
            <div className="p-4 md:p-6 page-enter">

                {/* Stats */}
                {stats && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                        <StatCard
                            title="Pending Claims"
                            value={stats.pending}
                            icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.5" /><path d="M9 4.5V9L12 11.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>}
                        />
                        <StatCard
                            title="Approved Claims"
                            value={stats.approved}
                            icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4.5 9L7.5 12L13.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                        />
                        <StatCard
                            title="Total Reimbursed"
                            value={`₹${stats.totalApprovedAmount.toLocaleString()}`}
                            icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 1.5V16.5M5.25 4.5H11.625C12.6605 4.5 13.5 5.33947 13.5 6.375C13.5 7.41053 12.6605 8.25 11.625 8.25H4.5M5.25 8.25H12.375C13.4105 8.25 14.25 9.08947 14.25 10.125C14.25 11.1605 13.4105 12 12.375 12H4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                        />
                    </div>
                )}

                {/* Filters + New Claim */}
                <div className="flex flex-wrap items-center gap-3 mb-6">
                    <Select
                        options={statusOptions}
                        value={filters.status}
                        onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}
                        className="w-40"
                    />
                    <Select
                        options={categoryOptions}
                        value={filters.category}
                        onChange={(e) => { setFilters({ ...filters, category: e.target.value }); setPage(1); }}
                        className="w-44"
                    />
                    <div className="flex-1" />
                    <Button onClick={() => setShowForm(true)}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mr-2"><path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                        New Claim
                    </Button>
                </div>

                {/* Claims Table */}
                {loading ? (
                    <Card className="overflow-hidden p-0">
                        <div className="p-4 space-y-3">
                            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
                        </div>
                    </Card>
                ) : claims.length === 0 ? (
                    <EmptyState
                        title="No reimbursement claims"
                        description={isManager ? "No claims to review." : "Submit your first expense claim."}
                        action={!isManager ? <Button size="sm" onClick={() => setShowForm(true)}>New Claim</Button> : null}
                    />
                ) : (
                    <Card className="overflow-hidden p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border text-left">
                                        {isManager && <th className="text-xs font-medium text-txt-muted px-4 py-3">Employee</th>}
                                        <SortHeader col="category">Category</SortHeader>
                                        <SortHeader col="amount">Amount</SortHeader>
                                        <SortHeader col="expenseDate">Expense Date</SortHeader>
                                        <SortHeader col="status">Status</SortHeader>
                                        <SortHeader col="submittedAt">Submitted</SortHeader>
                                        <th className="text-xs font-medium text-txt-muted px-4 py-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedClaims.map((claim) => (
                                        <tr key={claim._id} className="border-b border-border/50 table-row-hover">
                                            {isManager && (
                                                <td className="px-4 py-3">
                                                    <p className="text-sm font-medium text-txt-primary">{claim.employee?.name}</p>
                                                    <p className="text-xs text-txt-muted">{claim.employee?.email}</p>
                                                </td>
                                            )}
                                            <td className="px-4 py-3 text-sm text-txt-primary">{categoryLabels[claim.category] || claim.category}</td>
                                            <td className="px-4 py-3 text-sm font-semibold text-txt-primary">₹{claim.amount.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-xs text-txt-muted">{formatDate(claim.expenseDate)}</td>
                                            <td className="px-4 py-3">
                                                <Badge variant={claim.status === 'approved' ? 'success' : claim.status === 'rejected' ? 'danger' : claim.status === 'cancelled' ? 'neutral' : 'warning'}>
                                                    {statusLabels[claim.status] || capitalize(claim.status)}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-txt-muted">{timeAgo(claim.submittedAt)}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5">
                                                    {/* Manager can approve/reject only 'pending' employee claims */}
                                                    {user?.role === 'manager' && claim.status === 'pending' && (
                                                        <>
                                                            <Button size="sm" variant="success" onClick={() => handleAction(claim._id, 'approved')}>✓</Button>
                                                            <Button size="sm" variant="danger" onClick={() => setSelectedClaim(claim)}>✗</Button>
                                                        </>
                                                    )}
                                                    {/* Admin can approve/reject 'pending' and 'manager_approved' claims */}
                                                    {user?.role === 'admin' && (claim.status === 'pending' || claim.status === 'manager_approved') && (
                                                        <>
                                                            <Button size="sm" variant="success" onClick={() => handleAction(claim._id, 'approved')}>✓</Button>
                                                            <Button size="sm" variant="danger" onClick={() => setSelectedClaim(claim)}>✗</Button>
                                                        </>
                                                    )}
                                                    {/* Employee can cancel pending or manager_approved claims */}
                                                    {!isManager && (claim.status === 'pending' || claim.status === 'manager_approved') && (
                                                        <Button size="sm" variant="ghost" onClick={() => setCancelConfirm(claim)}>Cancel</Button>
                                                    )}
                                                    <button className="text-xs text-accent hover:underline" onClick={() => setSelectedClaim(claim)}>View</button>
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
                                <p className="text-xs text-txt-muted">Page {pagination.page} of {pagination.pages} ({pagination.total} total)</p>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                                    <Button size="sm" variant="ghost" disabled={page >= pagination.pages} onClick={() => setPage(page + 1)}>Next</Button>
                                </div>
                            </div>
                        )}
                    </Card>
                )}
            </div>

            {/* ━━━ Submit Claim Modal ━━━ */}
            <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Submit Reimbursement">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-txt-muted mb-1">Category *</label>
                        <Select
                            options={categoryFormOptions}
                            value={form.category}
                            onChange={(e) => setForm({ ...form, category: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-txt-muted mb-1">Amount (₹) *</label>
                        <Input
                            type="number"
                            placeholder="Enter amount"
                            value={form.amount}
                            onChange={(e) => setForm({ ...form, amount: e.target.value })}
                            min="1"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-txt-muted mb-1">Expense Date *</label>
                        <Input
                            type="date"
                            value={form.expenseDate}
                            onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-txt-muted mb-1">Description *</label>
                        <textarea
                            className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-txt-primary placeholder:text-txt-muted focus:outline-none focus:ring-2 focus:ring-accent/20 min-h-[80px] resize-none"
                            placeholder="Describe the expense (min 5 chars)..."
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            minLength={5}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-txt-muted mb-1">Receipt URL (optional)</label>
                        <Input
                            type="url"
                            placeholder="https://example.com/receipt.jpg"
                            value={form.receiptUrl}
                            onChange={(e) => setForm({ ...form, receiptUrl: e.target.value })}
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                        <Button type="submit" isLoading={submitting}>Submit Claim</Button>
                    </div>
                </form>
            </Modal>

            {/* ━━━ Claim Detail / Reject Modal ━━━ */}
            <Modal
                isOpen={!!selectedClaim}
                onClose={() => { setSelectedClaim(null); setApproverComment(''); }}
                title="Claim Details"
            >
                {selectedClaim && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div><span className="text-txt-muted">Employee:</span> <span className="text-txt-primary font-medium">{selectedClaim.employee?.name}</span></div>
                            <div><span className="text-txt-muted">Category:</span> <span className="text-txt-primary">{categoryLabels[selectedClaim.category]}</span></div>
                            <div><span className="text-txt-muted">Amount:</span> <span className="text-txt-primary font-bold">₹{selectedClaim.amount.toLocaleString()}</span></div>
                            <div><span className="text-txt-muted">Status:</span> <Badge variant={selectedClaim.status === 'approved' ? 'success' : selectedClaim.status === 'rejected' ? 'danger' : 'warning'}>{statusLabels[selectedClaim.status] || capitalize(selectedClaim.status)}</Badge></div>
                            <div className="col-span-2"><span className="text-txt-muted">Expense Date:</span> <span className="text-txt-primary">{formatDate(selectedClaim.expenseDate)}</span></div>
                            <div className="col-span-2"><span className="text-txt-muted">Description:</span> <span className="text-txt-primary">{selectedClaim.description}</span></div>
                            {selectedClaim.receiptUrl && (
                                <div className="col-span-2">
                                    <span className="text-txt-muted">Receipt:</span>{' '}
                                    <a href={selectedClaim.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline text-xs">View Receipt ↗</a>
                                </div>
                            )}
                            {selectedClaim.approverComment && (
                                <div className="col-span-2"><span className="text-txt-muted">Approver Comment:</span> <span className="text-txt-primary">{selectedClaim.approverComment}</span></div>
                            )}
                            {selectedClaim.approvedBy && (
                                <div className="col-span-2"><span className="text-txt-muted">Processed by:</span> <span className="text-txt-primary">{selectedClaim.approvedBy?.name}</span></div>
                            )}
                        </div>

                        {/* Approve/Reject for managers */}
                        {/* Manager: approve/reject only pending claims */}
                        {user?.role === 'manager' && selectedClaim.status === 'pending' && (
                            <div className="border-t border-border pt-4 space-y-3">
                                <textarea
                                    className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-txt-primary placeholder:text-txt-muted focus:outline-none focus:ring-2 focus:ring-accent/20 min-h-[80px] resize-none"
                                    placeholder="Comment (optional)..."
                                    value={approverComment}
                                    onChange={(e) => setApproverComment(e.target.value)}
                                />
                                <div className="flex justify-end gap-2">
                                    <Button size="sm" variant="success" onClick={() => handleAction(selectedClaim._id, 'approved')}>Approve</Button>
                                    <Button size="sm" variant="danger" onClick={() => handleAction(selectedClaim._id, 'rejected')}>Reject</Button>
                                </div>
                            </div>
                        )}
                        {/* Admin: approve/reject pending and manager_approved claims */}
                        {user?.role === 'admin' && (selectedClaim.status === 'pending' || selectedClaim.status === 'manager_approved') && (
                            <div className="border-t border-border pt-4 space-y-3">
                                <textarea
                                    className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-txt-primary placeholder:text-txt-muted focus:outline-none focus:ring-2 focus:ring-accent/20 min-h-[80px] resize-none"
                                    placeholder="Comment (optional)..."
                                    value={approverComment}
                                    onChange={(e) => setApproverComment(e.target.value)}
                                />
                                <div className="flex justify-end gap-2">
                                    <Button size="sm" variant="success" onClick={() => handleAction(selectedClaim._id, 'approved')}>Approve</Button>
                                    <Button size="sm" variant="danger" onClick={() => handleAction(selectedClaim._id, 'rejected')}>Reject</Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* ━━━ Cancel Confirmation ━━━ */}
            <Modal isOpen={!!cancelConfirm} onClose={() => setCancelConfirm(null)} title="Cancel Claim">
                {cancelConfirm && (
                    <div className="space-y-4">
                        <p className="text-sm text-txt-secondary">
                            Cancel your <strong>{categoryLabels[cancelConfirm.category]}</strong> claim for <strong>₹{cancelConfirm.amount.toLocaleString()}</strong>?
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
