import React, { useState } from 'react';
import { useAppContext } from '../AppContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { format, subDays, differenceInDays, isSameDay } from 'date-fns';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import type { ExamSubject } from '../types';

type TimeRange = '1d' | '1w' | '1m';

const StatsScreen: React.FC = () => {
    const { studyLogs, goals, examEvents, updateExamSubjectScore, addExamEvent, updateExamEvent, deleteExamEvent, deleteStudyLog, updateStudyLog, categories, books, userProfile } = useAppContext();
    const [timeRange, setTimeRange] = useState<TimeRange>('1w');
    const [showEventModal, setShowEventModal] = useState(false);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);

    // Form state
    const [eventTitle, setEventTitle] = useState('');
    const [eventDate, setEventDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [eventType, setEventType] = useState<'定期テスト' | '模試'>('定期テスト');
    const [subjects, setSubjects] = useState<Partial<ExamSubject>[]>([{ id: `temp-${Date.now()}`, name: '', maxScore: 100, targetScore: 80 }]);

    // Edit Log state
    const [editingLogId, setEditingLogId] = useState<string | null>(null);
    const [editSubject, setEditSubject] = useState('');
    const [editDuration, setEditDuration] = useState(0);
    const [editDate, setEditDate] = useState('');
    const [editCategory, setEditCategory] = useState('');

    const openEditModal = (log: any) => {
        setEditingLogId(log.id);
        setEditSubject(log.subject);
        setEditDuration(log.durationMinutes);
        setEditDate(log.date);
        setEditCategory(log.category);
    };

    const handleUpdateLog = () => {
        if (!editingLogId) return;
        updateStudyLog(editingLogId, {
            subject: editSubject,
            durationMinutes: editDuration,
            date: editDate,
            category: editCategory
        });
        setEditingLogId(null);
    };

    const handleAddSubject = () => {
        setSubjects([...subjects, { id: `temp-${Date.now()}`, name: '', maxScore: 100, targetScore: 80 }]);
    };

    const handleRemoveSubject = (id: string) => {
        if (subjects.length > 1) setSubjects(subjects.filter(s => s.id !== id));
    };

    const handleSubjectChange = (id: string, field: keyof ExamSubject, value: string | number) => {
        setSubjects(subjects.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const openEditEventModal = (exam: any) => {
        setEditingEventId(exam.id);
        setEventTitle(exam.title);
        setEventDate(exam.date);
        setEventType(exam.type);
        setSubjects(exam.subjects);
        setShowEventModal(true);
    };

    const handleSaveEvent = () => {
        const eventData = {
            title: eventTitle,
            date: eventDate,
            type: eventType,
            subjects: subjects.filter(s => s.name) as ExamSubject[]
        };

        if (editingEventId) {
            updateExamEvent(editingEventId, eventData);
        } else {
            addExamEvent(eventData);
        }

        setShowEventModal(false);
        setEditingEventId(null);
        setEventTitle('');
        setEventType('定期テスト');
        setSubjects([{ id: `temp-${Date.now()}`, name: '', maxScore: 100, targetScore: 80 }]);
    };

    // Stats calculations
    const today = new Date();

    const getLogsForRange = (range: TimeRange, dateRef: Date) => {
        return studyLogs.filter(log => {
            const logDate = new Date(log.date);
            if (range === '1d') return isSameDay(logDate, dateRef);
            if (range === '1w') return differenceInDays(dateRef, logDate) >= 0 && differenceInDays(dateRef, logDate) <= 6;
            if (range === '1m') return differenceInDays(dateRef, logDate) >= 0 && differenceInDays(dateRef, logDate) <= 29;
            return true;
        });
    };

    const rangeLogs = getLogsForRange(timeRange, today);
    const rangeStudyMinutes = rangeLogs.reduce((acc, log) => acc + log.durationMinutes, 0);

    // Previous range for comparison
    const prevDateRef = timeRange === '1d' ? subDays(today, 1) : timeRange === '1w' ? subDays(today, 7) : subDays(today, 30);
    const prevRangeLogs = getLogsForRange(timeRange, prevDateRef);
    const prevRangeStudyMinutes = prevRangeLogs.reduce((acc, log) => acc + log.durationMinutes, 0);
    const percentChange = prevRangeStudyMinutes > 0 ? ((rangeStudyMinutes - prevRangeStudyMinutes) / prevRangeStudyMinutes) * 100 : 0;

    const weeklyGoalMins = userProfile?.weeklyTargetMinutes || (goals[0]?.targetMinutes || 420);
    const weeklyGoalTitle = goals[0]?.title || '今週の目標';
    const targetMin = timeRange === '1d' ? Math.floor(weeklyGoalMins / 7) : timeRange === '1w' ? weeklyGoalMins : (weeklyGoalMins * 4);
    const goalProgress = targetMin > 0 ? Math.min((rangeStudyMinutes / targetMin) * 100, 100) : 0;

    const categoryTotals = rangeLogs.reduce((acc, log) => {
        acc[log.category] = (acc[log.category] || 0) + log.durationMinutes;
        return acc;
    }, {} as Record<string, number>);

    const bookTotals = rangeLogs.reduce((acc, log) => {
        const name = log.subject || '不明な教材';
        acc[name] = (acc[name] || 0) + log.durationMinutes;
        return acc;
    }, {} as Record<string, number>);

    const COLORS = ['#4f46e5', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#10b981'];

    // Generate timeline data
    const getTimelineData = () => {
        const data = [];
        if (timeRange === '1d') {
            Object.entries(categoryTotals).forEach(([name, val]) => {
                data.push({ name, value: val });
            });
        } else if (timeRange === '1w') {
            for (let i = 6; i >= 0; i--) {
                const d = subDays(today, i);
                const dStr = format(d, 'yyyy-MM-dd');
                const val = studyLogs.filter(l => l.date === dStr).reduce((s, l) => s + l.durationMinutes, 0);
                data.push({ name: format(d, 'MM/dd'), value: val });
            }
        } else if (timeRange === '1m') {
            for (let i = 29; i >= 0; i--) {
                const d = subDays(today, i);
                const dStr = format(d, 'yyyy-MM-dd');
                const val = studyLogs.filter(l => l.date === dStr).reduce((s, l) => s + l.durationMinutes, 0);
                data.push({ name: format(d, 'MM/dd'), value: val });
            }
        }
        return data;
    };

    const data = getTimelineData();
    const rangeLabel = timeRange === '1d' ? '今日' : timeRange === '1w' ? '過去7日間' : '過去30日間';
    const compareLabel = timeRange === '1d' ? '昨日' : timeRange === '1w' ? '先週' : '先月';

    return (
        <>
            <div className="flex-col" style={{ gap: '20px' }}>
                <h2 style={{ marginTop: '10px' }}>分析・統計</h2>

                <div className="card flex-row" style={{ padding: '4px', background: 'var(--bg-main)', margin: '0 0 16px 0', borderRadius: '12px' }}>
                    {(['1d', '1w', '1m'] as TimeRange[]).map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            style={{
                                flex: 1, padding: '8px 0', border: 'none', borderRadius: '8px',
                                background: timeRange === range ? 'var(--bg-card)' : 'transparent',
                                fontWeight: timeRange === range ? 700 : 500,
                                boxShadow: timeRange === range ? 'var(--shadow-sm)' : 'none',
                                color: timeRange === range ? 'var(--text-main)' : 'var(--text-muted)',
                            }}
                        >
                            {range === '1d' ? '1日' : range === '1w' ? '1週間' : '1ヶ月'}
                        </button>
                    ))}
                </div>

                {/* Comparison metric */}
                <div className="flex-row" style={{ gap: '16px' }}>
                    <div className="card" style={{ flex: 1, margin: 0, padding: '16px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>合計勉強時間</span>
                        <div className="row-between" style={{ marginTop: '4px' }}>
                            <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>{Math.floor(rangeStudyMinutes / 60)}h {rangeStudyMinutes % 60}m</span>
                            {prevRangeStudyMinutes > 0 && (
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: percentChange >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                    {percentChange >= 0 ? '↑' : '↓'}{Math.abs(percentChange).toFixed(1)}%
                                </span>
                            )}
                        </div>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.7rem' }}>{compareLabel}比</p>
                    </div>
                </div>

                <div className="card flex-col" style={{ gap: '16px' }}>
                    <h3 style={{ margin: 0 }}>{timeRange === '1d' ? '今日の教科別割合' : '学習時間の推移'}</h3>

                    <div style={{ height: '300px', width: '100%', marginTop: '16px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} minTickGap={15} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                                <Tooltip
                                    cursor={{ fill: 'var(--bg-main)' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)', background: 'var(--bg-card)' }}
                                    formatter={(value: any) => [`${value} 分`, '学習時間']}
                                />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                    {data.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={timeRange === '1d' ? COLORS[index % COLORS.length] : 'var(--primary)'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card flex-col">
                    <h3 style={{ margin: '0 0 16px 0' }}>目標進捗・順位（{rangeLabel}）</h3>
                    <div className="flex-col" style={{ gap: '8px' }}>
                        <div className="row-between">
                            <span style={{ fontWeight: 600 }}>{weeklyGoalTitle}</span>
                            <span>{Math.floor(rangeStudyMinutes / 60)}h {rangeStudyMinutes % 60}m / {Math.floor(targetMin / 60)}h</span>
                        </div>
                        <div style={{ width: '100%', height: '12px', background: 'var(--border-light)', borderRadius: '6px', overflow: 'hidden' }}>
                            <div style={{ width: `${goalProgress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.5s ease' }} />
                        </div>
                    </div>

                    <h4 style={{ marginTop: '24px', marginBottom: '8px', fontSize: '0.9rem' }}>教科別順位 ({rangeLabel})</h4>
                    <div className="flex-row" style={{ flexWrap: 'wrap', gap: '8px' }}>
                        {Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).map(([cat, mins], idx) => (
                            <div key={cat} className="badge" style={{ background: `${COLORS[idx % COLORS.length]}15`, color: COLORS[idx % COLORS.length], border: `1px solid ${COLORS[idx % COLORS.length]}30` }}>
                                {cat}: {Math.floor(mins / 60)}h {mins % 60}m
                            </div>
                        ))}
                    </div>

                    <h4 style={{ marginTop: '24px', marginBottom: '8px', fontSize: '0.9rem' }}>教材別順位 ({rangeLabel})</h4>
                    <div className="flex-col" style={{ gap: '8px' }}>
                        {Object.entries(bookTotals).sort((a, b) => b[1] - a[1]).map(([book, mins]) => (
                            <div key={book} className="row-between" style={{ padding: '8px 12px', background: 'var(--bg-main)', borderRadius: '8px' }}>
                                <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{book}</span>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{Math.floor(mins / 60)}h {mins % 60}m</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card flex-col">
                    <h3 style={{ margin: '0 0 16px 0' }}>直近の学習記録</h3>
                    <div className="flex-col" style={{ gap: '12px' }}>
                        {studyLogs.slice(0, 5).map(log => (
                            <div key={log.id} className="row-between" style={{ padding: '12px', background: 'var(--bg-main)', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                                <div style={{ flex: 1 }}>
                                    <div className="flex-row" style={{ gap: '8px', marginBottom: '4px' }}>
                                        <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{log.subject}</h4>
                                        <span className="badge badge-blue" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>{log.category}</span>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        {log.date} | {log.durationMinutes}分
                                    </p>
                                </div>
                                <div className="flex-row" style={{ gap: '8px' }}>
                                    <button
                                        onClick={() => openEditModal(log)}
                                        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '8px' }}
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button
                                        onClick={() => { if (window.confirm('この記録を削除しますか？')) deleteStudyLog(log.id); }}
                                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '8px' }}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {studyLogs.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>記録がありません</p>}
                    </div>
                </div>

                <div className="card flex-col">
                    <div className="row-between">
                        <h3 style={{ margin: 0 }}>試験・イベント</h3>
                        <button className="btn btn-primary" onClick={() => setShowEventModal(true)} style={{ padding: '4px', borderRadius: '50%' }}>
                            <Plus size={16} />
                        </button>
                    </div>
                    <div className="flex-col" style={{ gap: '12px', marginTop: '8px' }}>
                        {examEvents.map(exam => {
                            const daysLeft = differenceInDays(new Date(exam.date), new Date());
                            const isPast = daysLeft < 0;

                            const totalMax = exam.subjects.reduce((sum, s) => sum + s.maxScore, 0);
                            const totalTarget = exam.subjects.reduce((sum, s) => sum + s.targetScore, 0);
                            const totalActual = isPast ? exam.subjects.reduce((sum, s) => sum + (s.actualScore || 0), 0) : 0;

                            return (
                                <div key={exam.id} style={{ padding: '16px', border: '1px solid var(--border-light)', borderRadius: '12px', background: 'var(--bg-main)' }}>
                                    <div className="row-between">
                                        <div className="flex-row" style={{ gap: '8px', alignItems: 'center' }}>
                                            <h4 style={{ margin: 0 }}>{exam.title}</h4>
                                            <span className="badge badge-purple">{exam.type}</span>
                                        </div>
                                        <div className="flex-row" style={{ gap: '8px', alignItems: 'center' }}>
                                            {!isPast ? (
                                                <span className="badge badge-orange">あと {daysLeft} 日</span>
                                            ) : (
                                                <span className="badge badge-green">終了</span>
                                            )}
                                            <button onClick={() => openEditEventModal(exam)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '4px' }}>
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => { if (window.confirm('この試験予定を削除しますか？')) deleteExamEvent(exam.id); }} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <p style={{ margin: '8px 0', fontSize: '0.9rem', fontWeight: 600 }}>
                                        総合目標: {totalTarget} / {totalMax} 点
                                        {isPast && `(結果: ${totalActual}点)`}
                                    </p>

                                    <div className="flex-col" style={{ gap: '8px', marginTop: '12px' }}>
                                        {exam.subjects.map(subject => (
                                            <div key={subject.id} className="row-between" style={{ background: 'var(--bg-card)', padding: '8px 12px', borderRadius: '8px' }}>
                                                <span style={{ fontWeight: 500 }}>{subject.name}</span>
                                                <div className="flex-row" style={{ gap: '12px', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>目標: {subject.targetScore}/{subject.maxScore}</span>
                                                    {isPast && (
                                                        <div className="flex-row" style={{ alignItems: 'center', gap: '4px' }}>
                                                            <input
                                                                type="number"
                                                                placeholder="結果"
                                                                className="input-field"
                                                                style={{ padding: '4px 8px', width: '60px', textAlign: 'center' }}
                                                                defaultValue={subject.actualScore}
                                                                onBlur={e => updateExamSubjectScore(exam.id, subject.id, parseInt(e.target.value) || 0)}
                                                            />
                                                            <span style={{ fontSize: '0.85rem' }}>点</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                        {examEvents.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', margin: '16px 0' }}>登録された試験はありません</p>}
                    </div>
                </div>

            </div>

            {showEventModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <div className="card flex-col" style={{ width: '100%', maxWidth: 'min(768px, 100vw)', margin: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, paddingBottom: '40px', gap: '20px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="row-between">
                            <h3 style={{ margin: 0 }}>試験・模試を{editingEventId ? '編集' : '追加'}</h3>
                            <button onClick={() => { setShowEventModal(false); setEditingEventId(null); }} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
                        </div>

                        <div className="input-group">
                            <label className="input-label">試験の種類</label>
                            <div className="flex-row" style={{ gap: '8px' }}>
                                {(['定期テスト', '模試'] as const).map(t => (
                                    <button
                                        key={t}
                                        className={`btn ${eventType === t ? 'btn-primary' : ''} `}
                                        style={{
                                            flex: 1, padding: '8px',
                                            background: eventType === t ? 'var(--primary)' : 'var(--bg-main)',
                                            color: eventType === t ? 'white' : 'var(--text-main)',
                                        }}
                                        onClick={() => setEventType(t)}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="input-group">
                            <label className="input-label">試験名</label>
                            <input type="text" className="input-field" placeholder="例: 春季全国模試、1学期中間テスト" value={eventTitle} onChange={e => setEventTitle(e.target.value)} />
                        </div>

                        <div className="input-group">
                            <label className="input-label">実施日</label>
                            <input type="date" className="input-field" value={eventDate} onChange={e => setEventDate(e.target.value)} />
                        </div>

                        <div className="flex-col" style={{ gap: '8px' }}>
                            <label className="input-label" style={{ marginBottom: 0 }}>受験教科と目標</label>
                            {subjects.map((sub) => (
                                <div key={sub.id} className="flex-row" style={{ gap: '8px', alignItems: 'center', background: 'var(--bg-main)', padding: '12px', borderRadius: '8px' }}>
                                    <div className="flex-col" style={{ flex: 1, gap: '8px' }}>
                                        <input
                                            type="text"
                                            className="input-field"
                                            placeholder="教科名 (例: 英語)"
                                            value={sub.name}
                                            onChange={e => handleSubjectChange(sub.id!, 'name', e.target.value)}
                                        />
                                        <div className="flex-row" style={{ gap: '8px', alignItems: 'center' }}>
                                            <input
                                                type="number"
                                                className="input-field"
                                                placeholder="目標点"
                                                title="目標点"
                                                style={{ flex: 1 }}
                                                value={sub.targetScore}
                                                onChange={e => handleSubjectChange(sub.id!, 'targetScore', parseInt(e.target.value) || 0)}
                                            />
                                            <span style={{ color: 'var(--text-muted)' }}>/</span>
                                            <input
                                                type="number"
                                                className="input-field"
                                                placeholder="満点"
                                                title="満点(配点)"
                                                style={{ flex: 1 }}
                                                value={sub.maxScore}
                                                onChange={e => handleSubjectChange(sub.id!, 'maxScore', parseInt(e.target.value) || 0)}
                                            />
                                            <span style={{ fontSize: '0.85rem' }}>点満点</span>
                                        </div>
                                    </div>
                                    <button onClick={() => handleRemoveSubject(sub.id!)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: subjects.length > 1 ? 'var(--danger)' : 'var(--text-muted)' }} disabled={subjects.length <= 1}>
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            ))}
                            <button className="btn" onClick={handleAddSubject} style={{ padding: '8px', background: 'var(--bg-main)', color: 'var(--primary)', border: '1px dashed var(--primary)', marginTop: '4px' }}>
                                <Plus size={16} /> 教科を追加
                            </button>
                        </div>

                        <button className="btn btn-primary" onClick={handleSaveEvent} disabled={!eventTitle || !eventDate || !subjects[0].name} style={{ marginTop: '16px' }}>{editingEventId ? '更新する' : '追加する'}</button>
                    </div>
                </div>
            )}

            {editingLogId && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <div className="card flex-col" style={{ width: '100%', maxWidth: 'min(768px, 100vw)', margin: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, paddingBottom: '40px', gap: '20px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="row-between">
                            <h3 style={{ margin: 0 }}>記録を編集</h3>
                            <button onClick={() => setEditingLogId(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
                        </div>

                        <div className="input-group">
                            <label className="input-label">教材・内容</label>
                            <input type="text" className="input-field" value={editSubject} onChange={e => setEditSubject(e.target.value)} list="books-list" />
                            <datalist id="books-list">
                                {books.map(b => <option key={b.id} value={b.title} />)}
                            </datalist>
                        </div>

                        <div className="flex-row" style={{ gap: '16px' }}>
                            <div className="input-group" style={{ flex: 1 }}>
                                <label className="input-label">時間 (分)</label>
                                <input type="number" className="input-field" value={editDuration} onChange={e => setEditDuration(parseInt(e.target.value) || 0)} />
                            </div>
                            <div className="input-group" style={{ flex: 1 }}>
                                <label className="input-label">日付</label>
                                <input type="date" className="input-field" value={editDate} onChange={e => setEditDate(e.target.value)} />
                            </div>
                        </div>

                        <div className="input-group">
                            <label className="input-label">カテゴリー</label>
                            <select className="input-field" value={editCategory} onChange={e => setEditCategory(e.target.value)}>
                                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>

                        <button className="btn btn-primary" onClick={handleUpdateLog} style={{ marginTop: '8px' }}>更新する</button>
                    </div>
                </div>
            )}
        </>
    );
};

export default StatsScreen;
