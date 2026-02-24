import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { aiService, leaveService } from '../services';
import TopBar from '../components/layout/TopBar';
import Card, { CardHeader, CardTitle } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { PageLoader, Skeleton } from '../components/ui/Loader';
import { cn } from '../utils/cn';

export default function AIInsights() {
    const { user } = useAuth();
    const [burnout, setBurnout] = useState(null);
    const [teamBurnout, setTeamBurnout] = useState(null);
    const [suggestions, setSuggestions] = useState(null);
    const [leaveStats, setLeaveStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const isManager = user?.role === 'manager' || user?.role === 'admin';

    useEffect(() => {
        const fetchData = async () => {
            try {
                const promises = [
                    aiService.getBurnoutScore(user._id),
                    isManager
                        ? aiService.getTeamBurnout(user._id).catch(() => null)
                        : aiService.getSuggestions(user._id).catch(() => null),
                ];
                if (!isManager) {
                    promises.push(leaveService.getAll({ limit: 100 }).catch(() => null));
                }

                const results = await Promise.all(promises);
                setBurnout(results[0].data?.data?.burnout);

                if (isManager) {
                    if (results[1]) setTeamBurnout(results[1].data?.data?.teamBurnout);
                } else {
                    if (results[1]) setSuggestions(results[1].data?.data?.suggestions || results[1].data?.data);
                    if (results[2]) {
                        const leaves = results[2].data?.data?.leaves || [];
                        const approved = leaves.filter(l => l.status === 'approved');
                        const totalDays = approved.reduce((sum, l) => sum + (l.totalDays || 0), 0);
                        const typeCounts = {};
                        approved.forEach(l => { typeCounts[l.leaveType] = (typeCounts[l.leaveType] || 0) + (l.totalDays || 0); });
                        const mostUsed = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
                        setLeaveStats({
                            totalLeaves: leaves.length,
                            approvedLeaves: approved.length,
                            totalDays,
                            pending: leaves.filter(l => l.status === 'pending').length,
                            rejected: leaves.filter(l => l.status === 'rejected').length,
                            mostUsedType: mostUsed ? mostUsed[0] : null,
                            mostUsedDays: mostUsed ? mostUsed[1] : 0,
                            typeCounts,
                        });
                    }
                }
            } catch {
                //
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user._id, isManager]);

    if (loading) return (
        <>
            <TopBar title="AI Insights" />
            <div className="p-4 md:p-6">
                <Skeleton className="h-5 w-80 mb-6" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Skeleton className="h-[380px] rounded-2xl" />
                    <Skeleton className="h-[380px] rounded-2xl" />
                </div>
            </div>
        </>
    );

    const getBurnoutColor = (score) => {
        if (score <= 30) return 'text-accent-success';
        if (score <= 60) return 'text-accent-warning';
        if (score <= 80) return 'text-accent';
        return 'text-accent-danger';
    };

    const getGaugeOffset = (score) => {
        return 283 - (283 * score) / 100;
    };

    const getStrokeColor = (score) => {
        if (score <= 30) return 'var(--accent-success)';
        if (score <= 60) return 'var(--accent-warning)';
        if (score <= 80) return 'var(--accent-primary)';
        return 'var(--accent-danger)';
    };

    const typeLabels = { annual: 'Annual', sick: 'Sick', personal: 'Personal', maternity: 'Maternity', paternity: 'Paternity' };

    return (
        <>
            <TopBar title="AI Insights" />
            <div className="p-4 md:p-6 page-enter">
                <div className="mb-4">
                    <p className="text-sm text-txt-muted">Heuristic-based analytics for decision support. All scores are rule-based and transparent.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Burnout Score — Circular Gauge */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Burnout Assessment</CardTitle>
                            <Badge variant={burnout?.score <= 30 ? 'success' : burnout?.score <= 60 ? 'warning' : 'danger'}>
                                {burnout?.category || 'N/A'}
                            </Badge>
                        </CardHeader>

                        <div className="flex items-center justify-center mb-4">
                            <div className="relative w-32 h-32">
                                <svg className="burnout-gauge w-32 h-32" viewBox="0 0 100 100">
                                    <circle className="gauge-bg" cx="50" cy="50" r="45" />
                                    <circle
                                        className="gauge-fill"
                                        cx="50" cy="50" r="45"
                                        stroke={getStrokeColor(burnout?.score || 0)}
                                        style={{ strokeDashoffset: getGaugeOffset(burnout?.score || 0) }}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center" style={{ transform: 'rotate(0deg)' }}>
                                    <span className={cn('text-2xl font-bold font-display', getBurnoutColor(burnout?.score || 0))}>
                                        {burnout?.score || 0}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Factors */}
                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Analysis Factors</p>
                            {burnout?.factors?.map((f, i) => (
                                <div key={i} className="flex items-start gap-2 text-xs text-txt-muted">
                                    <span className="text-accent mt-0.5">•</span>
                                    <span>{f}</span>
                                </div>
                            ))}
                        </div>

                        {/* Recommendations */}
                        {burnout?.recommendations?.length > 0 && (
                            <div className="mt-4 p-3 bg-accent/5 rounded-lg border border-accent/10">
                                <p className="text-xs font-semibold text-accent mb-2">Recommendations</p>
                                {burnout.recommendations.map((r, i) => (
                                    <p key={i} className="text-xs text-txt-muted mb-1">— {r}</p>
                                ))}
                            </div>
                        )}

                        <p className="text-[10px] text-txt-muted mt-3 italic">{burnout?.label}</p>
                    </Card>

                    {/* Team Burnout (Manager/Admin) */}
                    {isManager && teamBurnout && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Team Burnout Overview</CardTitle>
                                <Badge variant={teamBurnout.averageScore <= 30 ? 'success' : teamBurnout.averageScore <= 60 ? 'warning' : 'danger'}>
                                    Avg: {teamBurnout.averageScore}
                                </Badge>
                            </CardHeader>

                            <div className="flex items-center gap-4 mb-4">
                                <div>
                                    <p className="text-sm text-txt-muted">Team Size</p>
                                    <p className="text-2xl font-bold font-display text-txt-primary">{teamBurnout.teamSize}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-txt-muted">High Risk</p>
                                    <p className="text-2xl font-bold font-display text-accent-danger">{teamBurnout.highRiskCount}</p>
                                </div>
                            </div>

                            {/* Team Members List */}
                            <div className="space-y-2 max-h-72 overflow-y-auto">
                                {teamBurnout.team?.map((member) => (
                                    <div key={member.employee._id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center text-xs font-bold text-accent">
                                                {member.employee.name?.[0]}
                                            </div>
                                            <div>
                                                <p className="text-sm text-txt-primary">{member.employee.name}</p>
                                                <p className="text-[10px] text-txt-muted">{member.employee.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className={cn(
                                                'text-sm font-bold',
                                                getBurnoutColor(member.score)
                                            )}>
                                                {member.score}
                                            </div>
                                            <Badge variant={member.score <= 30 ? 'success' : member.score <= 60 ? 'warning' : 'danger'} className="text-[10px]">
                                                {member.category}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <p className="text-[10px] text-txt-muted mt-3 italic">{teamBurnout.label}</p>
                        </Card>
                    )}

                    {/* Employee: Leave Pattern & Suggestions */}
                    {!isManager && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Your Leave Patterns</CardTitle>
                                <Badge variant="info">Insights</Badge>
                            </CardHeader>

                            {/* Stats summary */}
                            {leaveStats && (
                                <div className="grid grid-cols-3 gap-3 mb-5">
                                    <div className="bg-accent/5 rounded-xl p-3 text-center">
                                        <p className="text-2xl font-bold font-display text-accent">{leaveStats.totalDays}</p>
                                        <p className="text-[10px] text-txt-muted mt-1">Days Used</p>
                                    </div>
                                    <div className="bg-accent-success/5 rounded-xl p-3 text-center">
                                        <p className="text-2xl font-bold font-display text-accent-success">{leaveStats.approvedLeaves}</p>
                                        <p className="text-[10px] text-txt-muted mt-1">Approved</p>
                                    </div>
                                    <div className="bg-accent-warning/5 rounded-xl p-3 text-center">
                                        <p className="text-2xl font-bold font-display text-accent-warning">{leaveStats.pending}</p>
                                        <p className="text-[10px] text-txt-muted mt-1">Pending</p>
                                    </div>
                                </div>
                            )}

                            {/* Leave type breakdown */}
                            {leaveStats?.typeCounts && Object.keys(leaveStats.typeCounts).length > 0 && (
                                <div className="mb-5">
                                    <p className="text-xs font-semibold text-txt-secondary uppercase tracking-wide mb-3">Usage by Type</p>
                                    <div className="space-y-2.5">
                                        {Object.entries(leaveStats.typeCounts)
                                            .sort((a, b) => b[1] - a[1])
                                            .map(([type, days]) => {
                                                const pct = Math.round((days / leaveStats.totalDays) * 100);
                                                return (
                                                    <div key={type}>
                                                        <div className="flex justify-between text-xs mb-1">
                                                            <span className="text-txt-primary font-medium">{typeLabels[type] || type}</span>
                                                            <span className="text-txt-muted">{days} day{days > 1 ? 's' : ''} ({pct}%)</span>
                                                        </div>
                                                        <div className="h-2 bg-border/40 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-accent rounded-full transition-all duration-500"
                                                                style={{ width: `${pct}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            )}

                            {/* Smart tips */}
                            <div className="p-3 bg-accent/5 rounded-lg border border-accent/10">
                                <p className="text-xs font-semibold text-accent mb-2">💡 Smart Tips</p>
                                {suggestions && Array.isArray(suggestions) && suggestions.length > 0 ? (
                                    suggestions.slice(0, 4).map((s, i) => (
                                        <p key={i} className="text-xs text-txt-muted mb-1.5">— {typeof s === 'string' ? s : s.message || s.suggestion || JSON.stringify(s)}</p>
                                    ))
                                ) : (
                                    <>
                                        {burnout?.score <= 30 && <p className="text-xs text-txt-muted mb-1">— Great work-life balance! Consider taking a short getaway soon.</p>}
                                        {burnout?.score > 30 && burnout?.score <= 60 && <p className="text-xs text-txt-muted mb-1">— Consider taking regular short breaks to prevent burnout buildup.</p>}
                                        {burnout?.score > 60 && <p className="text-xs text-txt-muted mb-1">— Your workload is high. Please schedule time off soon.</p>}
                                        {leaveStats?.totalDays === 0 && <p className="text-xs text-txt-muted mb-1">— You haven't used any leave yet. Plan some time off!</p>}
                                        {leaveStats?.mostUsedType && <p className="text-xs text-txt-muted mb-1">— Most of your leaves are {typeLabels[leaveStats.mostUsedType]}. Try diversifying your time off.</p>}
                                        <p className="text-xs text-txt-muted mb-1">— Check upcoming holidays to plan long weekends.</p>
                                    </>
                                )}
                            </div>

                            <p className="text-[10px] text-txt-muted mt-3 italic">Based on your leave history and AI analysis</p>
                        </Card>
                    )}
                </div>
            </div>
        </>
    );
}
