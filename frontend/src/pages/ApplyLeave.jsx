import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { leaveService, aiService } from '../services';
import TopBar from '../components/layout/TopBar';
import Card, { CardTitle } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { LEAVE_TYPES } from '../utils/constants';
import { cn } from '../utils/cn';

const leaveTypeOptions = [
    { value: 'annual', label: 'Annual Leave' },
    { value: 'sick', label: 'Sick Leave' },
    { value: 'personal', label: 'Personal Leave' },
    { value: 'maternity', label: 'Maternity Leave' },
    { value: 'paternity', label: 'Paternity Leave' },
];

// Count working days (exclude weekends) — mirrors backend logic
function countWorkingDays(start, end) {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    if (s > e) return 0;
    let count = 0;
    const d = new Date(s);
    while (d <= e) {
        const day = d.getDay();
        if (day !== 0 && day !== 6) count++;
        d.setDate(d.getDate() + 1);
    }
    return count;
}

export default function ApplyLeave() {
    const { user } = useAuth();
    const { success, error: showError } = useToast();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        leaveType: 'annual',
        startDate: '',
        endDate: '',
        reason: '',
    });
    const [nlpText, setNlpText] = useState('');
    const [advice, setAdvice] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isParsing, setIsParsing] = useState(false);
    const [isCheckingAdvice, setIsCheckingAdvice] = useState(false);

    // Balance & estimated day checks
    const availableBalance = user?.leaveBalance?.[form.leaveType] ?? 0;
    const estimatedDays = useMemo(() => countWorkingDays(form.startDate, form.endDate), [form.startDate, form.endDate]);

    // Read max consecutive days from department policy, skip for maternity/paternity
    const maxConsecutive = ['maternity', 'paternity'].includes(form.leaveType)
        ? Infinity
        : (user?.department?.leavePolicy?.maxConsecutiveDays || 15);

    const exceedsBalance = estimatedDays > 0 && estimatedDays > availableBalance;
    const exceedsMax = estimatedDays > 0 && estimatedDays > maxConsecutive;
    const hasError = exceedsBalance || exceedsMax;

    // Parse natural language input
    const handleNLPParse = async () => {
        if (!nlpText.trim()) return;
        setIsParsing(true);
        try {
            const { data } = await aiService.parseLeave({ text: nlpText });
            const parsed = data.data?.parsed;
            if (parsed?.parsed) {
                setForm({
                    leaveType: parsed.leaveType || 'annual',
                    startDate: parsed.startDate || '',
                    endDate: parsed.endDate || '',
                    reason: nlpText,
                });
                success(`Parsed: ${parsed.leaveType} leave, ${parsed.startDate} to ${parsed.endDate} (${parsed.confidence} confidence)`);
            } else {
                showError('Could not parse your input. Please try being more specific.');
            }
        } catch {
            showError('NLP parsing failed');
        } finally {
            setIsParsing(false);
        }
    };

    // Get AI advice for the selected dates
    const handleGetAdvice = async () => {
        if (!form.startDate || !form.endDate) {
            showError('Please select dates first');
            return;
        }
        setIsCheckingAdvice(true);
        try {
            const { data } = await aiService.getLeaveAdvice({
                requestedDates: { startDate: form.startDate, endDate: form.endDate },
                leaveType: form.leaveType,
            });
            setAdvice(data.data?.advice);
        } catch {
            showError('Could not get advice');
        } finally {
            setIsCheckingAdvice(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.startDate || !form.endDate || !form.reason.trim()) {
            showError('Please fill in all fields');
            return;
        }
        if (exceedsBalance) {
            showError(`Insufficient ${form.leaveType} balance. Available: ${availableBalance} days, Requested: ~${estimatedDays} working days.`);
            return;
        }
        if (exceedsMax) {
            showError(`Maximum ${maxConsecutive} consecutive working days allowed for ${form.leaveType} leave.`);
            return;
        }
        setIsSubmitting(true);
        try {
            await leaveService.apply(form);
            success('Leave application submitted!');
            navigate(user?.role === 'manager' ? '/my-leaves' : '/leave-history');
        } catch (err) {
            const data = err.response?.data;
            const errorMessage = data?.errors?.length > 0 ? data.errors[0] : (data?.message || 'Failed to apply');
            showError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <TopBar title="Apply Leave" />
            <div className="p-4 md:p-6 max-w-3xl mx-auto page-enter">
                {/* NLP Input */}
                <Card className="mb-6">
                    <div className="flex items-start gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1L9.5 6L14.5 7.5L9.5 9L8 14L6.5 9L1.5 7.5L6.5 6L8 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg>
                        </div>
                        <div>
                            <CardTitle>Smart Leave Input</CardTitle>
                            <p className="text-xs text-txt-muted mt-0.5">Type naturally, e.g. "I need 3 days sick leave starting tomorrow"</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Input
                            placeholder="I want to take annual leave next Monday for 3 days..."
                            value={nlpText}
                            onChange={(e) => setNlpText(e.target.value)}
                            className="flex-1"
                        />
                        <Button variant="secondary" onClick={handleNLPParse} isLoading={isParsing}>
                            Parse
                        </Button>
                    </div>
                </Card>

                {/* Leave Application Form */}
                <Card>
                    <CardTitle className="mb-4">Leave Details</CardTitle>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Select
                            label="Leave Type"
                            options={leaveTypeOptions}
                            value={form.leaveType}
                            onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
                        />

                        {/* Balance indicator */}
                        <div className={cn(
                            'flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg border text-xs',
                            hasError
                                ? 'bg-accent-danger/5 border-accent-danger/20 text-accent-danger'
                                : 'bg-accent-success/5 border-accent-success/20 text-accent-success'
                        )}>
                            <span className="font-semibold">{availableBalance}</span>
                            <span className="text-txt-muted">
                                {leaveTypeOptions.find(o => o.value === form.leaveType)?.label || form.leaveType} days available
                            </span>
                            <span className="text-txt-muted">·</span>
                            {maxConsecutive === Infinity ? (
                                <span className="text-txt-muted">No consecutive limit</span>
                            ) : (
                                <span className="text-txt-muted">Max {maxConsecutive} consecutive days</span>
                            )}
                            {estimatedDays > 0 && (
                                <>
                                    <span className="text-txt-muted">·</span>
                                    <span className={cn('font-semibold', hasError ? 'text-accent-danger' : 'text-txt-primary')}>
                                        ~{estimatedDays} working day{estimatedDays !== 1 ? 's' : ''} requested
                                    </span>
                                    {exceedsBalance && <span className="ml-1">⚠️ Exceeds balance</span>}
                                    {exceedsMax && !exceedsBalance && <span className="ml-1">⚠️ Exceeds max consecutive</span>}
                                </>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Start Date"
                                type="date"
                                value={form.startDate}
                                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                                required
                            />
                            <Input
                                label="End Date"
                                type="date"
                                value={form.endDate}
                                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-txt-secondary mb-1.5">Reason</label>
                            <textarea
                                className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-txt-primary placeholder:text-txt-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-border-focus transition-all min-h-[100px] resize-none"
                                placeholder="Describe the reason for your leave (min 10 characters)..."
                                value={form.reason}
                                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                                minLength={10}
                                maxLength={500}
                                required
                            />
                        </div>

                        {/* AI Advice Section */}
                        <div className="flex items-center gap-3">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleGetAdvice}
                                isLoading={isCheckingAdvice}
                            >
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mr-1.5"><path d="M7 1L8.5 5L12.5 6.5L8.5 8L7 12L5.5 8L1.5 6.5L5.5 5L7 1Z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" /></svg>
                                Check Timing
                            </Button>
                            <span className="text-[10px] text-txt-muted">(Heuristic-based analysis)</span>
                        </div>

                        {/* Advice Results */}
                        {advice && (
                            <div className={cn(
                                'rounded-lg p-4 border',
                                advice.score >= 70 ? 'bg-accent-success/5 border-accent-success/20' :
                                    advice.score >= 40 ? 'bg-accent-warning/5 border-accent-warning/20' :
                                        'bg-accent-danger/5 border-accent-danger/20'
                            )}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-txt-primary">{advice.recommendation}</span>
                                    <Badge variant={advice.score >= 70 ? 'success' : advice.score >= 40 ? 'warning' : 'danger'}>
                                        Score: {advice.score}/100
                                    </Badge>
                                </div>
                                <ul className="space-y-1">
                                    {advice.factors?.map((f, i) => (
                                        <li key={i} className="text-xs text-txt-muted flex items-start gap-1.5">
                                            <span className="mt-0.5">•</span> {f}
                                        </li>
                                    ))}
                                </ul>
                                <p className="text-[10px] text-txt-muted mt-2 italic">{advice.label}</p>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-2">
                            <Button variant="secondary" type="button" onClick={() => navigate(-1)}>
                                Cancel
                            </Button>
                            <Button type="submit" isLoading={isSubmitting} disabled={hasError}>
                                Submit Application
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </>
    );
}

