import React, { useEffect, useState } from 'react';
import { useAppContext } from './AppContext';
import { format, addDays, differenceInDays, parse } from 'date-fns';
import { Heart, MessageCircle, Bell } from 'lucide-react';

const NotificationHandler: React.FC = () => {
    const { schedules, classSchedules, assignments, notifications: socialNotifications, clearNotification } = useAppContext();
    const [localNotifications, setLocalNotifications] = useState<{ id: string; msg: string; type: 'info' | 'warning' | 'like' | 'comment'; senderName?: string }[]>([]);

    useEffect(() => {
        const checkNotifications = () => {
            const now = new Date();
            const hour = now.getHours();
            const todayStr = format(now, 'yyyy-MM-dd');
            const tomorrowStr = format(addDays(now, 1), 'yyyy-MM-dd');

            const newNotifications: { id: string; msg: string; type: 'info' | 'warning' | 'like' | 'comment' }[] = [];

            // 1. Morning Check (7 AM)
            if (hour === 7) {
                const todaySchedules = [
                    ...schedules.filter(s => s.date === todayStr),
                    ...classSchedules.filter(c => c.dayOfWeek === now.getDay() && !c.deletedDates.includes(todayStr))
                ];
                if (todaySchedules.length > 0) {
                    newNotifications.push({
                        id: `morning-${todayStr}`,
                        msg: `おはよう！今日は ${todaySchedules.length} 件の予定があります。頑張りましょう！`,
                        type: 'info'
                    });
                }
            }

            // 2. Evening Check (8 PM)
            if (hour === 20) {
                const tomorrowDate = addDays(now, 1);
                const tomorrowStr = format(tomorrowDate, 'yyyy-MM-dd');
                const tomorrowSchedules = [
                    ...schedules.filter(s => s.date === tomorrowStr),
                    ...classSchedules.filter(c => c.dayOfWeek === tomorrowDate.getDay() && !c.deletedDates.includes(tomorrowStr))
                ];
                if (tomorrowSchedules.length > 0) {
                    newNotifications.push({
                        id: `evening-${todayStr}`,
                        msg: `明日の予定は ${tomorrowSchedules.length} 件です。準備しておきましょう。`,
                        type: 'info'
                    });
                }
            }

            // 3. Assignment Check
            assignments.filter(a => !a.isCompleted).forEach(assn => {
                const daysLeft = differenceInDays(parse(assn.dueDate, 'yyyy-MM-dd', new Date()), now);
                if (daysLeft === 1 || daysLeft === 0) {
                    newNotifications.push({
                        id: `assn-${assn.id}-${daysLeft}`,
                        msg: `課題「${assn.title}」の期限が${daysLeft === 0 ? '今日' : '明日'}です！`,
                        type: 'warning'
                    });
                }
            });

            setLocalNotifications(prev => {
                const existingIds = new Set(prev.map(n => n.id));
                return [...prev, ...newNotifications.filter(n => !existingIds.has(n.id))];
            });
        };

        checkNotifications();
        const timer = setInterval(checkNotifications, 1000 * 60 * 30); // 30 mins
        return () => clearInterval(timer);
    }, [schedules, classSchedules, assignments]);

    // Handle Social Notifications
    useEffect(() => {
        if (socialNotifications.length > 0) {
            const newSocial = socialNotifications.map(n => ({
                id: n.id,
                msg: n.text,
                type: n.type,
                senderName: n.senderName
            }));

            setLocalNotifications(prev => {
                const existingIds = new Set(prev.map(p => p.id));
                return [...prev, ...newSocial.filter(s => !existingIds.has(s.id))];
            });
        }
    }, [socialNotifications]);

    const handleDismiss = (id: string, isSocial: boolean) => {
        setLocalNotifications(prev => prev.filter(n => n.id !== id));
        if (isSocial) {
            clearNotification(id);
        }
    };

    if (localNotifications.length === 0) return null;

    return (
        <div style={{
            position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)',
            width: '90%', maxWidth: '400px', zIndex: 10000, display: 'flex', flexDirection: 'column', gap: '12px'
        }}>
            {localNotifications.map(n => (
                <div key={n.id} className="card" style={{
                    margin: 0, padding: '16px', background: 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid var(--border-light)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                    borderRadius: '20px',
                    animation: 'slideInUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}>
                    <div className="flex-row" style={{ gap: '12px', alignItems: 'flex-start' }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '14px',
                            background: n.type === 'like' ? '#fff1f2' : n.type === 'comment' ? '#f0f9ff' : n.type === 'warning' ? '#fffbeb' : '#f5f3ff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            {n.type === 'like' ? <Heart size={20} color="#e11d48" fill="#e11d48" /> :
                                n.type === 'comment' ? <MessageCircle size={20} color="#0284c7" /> :
                                    <Bell size={20} color="var(--primary)" />}
                        </div>
                        <div style={{ flex: 1 }}>
                            {n.senderName && <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)' }}>{n.senderName}</p>}
                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 600, lineHeight: 1.4 }}>{n.msg}</p>
                        </div>
                        <button onClick={() => handleDismiss(n.id, n.type === 'like' || n.type === 'comment')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', padding: '0 4px' }}>✕</button>
                    </div>
                </div>
            ))}
            <style>{`
                @keyframes slideInUp {
                    from { transform: translateY(100px) scale(0.9); opacity: 0; }
                    to { transform: translateY(0) scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default NotificationHandler;
