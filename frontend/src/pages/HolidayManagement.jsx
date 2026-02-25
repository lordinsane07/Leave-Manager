import { useState, useEffect, useCallback } from 'react';
import { holidayService } from '../services';
import { useToast } from '../contexts/ToastContext';
import TopBar from '../components/layout/TopBar';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Loader';
import EmptyState from '../components/ui/EmptyState';
import { formatDate } from '../utils/dateUtils';

const typeOptions = [
    { value: 'national', label: 'National' },
    { value: 'company', label: 'Company' },
];

export default function HolidayManagement() {
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(true);
    const { success, error: showError } = useToast();

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editingHoliday, setEditingHoliday] = useState(null);
    const [deleteModal, setDeleteModal] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Form state
    const [form, setForm] = useState({ name: '', date: '', type: 'national', isRecurring: false });
    const [searchQuery, setSearchQuery] = useState('');

    const fetchHolidays = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await holidayService.getAll();
            const sorted = (data.data?.holidays || []).sort((a, b) => new Date(a.date) - new Date(b.date));
            setHolidays(sorted);
        } catch {
            //
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHolidays();
    }, [fetchHolidays]);

    const openCreate = () => {
        setEditingHoliday(null);
        setForm({ name: '', date: '', type: 'national', isRecurring: false });
        setModalOpen(true);
    };

    const openEdit = (holiday) => {
        setEditingHoliday(holiday);
        setForm({
            name: holiday.name,
            date: holiday.date ? new Date(holiday.date).toISOString().split('T')[0] : '',
            type: holiday.type || 'national',
            isRecurring: holiday.isRecurring || false,
        });
        setModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!form.name.trim() || !form.date) {
            showError('Name and Date are required');
            return;
        }
        setActionLoading(true);
        try {
            const payload = {
                name: form.name.trim(),
                date: form.date,
                type: form.type,
                isRecurring: form.isRecurring,
                year: new Date(form.date).getFullYear(),
            };

            if (editingHoliday) {
                await holidayService.update(editingHoliday._id, payload);
                success('Holiday updated');
            } else {
                await holidayService.create(payload);
                success('Holiday created');
            }
            setModalOpen(false);
            setEditingHoliday(null);
            fetchHolidays();
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to save holiday');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteModal) return;
        setActionLoading(true);
        try {
            await holidayService.delete(deleteModal._id);
            success('Holiday deleted');
            setDeleteModal(null);
            fetchHolidays();
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to delete holiday');
        } finally {
            setActionLoading(false);
        }
    };

    const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

    // Group holidays by month (filtered by search)
    const filtered = holidays.filter(h => h.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const grouped = filtered.reduce((acc, h) => {
        const month = new Date(h.date).toLocaleString('default', { month: 'long', year: 'numeric' });
        if (!acc[month]) acc[month] = [];
        acc[month].push(h);
        return acc;
    }, {});

    return (
        <>
            <TopBar title="Holiday Management" />
            <div className="p-4 md:p-6 page-enter">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
                    <div className="flex items-center gap-3 flex-wrap">
                        <p className="text-sm text-txt-muted">{filtered.length} holidays</p>
                        <Input
                            placeholder="Search holidays..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-48"
                        />
                    </div>
                    <Button onClick={openCreate}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mr-2"><path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                        Add Holiday
                    </Button>
                </div>

                {loading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-6 w-40" />
                        <Skeleton className="h-[200px] rounded-2xl" />
                        <Skeleton className="h-6 w-40" />
                        <Skeleton className="h-[150px] rounded-2xl" />
                    </div>
                ) : holidays.length === 0 ? (
                    <EmptyState title="No holidays" description="Add holidays to exclude them from leave calculations." action={<Button size="sm" onClick={openCreate}>Add Holiday</Button>} />
                ) : (
                    <div className="space-y-6">
                        {Object.entries(grouped).map(([month, items]) => (
                            <div key={month}>
                                <h3 className="text-sm font-semibold text-txt-muted uppercase tracking-wider mb-3">{month}</h3>
                                <Card className="overflow-hidden p-0">
                                    <div className="divide-y divide-border/50">
                                        {items.map((holiday) => (
                                            <div key={holiday._id} className="flex items-center justify-between px-4 py-3 table-row-hover">
                                                <div className="flex items-center gap-4">
                                                    {/* Date badge */}
                                                    <div className="w-12 h-12 rounded-lg bg-accent/10 flex flex-col items-center justify-center flex-shrink-0">
                                                        <span className="text-[10px] text-accent uppercase font-medium">
                                                            {new Date(holiday.date).toLocaleString('default', { month: 'short' })}
                                                        </span>
                                                        <span className="text-lg font-bold text-accent leading-none">
                                                            {new Date(holiday.date).getDate()}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-txt-primary">{holiday.name}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <Badge variant={holiday.type === 'national' ? 'info' : 'warning'}>
                                                                {holiday.type === 'national' ? 'National' : 'Company'}
                                                            </Badge>
                                                            {holiday.isRecurring && (
                                                                <span className="text-[10px] text-txt-muted flex items-center gap-1">
                                                                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M8.5 4.5C8.5 2.84315 7.15685 1.5 5.5 1.5H4.5C2.84315 1.5 1.5 2.84315 1.5 4.5C1.5 6.15685 2.84315 7.5 4.5 7.5H6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" /><path d="M7 6L8.5 7.5L7 9" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                                    Recurring
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => openEdit(holiday)}
                                                        className="p-1.5 rounded-lg text-txt-muted hover:text-txt-primary hover:bg-elevated transition-colors"
                                                        title="Edit"
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10.5 1.5L12.5 3.5L4.5 11.5H2.5V9.5L10.5 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg>
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteModal(holiday)}
                                                        className="p-1.5 rounded-lg text-txt-muted hover:text-accent-danger hover:bg-accent-danger/10 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 4H11M5 4V3C5 2.44772 5.44772 2 6 2H8C8.55228 2 9 2.44772 9 3V4M4 4V11C4 11.5523 4.44772 12 5 12H9C9.55228 12 10 11.5523 10 11V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            </div>
                        ))}
                    </div>
                )}

                {/* ━━━ Create/Edit Modal ━━━ */}
                <Modal
                    isOpen={modalOpen}
                    onClose={() => setModalOpen(false)}
                    title={editingHoliday ? 'Edit Holiday' : 'Add Holiday'}
                    size="sm"
                >
                    <div className="space-y-4">
                        <Input label="Holiday Name" value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder="e.g. Diwali" />
                        <Input label="Date" type="date" value={form.date} onChange={(e) => updateField('date', e.target.value)} />
                        <Select label="Type" options={typeOptions} value={form.type} onChange={(e) => updateField('type', e.target.value)} />
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.isRecurring}
                                onChange={(e) => updateField('isRecurring', e.target.checked)}
                                className="w-4 h-4 rounded border-border text-accent focus:ring-accent/30"
                            />
                            <span className="text-sm text-txt-secondary">Recurring every year</span>
                        </label>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>Cancel</Button>
                            <Button size="sm" isLoading={actionLoading} onClick={handleSubmit}>
                                {editingHoliday ? 'Update' : 'Create'}
                            </Button>
                        </div>
                    </div>
                </Modal>

                {/* ━━━ Delete Confirmation ━━━ */}
                <Modal isOpen={!!deleteModal} onClose={() => setDeleteModal(null)} title="Delete Holiday" size="sm">
                    <div className="space-y-4">
                        <p className="text-sm text-txt-secondary">
                            Delete <strong className="text-txt-primary">{deleteModal?.name}</strong>? Leave calculations will no longer exclude this day.
                        </p>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="ghost" size="sm" onClick={() => setDeleteModal(null)}>Cancel</Button>
                            <Button variant="danger" size="sm" isLoading={actionLoading} onClick={handleDelete}>Delete</Button>
                        </div>
                    </div>
                </Modal>
            </div>
        </>
    );
}
