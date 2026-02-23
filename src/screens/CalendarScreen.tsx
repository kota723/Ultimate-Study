import React, { useState } from 'react';
import { useAppContext } from '../AppContext';
import type { ScheduleType } from '../types';
import { format, addDays, subDays, startOfWeek, isSameDay } from 'date-fns';
import { Plus, ChevronLeft, ChevronRight, Trash2, Edit2 } from 'lucide-react';

const CalendarScreen: React.FC = () => {
    const { schedules, classSchedules, examEvents, addSchedule, updateSchedule, addClassSchedule, deleteSchedule, deleteClassScheduleInstance } = useAppContext();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showModal, setShowModal] = useState(false);
    const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);

    // Form state
    const [title, setTitle] = useState('');
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('10:00');
    const [type, setType] = useState<ScheduleType>('自習');
    const [isWeekly, setIsWeekly] = useState(false);

    const openEditModal = (sched: any) => {
        if (sched.isClassSchedule || sched.isExam) return; // Editing class/exam from here would be complex, keep it simple
        setEditingScheduleId(sched.id);
        setTitle(sched.title);
        setStartTime(sched.startTime);
        setEndTime(sched.endTime);
        setType(sched.type);
        setShowModal(true);
    };

    const handleSave = () => {
        if (isWeekly) {
            addClassSchedule({
                title,
                startTime,
                endTime,
                dayOfWeek: currentDate.getDay(),
            });
        } else if (editingScheduleId) {
            updateSchedule(editingScheduleId, {
                title,
                startTime,
                endTime,
                type,
            });
        } else {
            addSchedule({
                title,
                startTime,
                endTime,
                type,
                date: format(currentDate, 'yyyy-MM-dd'),
                completed: false
            });
        }
        setShowModal(false);
        setEditingScheduleId(null);
        setTitle('');
        setIsWeekly(false);
    };

    const handleDelete = (sched: any) => {
        if (window.confirm('この予定を削除しますか？')) {
            if (sched.isClassSchedule) {
                deleteClassScheduleInstance(sched.id, format(currentDate, 'yyyy-MM-dd'));
            } else {
                deleteSchedule(sched.id);
            }
        }
    };

    const startDay = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startDay, i));

    const selectedDateStr = format(currentDate, 'yyyy-MM-dd');

    // Combine one-off schedules, recurring class schedules, and exams
    const daySchedules = [
        ...schedules.filter(s => s.date === selectedDateStr),
        ...classSchedules
            .filter(c => c.dayOfWeek === currentDate.getDay() && !c.deletedDates.includes(selectedDateStr))
            .map(c => ({
                id: c.id,
                title: c.title,
                startTime: c.startTime,
                endTime: c.endTime,
                type: '授業' as ScheduleType,
                date: selectedDateStr,
                isClassSchedule: true
            })),
        ...examEvents
            .filter(e => e.date === selectedDateStr)
            .map(e => ({
                id: e.id,
                title: `【${e.type}】${e.title}`,
                startTime: '08:00', // Exams usually start in morning
                endTime: '16:00',
                type: '予定' as ScheduleType,
                date: selectedDateStr,
                isExam: true
            }))
    ].sort((a, b) => a.startTime.localeCompare(b.startTime));

    return (
        <>
            <div className="flex-col" style={{ gap: '20px' }}>
                <div className="row-between" style={{ marginTop: '10px' }}>
                    <h2>カレンダー・計画</h2>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ padding: '8px', borderRadius: '50%' }}>
                        <Plus size={20} />
                    </button>
                </div>

                <div className="card flex-col" style={{ margin: 0 }}>
                    <div className="row-between" style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border-light)' }}>
                        <button onClick={() => setCurrentDate(subDays(currentDate, 7))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-main)' }}>
                            <ChevronLeft size={20} />
                        </button>
                        <span style={{ fontWeight: 600 }}>{format(currentDate, 'yyyy年 MM月')}</span>
                        <button onClick={() => setCurrentDate(addDays(currentDate, 7))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-main)' }}>
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginTop: '16px' }}>
                        {weekDays.map(day => {
                            const isSelected = isSameDay(day, currentDate);
                            const isToday = isSameDay(day, new Date());
                            return (
                                <div
                                    key={day.toISOString()}
                                    onClick={() => setCurrentDate(day)}
                                    style={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                                        padding: '12px 0', borderRadius: '16px',
                                        background: isSelected ? 'var(--primary)' : 'transparent',
                                        color: isSelected ? 'white' : 'var(--text-main)',
                                        cursor: 'pointer', border: isToday && !isSelected ? '1px solid var(--primary)' : '1px solid transparent'
                                    }}
                                >
                                    <span style={{ fontSize: '0.75rem', opacity: isSelected ? 0.9 : 0.6 }}>{['日', '月', '火', '水', '木', '金', '土'][day.getDay()]}</span>
                                    <span style={{ fontSize: '1.1rem', fontWeight: isSelected ? 700 : 500 }}>{format(day, 'd')}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex-col" style={{ gap: '12px' }}>
                    <h3 style={{ margin: '8px 0 0 0' }}>{format(currentDate, 'M月d日')}のタイムライン</h3>

                    {daySchedules.length > 0 ? (
                        <div style={{ position: 'relative', marginLeft: '16px', marginTop: '12px', borderLeft: '2px dashed var(--border-light)', paddingLeft: '24px' }}>
                            {daySchedules.map((schedule, index) => (
                                <div key={schedule.id} style={{ position: 'relative', marginBottom: index === daySchedules.length - 1 ? 0 : '24px' }}>
                                    <div style={{
                                        position: 'absolute', left: '-31px', top: '0px',
                                        width: '12px', height: '12px', borderRadius: '50%',
                                        background: schedule.type === '授業' ? 'var(--secondary)' : schedule.type === '予定' ? 'var(--warning)' : 'var(--success)',
                                        border: '2px solid var(--bg-main)'
                                    }} />

                                    <div className="card" style={{ margin: 0, padding: '16px' }}>
                                        <div className="row-between" style={{ marginBottom: '8px' }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>{schedule.startTime} - {schedule.endTime}</span>
                                            <div className="flex-row" style={{ gap: '8px', alignItems: 'center' }}>
                                                <span className={schedule.type === '授業' ? 'badge badge-purple' : schedule.type === '予定' ? 'badge badge-orange' : 'badge badge-green'}>{schedule.type}</span>
                                                <div className="flex-row" style={{ gap: '4px' }}>
                                                    {!(schedule as any).isClassSchedule && !(schedule as any).isExam && (
                                                        <button onClick={() => openEditModal(schedule)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0 }}>
                                                            <Edit2 size={16} />
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleDelete(schedule)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 0 }}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <h4 style={{ margin: '0 0 8px 0' }}>{schedule.title}</h4>
                                        {schedule.type === '自習' && (
                                            <div className="flex-row" style={{ gap: '8px', opacity: (schedule as any).completed ? 0.5 : 1 }}>
                                                <input type="checkbox" checked={(schedule as any).completed || false} readOnly style={{ accentColor: 'var(--success)', width: '16px', height: '16px' }} />
                                                <span style={{ fontSize: '0.85rem' }}>{(schedule as any).completed ? '完了済み' : '未完了'}</span>
                                            </div>
                                        )}
                                        {(schedule as any).isClassSchedule && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>※毎週の授業</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                            予定はありません
                        </div>
                    )}
                </div>

            </div>

            {
                showModal && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                        <div className="card flex-col" style={{ width: '100%', maxWidth: '480px', margin: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, paddingBottom: '40px', gap: '16px' }}>
                            <div className="row-between">
                                <h3 style={{ margin: 0 }}>予定を{editingScheduleId ? '編集' : '追加'}</h3>
                                <button onClick={() => { setShowModal(false); setEditingScheduleId(null); }} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
                            </div>

                            <div className="input-group">
                                <label className="input-label">日付</label>
                                <input type="text" className="input-field" value={format(currentDate, 'yyyy年MM月dd日')} readOnly disabled />
                            </div>

                            <div className="input-group">
                                <label className="input-label">予定名</label>
                                <input type="text" className="input-field" placeholder="例: 数学問題集 10p~ / 時間割の科目名" value={title} onChange={e => setTitle(e.target.value)} />
                            </div>

                            <div className="flex-row" style={{ gap: '16px' }}>
                                <div className="input-group" style={{ flex: 1 }}>
                                    <label className="input-label">開始時間</label>
                                    <input type="time" className="input-field" value={startTime} onChange={e => setStartTime(e.target.value)} />
                                </div>
                                <div className="input-group" style={{ flex: 1 }}>
                                    <label className="input-label">終了時間</label>
                                    <input type="time" className="input-field" value={endTime} onChange={e => setEndTime(e.target.value)} />
                                </div>
                            </div>

                            <div className="input-group" style={{ marginBottom: '8px' }}>
                                <label className="input-label">種類</label>
                                <div className="flex-col" style={{ gap: '8px' }}>
                                    <div className="flex-row" style={{ gap: '8px' }}>
                                        {(['授業', '自習', '予定'] as ScheduleType[]).map(t => (
                                            <button
                                                key={t}
                                                className={`btn ${type === t && !isWeekly ? 'btn-primary' : ''}`}
                                                style={{
                                                    flex: 1, padding: '8px', fontSize: '0.9rem',
                                                    background: type === t && !isWeekly ? 'var(--primary)' : 'var(--bg-main)',
                                                    color: type === t && !isWeekly ? 'white' : 'var(--text-main)',
                                                }}
                                                onClick={() => { setType(t); setIsWeekly(false); }}
                                            >
                                                {t}<br /><span style={{ fontSize: '0.7rem' }}>(単発)</span>
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        className={`btn ${isWeekly ? 'btn-primary' : ''}`}
                                        style={{
                                            width: '100%', padding: '8px', fontSize: '0.9rem',
                                            background: isWeekly ? 'var(--secondary)' : 'var(--bg-main)',
                                            color: isWeekly ? 'white' : 'var(--text-main)',
                                        }}
                                        onClick={() => setIsWeekly(true)}
                                    >
                                        授業 (毎週繰り返す)
                                    </button>
                                </div>
                            </div>

                            <button className="btn btn-primary" onClick={handleSave} disabled={!title}>{editingScheduleId ? '更新する' : '追加する'}</button>
                        </div>
                    </div>
                )
            }

        </>
    );
};

export default CalendarScreen;
