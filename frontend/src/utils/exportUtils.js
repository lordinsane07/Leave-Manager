import { formatDate } from './dateUtils';
import { getLeaveTypeLabel } from './helpers';

// Converts an array of objects to CSV string
const arrayToCSV = (data, columns) => {
    // Header row
    const header = columns.map((col) => col.label).join(',');
    // Data rows
    const rows = data.map((item) =>
        columns.map((col) => {
            const value = col.accessor(item);
            // Escape commas and quotes in CSV values
            const str = String(value ?? '');
            return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
        }).join(',')
    );
    return [header, ...rows].join('\n');
};

// Triggers a browser download for a CSV string
const downloadCSV = (csvContent, filename) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
};

// Exports leave data to CSV
export const exportLeavesToCSV = (leaves, filename = 'leaves-export.csv') => {
    const columns = [
        { label: 'Employee', accessor: (l) => l.employee?.name || '' },
        { label: 'Email', accessor: (l) => l.employee?.email || '' },
        { label: 'Type', accessor: (l) => getLeaveTypeLabel(l.leaveType) },
        { label: 'Start Date', accessor: (l) => formatDate(l.startDate) },
        { label: 'End Date', accessor: (l) => formatDate(l.endDate) },
        { label: 'Days', accessor: (l) => l.totalDays },
        { label: 'Status', accessor: (l) => l.status },
        { label: 'Reason', accessor: (l) => l.reason },
    ];
    const csv = arrayToCSV(leaves, columns);
    downloadCSV(csv, filename);
};

// Exports audit logs to CSV
export const exportAuditLogsToCSV = (logs, filename = 'audit-log-export.csv') => {
    const columns = [
        { label: 'Actor', accessor: (l) => l.actor?.name || '' },
        { label: 'Action', accessor: (l) => l.action },
        { label: 'Target', accessor: (l) => l.targetModel },
        { label: 'Timestamp', accessor: (l) => formatDate(l.timestamp) },
        { label: 'IP Address', accessor: (l) => l.ipAddress },
    ];
    const csv = arrayToCSV(logs, columns);
    downloadCSV(csv, filename);
};
