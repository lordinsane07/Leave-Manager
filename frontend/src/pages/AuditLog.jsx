import { useState, useEffect } from 'react';
import { auditService } from '../services';
import TopBar from '../components/layout/TopBar';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import { Skeleton } from '../components/ui/Loader';
import EmptyState from '../components/ui/EmptyState';
import { formatDate, timeAgo } from '../utils/dateUtils';
import { capitalize } from '../utils/helpers';
import { exportAuditLogsToCSV } from '../utils/exportUtils';

const actionOptions = [
    { value: '', label: 'All Actions' },
    { value: 'CREATE', label: 'Create' },
    { value: 'UPDATE', label: 'Update' },
    { value: 'DELETE', label: 'Delete' },
    { value: 'LOGIN', label: 'Login' },
    { value: 'LOGOUT', label: 'Logout' },
];

export default function AuditLog() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({});
    const [filter, setFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchLogs();
    }, [page, filter]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = { page, limit: 20 };
            if (filter) params.action = filter;
            const { data } = await auditService.getAll(params);
            setLogs(data.data?.logs || []);
            setPagination(data.pagination || {});
        } catch {
            //
        } finally {
            setLoading(false);
        }
    };

    const getActionColor = (action) => {
        switch (action) {
            case 'CREATE': return 'success';
            case 'DELETE': return 'danger';
            case 'UPDATE': return 'warning';
            default: return 'info';
        }
    };

    return (
        <>
            <TopBar title="Audit Log" />
            <div className="p-4 md:p-6 page-enter">
                <div className="flex flex-wrap items-center gap-3 mb-6">
                    <Select
                        options={actionOptions}
                        value={filter}
                        onChange={(e) => { setFilter(e.target.value); setPage(1); }}
                        className="w-40"
                    />
                    <input
                        type="text"
                        placeholder="Search by actor or target..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 min-w-[200px] px-3 py-2 bg-surface border border-border rounded-lg text-sm text-txt-primary placeholder:text-txt-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                    />
                    <Button variant="ghost" size="sm" onClick={() => exportAuditLogsToCSV(logs)}>
                        Export CSV
                    </Button>
                </div>

                {loading ? (
                    <Card className="overflow-hidden p-0">
                        <div className="p-4 space-y-3">
                            {[...Array(8)].map((_, i) => (
                                <Skeleton key={i} className="h-12 rounded-lg" />
                            ))}
                        </div>
                    </Card>
                ) : logs.length === 0 ? (
                    <EmptyState title="No audit logs" description="No activity has been recorded yet." />
                ) : (
                    <Card className="overflow-hidden p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border text-left">
                                        <th className="text-xs font-medium text-txt-muted px-4 py-3">Action</th>
                                        <th className="text-xs font-medium text-txt-muted px-4 py-3">Actor</th>
                                        <th className="text-xs font-medium text-txt-muted px-4 py-3">Target</th>
                                        <th className="text-xs font-medium text-txt-muted px-4 py-3">Timestamp</th>
                                        <th className="text-xs font-medium text-txt-muted px-4 py-3">IP</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(searchQuery ? logs.filter(l =>
                                        (l.actor?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        (l.targetModel || '').toLowerCase().includes(searchQuery.toLowerCase())
                                    ) : logs).map((log) => (
                                        <tr key={log._id} className="border-b border-border/50 table-row-hover">
                                            <td className="px-4 py-3">
                                                <Badge variant={getActionColor(log.action)}>{log.action}</Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-sm text-txt-primary">{log.actor?.name || 'System'}</p>
                                                <p className="text-xs text-txt-muted">{log.actor?.role}</p>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-txt-muted">{log.targetModel}</td>
                                            <td className="px-4 py-3">
                                                <p className="text-xs text-txt-primary">{formatDate(log.timestamp)}</p>
                                                <p className="text-[10px] text-txt-muted">{timeAgo(log.timestamp)}</p>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-txt-muted font-mono">{log.ipAddress || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {pagination.pages > 1 && (
                            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                                <p className="text-xs text-txt-muted">Page {pagination.page} of {pagination.pages}</p>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                                    <Button size="sm" variant="ghost" disabled={page >= pagination.pages} onClick={() => setPage(page + 1)}>Next</Button>
                                </div>
                            </div>
                        )}
                    </Card>
                )}
            </div>
        </>
    );
}
