import { useState, useEffect, useCallback } from 'react';
import { departmentService, userService } from '../services';
import { useToast } from '../contexts/ToastContext';
import TopBar from '../components/layout/TopBar';
import Card, { CardHeader, CardTitle } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Loader';
import EmptyState from '../components/ui/EmptyState';

export default function DepartmentManagement() {
    const [departments, setDepartments] = useState([]);
    const [managers, setManagers] = useState([]);
    const [loading, setLoading] = useState(true);
    const { success, error: showError } = useToast();

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editingDept, setEditingDept] = useState(null);
    const [deleteModal, setDeleteModal] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Form state
    const [form, setForm] = useState({
        name: '', code: '', manager: '',
        annual: 20, sick: 10, personal: 5, maternity: 90, paternity: 15, maxConsecutiveDays: 15,
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [deptRes, usersRes] = await Promise.all([
                departmentService.getAll(),
                userService.getAll({ role: 'manager', limit: 100, isActive: 'true' }),
            ]);
            setDepartments(deptRes.data?.data?.departments || []);
            setManagers(usersRes.data?.data?.users || []);
        } catch {
            //
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const openCreate = () => {
        setEditingDept(null);
        setForm({ name: '', code: '', manager: '', annual: 20, sick: 10, personal: 5, maternity: 90, paternity: 15, maxConsecutiveDays: 15 });
        setModalOpen(true);
    };

    const openEdit = (dept) => {
        setEditingDept(dept);
        setForm({
            name: dept.name,
            code: dept.code,
            manager: dept.manager?._id || dept.manager || '',
            annual: dept.leavePolicy?.annual ?? 20,
            sick: dept.leavePolicy?.sick ?? 10,
            personal: dept.leavePolicy?.personal ?? 5,
            maternity: dept.leavePolicy?.maternity ?? 90,
            paternity: dept.leavePolicy?.paternity ?? 15,
            maxConsecutiveDays: dept.leavePolicy?.maxConsecutiveDays ?? 15,
        });
        setModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!form.name.trim() || !form.code.trim()) {
            showError('Name and Code are required');
            return;
        }
        setActionLoading(true);
        try {
            const payload = {
                name: form.name.trim(),
                code: form.code.trim().toUpperCase(),
                manager: form.manager || undefined,
                leavePolicy: {
                    annual: Number(form.annual),
                    sick: Number(form.sick),
                    personal: Number(form.personal),
                    maternity: Number(form.maternity),
                    paternity: Number(form.paternity),
                    maxConsecutiveDays: Number(form.maxConsecutiveDays),
                },
            };

            if (editingDept) {
                await departmentService.update(editingDept._id, payload);
                success('Department updated');
            } else {
                await departmentService.create(payload);
                success('Department created');
            }
            setModalOpen(false);
            setEditingDept(null);
            fetchData();
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to save department');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteModal) return;
        setActionLoading(true);
        try {
            await departmentService.delete(deleteModal._id);
            success('Department deleted');
            setDeleteModal(null);
            fetchData();
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to delete department');
        } finally {
            setActionLoading(false);
        }
    };

    const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

    const managerOptions = [
        { value: '', label: 'No Manager' },
        ...managers.map((m) => ({ value: m._id, label: `${m.name} (${m.email})` })),
    ];

    const getManagerName = (dept) => {
        if (!dept.manager) return null;
        const mgr = managers.find((m) => m._id === (dept.manager?._id || dept.manager));
        return mgr?.name || null;
    };

    return (
        <>
            <TopBar title="Department Management" />
            <div className="p-4 md:p-6 page-enter">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
                    <p className="text-sm text-txt-muted">{departments.length} departments</p>
                    <Button onClick={openCreate}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mr-2"><path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                        New Department
                    </Button>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="bg-surface rounded-2xl p-5 border border-border/50 space-y-3">
                                <Skeleton className="h-5 w-32" />
                                <Skeleton className="h-4 w-16 rounded-full" />
                                <Skeleton className="h-4 w-40" />
                                <Skeleton className="h-4 w-24" />
                                <div className="border-t border-border/50 pt-3 flex gap-2">
                                    {[...Array(4)].map((_, j) => <Skeleton key={j} className="h-6 w-16 rounded-md" />)}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : departments.length === 0 ? (
                    <EmptyState title="No departments" description="Create your first department to get started." action={<Button size="sm" onClick={openCreate}>Create Department</Button>} />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {departments.map((dept) => (
                            <Card key={dept._id} className="stagger-item">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h3 className="text-base font-semibold text-txt-primary font-display">{dept.name}</h3>
                                        <Badge variant="neutral">{dept.code}</Badge>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => openEdit(dept)}
                                            className="p-1.5 rounded-lg text-txt-muted hover:text-txt-primary hover:bg-elevated transition-colors"
                                            title="Edit"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10.5 1.5L12.5 3.5L4.5 11.5H2.5V9.5L10.5 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg>
                                        </button>
                                        <button
                                            onClick={() => setDeleteModal(dept)}
                                            className="p-1.5 rounded-lg text-txt-muted hover:text-accent-danger hover:bg-accent-danger/10 transition-colors"
                                            title="Delete"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 4H11M5 4V3C5 2.44772 5.44772 2 6 2H8C8.55228 2 9 2.44772 9 3V4M4 4V11C4 11.5523 4.44772 12 5 12H9C9.55228 12 10 11.5523 10 11V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Manager */}
                                <div className="flex items-center gap-2 mb-3">
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-txt-muted flex-shrink-0">
                                        <circle cx="7" cy="4" r="2.5" stroke="currentColor" strokeWidth="1.2" />
                                        <path d="M2 12C2 9.23858 4.23858 7 7 7C9.76142 7 12 9.23858 12 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                                    </svg>
                                    <span className="text-sm text-txt-secondary">
                                        {getManagerName(dept) || <span className="text-txt-muted italic">No manager</span>}
                                    </span>
                                </div>

                                {/* Employee count */}
                                <div className="flex items-center gap-2 mb-4">
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-txt-muted flex-shrink-0">
                                        <circle cx="5" cy="4" r="2" stroke="currentColor" strokeWidth="1.2" />
                                        <circle cx="10" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.2" />
                                        <path d="M1 11C1 8.79086 2.79086 7 5 7C7.20914 7 9 8.79086 9 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                                    </svg>
                                    <span className="text-sm text-txt-muted">
                                        {dept.employees?.length || 0} employees
                                    </span>
                                </div>

                                {/* Leave Policy */}
                                <div className="border-t border-border/50 pt-3">
                                    <p className="text-[10px] text-txt-muted uppercase tracking-wider mb-2">Leave Policy (days)</p>
                                    <div className="flex flex-wrap gap-2">
                                        <PolicyTag label="Annual" value={dept.leavePolicy?.annual} />
                                        <PolicyTag label="Sick" value={dept.leavePolicy?.sick} />
                                        <PolicyTag label="Personal" value={dept.leavePolicy?.personal} />
                                        <PolicyTag label="Mat." value={dept.leavePolicy?.maternity} />
                                        <PolicyTag label="Pat." value={dept.leavePolicy?.paternity} />
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                {/* ━━━ Create/Edit Modal ━━━ */}
                <Modal
                    isOpen={modalOpen}
                    onClose={() => setModalOpen(false)}
                    title={editingDept ? 'Edit Department' : 'Create Department'}
                    size="md"
                >
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <Input label="Department Name" value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder="e.g. Engineering" />
                            <Input label="Code" value={form.code} onChange={(e) => updateField('code', e.target.value)} placeholder="e.g. ENG" />
                        </div>

                        <Select label="Department Manager" options={managerOptions} value={form.manager} onChange={(e) => updateField('manager', e.target.value)} />

                        <div className="border-t border-border/50 pt-3">
                            <p className="text-sm font-medium text-txt-secondary mb-3">Leave Policy (days per year)</p>
                            <div className="grid grid-cols-3 gap-3">
                                <Input label="Annual" type="number" value={form.annual} onChange={(e) => updateField('annual', e.target.value)} />
                                <Input label="Sick" type="number" value={form.sick} onChange={(e) => updateField('sick', e.target.value)} />
                                <Input label="Personal" type="number" value={form.personal} onChange={(e) => updateField('personal', e.target.value)} />
                                <Input label="Maternity" type="number" value={form.maternity} onChange={(e) => updateField('maternity', e.target.value)} />
                                <Input label="Paternity" type="number" value={form.paternity} onChange={(e) => updateField('paternity', e.target.value)} />
                                <Input label="Max Consecutive" type="number" value={form.maxConsecutiveDays} onChange={(e) => updateField('maxConsecutiveDays', e.target.value)} />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>Cancel</Button>
                            <Button size="sm" isLoading={actionLoading} onClick={handleSubmit}>
                                {editingDept ? 'Update' : 'Create'}
                            </Button>
                        </div>
                    </div>
                </Modal>

                {/* ━━━ Delete Confirmation ━━━ */}
                <Modal isOpen={!!deleteModal} onClose={() => setDeleteModal(null)} title="Delete Department" size="sm">
                    <div className="space-y-4">
                        <p className="text-sm text-txt-secondary">
                            Are you sure you want to delete <strong className="text-txt-primary">{deleteModal?.name}</strong>?
                            This action cannot be undone.
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

function PolicyTag({ label, value }) {
    return (
        <span className="inline-flex items-center gap-1 bg-elevated rounded-md px-2 py-0.5 text-xs text-txt-secondary">
            <span className="text-txt-muted">{label}:</span>
            <span className="font-medium">{value ?? '—'}</span>
        </span>
    );
}
