import { useState, useEffect, useCallback } from 'react';
import { userService, departmentService } from '../services';
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
import { capitalize, getInitials } from '../utils/helpers';
import { cn } from '../utils/cn';

const roleOptions = [
    { value: '', label: 'All Roles' },
    { value: 'admin', label: 'Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'employee', label: 'Employee' },
];

const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'true', label: 'Active' },
    { value: 'false', label: 'Inactive' },
];

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [managers, setManagers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({});
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [deptFilter, setDeptFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const { success, error: showError } = useToast();

    // Modal state
    const [selectedUser, setSelectedUser] = useState(null);
    const [modalType, setModalType] = useState(null); // 'role' | 'department' | 'manager' | 'deactivate'
    const [modalValue, setModalValue] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    // Fetch departments and managers once for dropdown options
    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const [deptRes, usersRes] = await Promise.all([
                    departmentService.getAll(),
                    userService.getAll({ role: 'manager', limit: 100, isActive: 'true' }),
                ]);
                setDepartments(deptRes.data?.data?.departments || []);
                setManagers(usersRes.data?.data?.users || []);
            } catch {
                //
            }
        };
        fetchOptions();
    }, []);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page, limit: 15, sortBy: 'createdAt', order: 'desc' };
            if (search) params.search = search;
            if (roleFilter) params.role = roleFilter;
            if (deptFilter) params.department = deptFilter;
            if (statusFilter) params.isActive = statusFilter;
            const { data } = await userService.getAll(params);
            setUsers(data.data?.users || []);
            setPagination(data.pagination || {});
        } catch {
            //
        } finally {
            setLoading(false);
        }
    }, [page, search, roleFilter, deptFilter, statusFilter]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Debounced search
    const [searchInput, setSearchInput] = useState('');
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearch(searchInput);
            setPage(1);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    // ━━━ Modal handlers ━━━
    const openModal = (user, type) => {
        setSelectedUser(user);
        setModalType(type);
        if (type === 'role') setModalValue(user.role);
        else if (type === 'department') setModalValue(user.department?._id || '');
        else if (type === 'manager') setModalValue(user.managerId?._id || '');
        else setModalValue('');
    };

    const closeModal = () => {
        setSelectedUser(null);
        setModalType(null);
        setModalValue('');
    };

    const handleAction = async () => {
        if (!selectedUser) return;
        setActionLoading(true);
        try {
            switch (modalType) {
                case 'role':
                    await userService.assignRole(selectedUser._id, { role: modalValue });
                    success(`Role updated to ${modalValue}`);
                    break;
                case 'department':
                    await userService.assignDepartment(selectedUser._id, { departmentId: modalValue || null });
                    success('Department updated');
                    break;
                case 'manager':
                    await userService.assignManager(selectedUser._id, { managerId: modalValue || null });
                    success('Manager assigned');
                    break;
                case 'deactivate':
                    await userService.deactivate(selectedUser._id);
                    success('User deactivated');
                    break;
                default:
                    break;
            }
            closeModal();
            fetchUsers();
        } catch (err) {
            showError(err.response?.data?.message || 'Action failed');
        } finally {
            setActionLoading(false);
        }
    };

    const getRoleBadge = (role) => {
        const map = { admin: 'danger', manager: 'warning', employee: 'info' };
        return map[role] || 'neutral';
    };

    // Department dropdown options for filter
    const deptFilterOptions = [
        { value: '', label: 'All Departments' },
        ...departments.map((d) => ({ value: d._id, label: d.name })),
    ];

    // Department dropdown options for modal
    const deptModalOptions = [
        { value: '', label: 'No Department' },
        ...departments.map((d) => ({ value: d._id, label: `${d.name} (${d.code})` })),
    ];

    // Manager dropdown options for modal
    const managerModalOptions = [
        { value: '', label: 'No Manager' },
        ...managers.map((m) => ({
            value: m._id,
            label: `${m.name} (${m.department?.name || 'No Dept'})`
        })),
    ];

    const roleModalOptions = [
        { value: 'employee', label: 'Employee' },
        { value: 'manager', label: 'Manager' },
        { value: 'admin', label: 'Admin' },
    ];

    return (
        <>
            <TopBar title="User Management" />
            <div className="p-4 md:p-6 page-enter">
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 mb-6">
                    <div className="flex-1 min-w-[200px] max-w-xs">
                        <Input
                            placeholder="Search by name or email..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                        />
                    </div>
                    <Select
                        options={roleOptions}
                        value={roleFilter}
                        onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                        className="w-36"
                    />
                    <Select
                        options={deptFilterOptions}
                        value={deptFilter}
                        onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
                        className="w-44"
                    />
                    <Select
                        options={statusOptions}
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                        className="w-36"
                    />
                    <div className="flex-1" />
                    <p className="text-xs text-txt-muted">
                        {pagination.total ?? 0} users total
                    </p>
                </div>

                {/* Table */}
                {loading ? (
                    <Card className="overflow-hidden p-0">
                        <div className="p-4 space-y-3">
                            {[...Array(6)].map((_, i) => (
                                <Skeleton key={i} className="h-14 rounded-lg" />
                            ))}
                        </div>
                    </Card>
                ) : users.length === 0 ? (
                    <EmptyState title="No users found" description="Try adjusting your search or filters." />
                ) : (
                    <Card className="overflow-hidden p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border text-left">
                                        <th className="text-xs font-medium text-txt-muted px-4 py-3">User</th>
                                        <th className="text-xs font-medium text-txt-muted px-4 py-3">Role</th>
                                        <th className="text-xs font-medium text-txt-muted px-4 py-3">Department</th>
                                        <th className="text-xs font-medium text-txt-muted px-4 py-3">Manager</th>
                                        <th className="text-xs font-medium text-txt-muted px-4 py-3">Status</th>
                                        <th className="text-xs font-medium text-txt-muted px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((u) => (
                                        <tr key={u._id} className="border-b border-border/50 table-row-hover">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xs font-bold flex-shrink-0">
                                                        {u.avatar ? (
                                                            <img src={u.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                                                        ) : (
                                                            getInitials(u.name)
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-txt-primary">{u.name}</p>
                                                        <p className="text-xs text-txt-muted">{u.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant={getRoleBadge(u.role)} dot>{capitalize(u.role)}</Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-txt-secondary">
                                                    {u.department?.name || <span className="text-txt-muted italic">None</span>}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-txt-secondary">
                                                    {u.managerId?.name || <span className="text-txt-muted italic">None</span>}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant={u.isActive ? 'success' : 'danger'} dot>
                                                    {u.isActive ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => openModal(u, 'role')}
                                                        className="px-2 py-1 text-xs rounded-md text-txt-secondary hover:bg-elevated hover:text-txt-primary transition-colors"
                                                        title="Change Role"
                                                    >
                                                        Role
                                                    </button>
                                                    <button
                                                        onClick={() => openModal(u, 'department')}
                                                        className="px-2 py-1 text-xs rounded-md text-txt-secondary hover:bg-elevated hover:text-txt-primary transition-colors"
                                                        title="Assign Department"
                                                    >
                                                        Dept
                                                    </button>
                                                    <button
                                                        onClick={() => openModal(u, 'manager')}
                                                        className="px-2 py-1 text-xs rounded-md text-txt-secondary hover:bg-elevated hover:text-txt-primary transition-colors"
                                                        title="Assign Manager"
                                                    >
                                                        Mgr
                                                    </button>
                                                    {u.isActive && (
                                                        <button
                                                            onClick={() => openModal(u, 'deactivate')}
                                                            className="px-2 py-1 text-xs rounded-md text-accent-danger/70 hover:bg-accent-danger/10 hover:text-accent-danger transition-colors"
                                                            title="Deactivate"
                                                        >
                                                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                                                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
                                                                <path d="M4.5 7H9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                                            </svg>
                                                        </button>
                                                    )}
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
                                    Page {pagination.page} of {pagination.pages} ({pagination.total} users)
                                </p>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                                    <Button size="sm" variant="ghost" disabled={page >= pagination.pages} onClick={() => setPage(page + 1)}>Next</Button>
                                </div>
                            </div>
                        )}
                    </Card>
                )}

                {/* ━━━ Action Modal ━━━ */}
                <Modal
                    isOpen={!!modalType}
                    onClose={closeModal}
                    title={
                        modalType === 'role' ? `Change Role — ${selectedUser?.name}` :
                            modalType === 'department' ? `Assign Department — ${selectedUser?.name}` :
                                modalType === 'manager' ? `Assign Manager — ${selectedUser?.name}` :
                                    modalType === 'deactivate' ? `Deactivate User` : ''
                    }
                    size="sm"
                >
                    {modalType === 'deactivate' ? (
                        <div className="space-y-4">
                            <p className="text-sm text-txt-secondary">
                                Are you sure you want to deactivate <strong className="text-txt-primary">{selectedUser?.name}</strong>?
                                They will no longer be able to log in.
                            </p>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="ghost" size="sm" onClick={closeModal}>Cancel</Button>
                                <Button variant="danger" size="sm" isLoading={actionLoading} onClick={handleAction}>
                                    Deactivate
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {modalType === 'role' && (
                                <>
                                    <p className="text-xs text-txt-muted">
                                        Current role: <Badge variant={getRoleBadge(selectedUser?.role)}>{capitalize(selectedUser?.role)}</Badge>
                                    </p>
                                    <Select
                                        label="New Role"
                                        options={roleModalOptions}
                                        value={modalValue}
                                        onChange={(e) => setModalValue(e.target.value)}
                                    />
                                </>
                            )}
                            {modalType === 'department' && (
                                <>
                                    <p className="text-xs text-txt-muted">
                                        Current: {selectedUser?.department?.name || 'None'}
                                    </p>
                                    <Select
                                        label="Department"
                                        options={deptModalOptions}
                                        value={modalValue}
                                        onChange={(e) => setModalValue(e.target.value)}
                                    />
                                </>
                            )}
                            {modalType === 'manager' && (
                                <>
                                    <p className="text-xs text-txt-muted">
                                        Current: {selectedUser?.managerId?.name || 'None'}
                                    </p>
                                    <Select
                                        label="Manager"
                                        options={managerModalOptions}
                                        value={modalValue}
                                        onChange={(e) => setModalValue(e.target.value)}
                                    />
                                </>
                            )}
                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="ghost" size="sm" onClick={closeModal}>Cancel</Button>
                                <Button size="sm" isLoading={actionLoading} onClick={handleAction}>
                                    Save
                                </Button>
                            </div>
                        </div>
                    )}
                </Modal>
            </div>
        </>
    );
}
