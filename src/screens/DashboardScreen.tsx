import React, { useState, useEffect } from 'react';
import { useAppContext } from '../AppContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { BookOpen, Target, Settings, School as SchoolIcon, Layout, Trash2, Save, ChevronUp, Plus, ClipboardList, Calendar as CalendarIcon, CheckCircle2, Circle, Edit3, Wand2 } from 'lucide-react';
import { format, startOfWeek, subWeeks } from 'date-fns';
import type { ScheduleType, School, SchoolProgram, ExamSubject } from '../types';

const DashboardScreen: React.FC = () => {
    const {
        studyLogs, schedules, classSchedules, assignments, examEvents, toggleAssignment, addAssignment, deleteAssignment, deleteExamEvent,
        setActiveTab, user, signOut, userProfile, updateProfile, addExamEvent,
        setWeeklyTarget, fetchSchoolData, applySchoolProgram, saveSchoolData
    } = useAppContext();

    const [showSettings, setShowSettings] = useState(false);

    // School Code States
    const [schoolCodeInput, setSchoolCodeInput] = useState('');
    const [fetchedSchool, setFetchedSchool] = useState<School | null>(null);
    const [showSchoolModal, setShowSchoolModal] = useState(false);
    const [showAdminDashboard, setShowAdminDashboard] = useState(false);
    const [showMandatoryPopup, setShowMandatoryPopup] = useState(false);
    const [popupDismissedSession, setPopupDismissedSession] = useState(false);

    // Assignment Input States
    const [newAssnTitle, setNewAssnTitle] = useState('');
    const [newAssnDate, setNewAssnDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [newAssnTime, setNewAssnTime] = useState('');
    const [newAssnNote, setNewAssnNote] = useState('');
    const [newAssnSubject, setNewAssnSubject] = useState('');
    const [showExamsList, setShowExamsList] = useState(false);
    const [showAssignmentList, setShowAssignmentList] = useState(false);
    const [showAddAssignment, setShowAddAssignment] = useState(false);
    const [assnToConfirm, setAssnToConfirm] = useState<string | null>(null);
    const [showGoalPopup, setShowGoalPopup] = useState(false);
    const [newGoalHours, setNewGoalHours] = useState('7');
    const [newGoalMins, setNewGoalMins] = useState('0');

    // Exam Modal States
    const [showEventModal, setShowEventModal] = useState(false);
    const [eventTitle, setEventTitle] = useState('');
    const [eventDate, setEventDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [eventType, setEventType] = useState<'定期テスト' | '模試'>('定期テスト');
    const [subjects, setSubjects] = useState<Partial<ExamSubject>[]>([{ id: `temp-${Date.now()}`, name: '', maxScore: 100, targetScore: 80 }]);

    // Admin Flow States
    const [adminSchoolName, setAdminSchoolName] = useState('');
    const [adminSchoolCode, setAdminSchoolCode] = useState('');
    const [adminPrograms, setAdminPrograms] = useState<SchoolProgram[]>([]);
    const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
    const [newProgramName, setNewProgramName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveProgress, setSaveProgress] = useState(0);
    const [saveStatus, setSaveStatus] = useState('');
    const [loadingCode, setLoadingCode] = useState('');
    const [isLoadingSchool, setIsLoadingSchool] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [showWeeklyClasses, setShowWeeklyClasses] = useState(true);

    // Toast Notification
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

    // Grid Editor States
    const [selectedCells, setSelectedCells] = useState<{ day: number, period: number }[]>([]);
    const [bulkSubject, setBulkSubject] = useState('');
    const [bulkRoom, setBulkRoom] = useState('');
    const [bulkTeacher, setBulkTeacher] = useState('');

    // Elective States
    const [pendingProgramId, setPendingProgramId] = useState<string | null>(null);
    const [electiveQuestions, setElectiveQuestions] = useState<{ original: string, options: string[], type: 'split' | 'optional' }[]>([]);
    const [tempElectiveChoices, setTempElectiveChoices] = useState<{ [key: string]: string | boolean }>({});

    const periods = [
        { id: 1, name: '1限', start: '08:50', end: '09:40' },
        { id: 2, name: '2限', start: '09:50', end: '10:40' },
        { id: 3, name: '3限', start: '10:50', end: '11:40' },
        { id: 4, name: '4限', start: '11:50', end: '12:40' },
        { id: 5, name: '昼休', start: '12:40', end: '13:45' },
        { id: 6, name: '6限', start: '13:45', end: '14:35' },
        { id: 7, name: '7限', start: '14:45', end: '15:35' },
    ];

    const days = [
        { id: 1, name: '月' },
        { id: 2, name: '火' },
        { id: 3, name: '水' },
        { id: 4, name: '木' },
        { id: 5, name: '金' },
        { id: 6, name: '土' },
    ];

    // Check for school data if code is present
    useEffect(() => {
        if (userProfile?.schoolCode && !fetchedSchool && showMandatoryPopup) {
            handleVerifySchool(userProfile.schoolCode);
        }
    }, [userProfile?.schoolCode, showMandatoryPopup]);

    // Check for Monday goal-update prompt
    // Event Handlers
    const handleAddSubject = () => {
        setSubjects([...subjects, { id: `temp-${Date.now()}`, name: '', maxScore: 100, targetScore: 80 }]);
    };

    const handleRemoveSubject = (id: string) => {
        if (subjects.length > 1) setSubjects(subjects.filter(s => s.id !== id));
    };

    const handleSubjectChange = (id: string, field: keyof ExamSubject, value: string | number) => {
        setSubjects(subjects.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const handleSaveEvent = () => {
        const eventData = {
            title: eventTitle,
            date: eventDate,
            type: eventType,
            subjects: subjects.filter(s => s.name) as ExamSubject[]
        };

        addExamEvent(eventData);
        setShowEventModal(false);
        setEventTitle('');
        setSubjects([{ id: `temp-${Date.now()}`, name: '', maxScore: 100, targetScore: 80 }]);
        setToast({ message: '予定を追加しました', type: 'success' });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        if (!userProfile) return;
        const now = new Date();
        const isMonday = now.getDay() === 1;
        if (!isMonday) return;
        const lastPrompt = userProfile.lastGoalPrompt || 0;
        const startOfThisWeek = startOfWeek(now, { weekStartsOn: 1 }).getTime();
        if (lastPrompt < startOfThisWeek) {
            setShowGoalPopup(true);
        }
    }, [userProfile]);

    // Check for school code reminder
    useEffect(() => {
        if (!userProfile || popupDismissedSession) return;
        if (!userProfile.schoolCode) {
            const lastReminder = userProfile.lastSchoolCodeReminder || 0;
            const twoWeeksAgo = subWeeks(new Date(), 2).getTime();
            if (lastReminder < twoWeeksAgo) {
                setShowMandatoryPopup(true);
            }
        }
    }, [userProfile, popupDismissedSession]);

    const handleDismissMandatory = async () => {
        setPopupDismissedSession(true);
        setShowMandatoryPopup(false);
        await updateProfile({ lastSchoolCodeReminder: Date.now() });
    };

    const handleVerifySchool = async (code: string) => {
        const school = await fetchSchoolData(code);
        if (school) {
            setFetchedSchool(school);
            setShowSchoolModal(true);
            setShowMandatoryPopup(false);
        } else {
            alert('学校コードが見つかりません。');
        }
    };

    const handleAddAssignmentLocal = () => {
        if (!newAssnTitle || !newAssnDate) return;
        const dueSuffix = newAssnTime ? ` ${newAssnTime}` : '';
        const noteText = newAssnNote ? ` (${newAssnNote})` : '';
        addAssignment({
            title: newAssnTitle,
            dueDate: newAssnDate,
            dueDetail: dueSuffix + noteText,
            subject: newAssnSubject || '未設定',
            isCompleted: false,
        });
        setNewAssnTitle('');
        setNewAssnDate(format(new Date(), 'yyyy-MM-dd'));
        setNewAssnTime('');
        setNewAssnNote('');
        setNewAssnSubject('');
        setShowAddAssignment(false);
    };

    const handleCompleteAssignment = (id: string) => {
        // First confirmation: "Have you submitted it?"
        setAssnToConfirm(id);
    };

    const confirmAssignmentSubmission = () => {
        if (!assnToConfirm) return;
        toggleAssignment(assnToConfirm); // Mark completed (shows checkmark)
        const id = assnToConfirm;
        setAssnToConfirm(null);
        // Delete after a short delay to show the check animation
        setTimeout(() => deleteAssignment(id), 800);
    };

    const handleSelectProgram = (programId: string) => {
        if (!fetchedSchool) return;
        const program = fetchedSchool.programs.find(p => p.id === programId);
        if (!program) return;

        const questions: any[] = [];
        program.schedules.forEach(s => {
            if (s.title.includes('/')) {
                const subjectPart = s.title.split('@')[0];
                const parts = subjectPart.split('/');
                questions.push({ original: s.title, options: parts.map(p => p.trim()), type: 'split' });
            } else if (s.title.includes('【')) {
                questions.push({ original: s.title, type: 'optional' });
            }
        });

        const uniqueQuestions = questions.filter((v, i, a) => a.findIndex(t => t.original === v.original) === i);

        if (uniqueQuestions.length > 0) {
            setPendingProgramId(programId);
            setElectiveQuestions(uniqueQuestions);
            const initialChoices: any = {};
            uniqueQuestions.forEach(q => {
                if (q.type === 'split') initialChoices[q.original] = q.options[0];
                else initialChoices[q.original] = true;
            });
            setTempElectiveChoices(initialChoices);
        } else {
            finishProgramSelection(programId, {});
        }
    };

    const finishProgramSelection = async (programId: string, choices: { [key: string]: string | boolean }) => {
        if (!fetchedSchool) return;

        let clearOld = false;
        if (classSchedules.some(c => c.id.startsWith('school-class-'))) {
            clearOld = window.confirm('前のクラスの授業データが存在します。これらを削除した上で新しいクラスの授業を読み込みますか？\n（キャンセルで削除せずに追加します）');
        }

        setIsImporting(true);
        setToast({ message: '授業をインポートしています...', type: 'info' });
        try {
            await applySchoolProgram(fetchedSchool, programId, clearOld, choices);
            setShowSchoolModal(false);
            setPendingProgramId(null);
            setElectiveQuestions([]);
            setFetchedSchool(null);
            setSchoolCodeInput('');
            setToast({ message: '同期が完了しました！', type: 'success' });
            setTimeout(() => setToast(null), 3000);
        } catch (e: any) {
            setToast({ message: 'インポート失敗: ' + e.message, type: 'error' });
            setTimeout(() => setToast(null), 3000);
        } finally {
            setIsImporting(false);
        }
    };

    // Admin Dashboard Logic
    const handleAddProgram = () => {
        if (!newProgramName) return;
        const newProg: SchoolProgram = {
            id: `prog-${Date.now()}`,
            name: newProgramName,
            schedules: [],
            exams: []
        };
        setAdminPrograms([...adminPrograms, newProg]);
        setNewProgramName('');
    };

    const applyMitaTemplate = () => {
        setAdminSchoolName('MITA高校');
        setAdminSchoolCode('MITA-H1');
        const newProg: SchoolProgram = {
            id: 'mita-standard',
            name: '標準コース (月-土)',
            schedules: [],
            exams: []
        };
        setAdminPrograms([newProg]);
        setEditingProgramId('mita-standard');
    };

    const handleLoadSchoolData = async () => {
        const code = loadingCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
        if (!code) return;
        setIsLoadingSchool(true);
        try {
            const school = await fetchSchoolData(code);
            if (school) {
                setAdminSchoolName(school.name);
                setAdminSchoolCode(school.id);
                setAdminPrograms(school.programs);
                setLoadingCode('');
                setToast({ message: `「${school.name}」のデータを読み込みました！`, type: 'success' });
                setTimeout(() => setToast(null), 3000);
            } else {
                setToast({ message: `コード「${code}」の学校データが見つかりませんでした。`, type: 'error' });
                setTimeout(() => setToast(null), 3000);
            }
        } catch (e: any) {
            setToast({ message: '読み込みに失敗しました: ' + e.message, type: 'error' });
            setTimeout(() => setToast(null), 3000);
        } finally {
            setIsLoadingSchool(false);
        }
    };
    const toggleCellSelection = (day: number, period: number) => {
        const exists = selectedCells.find(c => c.day === day && c.period === period);
        if (exists) {
            setSelectedCells(selectedCells.filter(c => !(c.day === day && c.period === period)));
        } else {
            setSelectedCells([...selectedCells, { day, period }]);
        }
    };

    const handleBulkApply = () => {
        if (!editingProgramId || selectedCells.length === 0) return;
        if (!bulkSubject) {
            alert('教科名を入力してください');
            return;
        }

        const titleText = `${bulkSubject}${bulkRoom ? ` @ ${bulkRoom}` : ''}${bulkTeacher ? `, ${bulkTeacher}` : ''}`;

        setAdminPrograms(prev => prev.map(p => {
            if (p.id !== editingProgramId) return p;

            let newSchedules = [...p.schedules];
            selectedCells.forEach(cell => {
                const periodInfo = periods.find(pr => pr.id === cell.period);
                if (!periodInfo) return;

                // Remove existing
                newSchedules = newSchedules.filter(s => !(s.dayOfWeek === cell.day && s.startTime === periodInfo.start));

                // Add new
                newSchedules.push({
                    title: titleText,
                    dayOfWeek: cell.day,
                    startTime: periodInfo.start,
                    endTime: periodInfo.end,
                    type: '授業' as ScheduleType
                });
            });

            return { ...p, schedules: newSchedules };
        }));

        // Reset
        setSelectedCells([]);
        setBulkSubject('');
        setBulkRoom('');
        setBulkTeacher('');
    };

    const handleSaveAdminData = async () => {
        if (!adminSchoolName || !adminSchoolCode) {
            alert('学校名とコードは必須です。');
            return;
        }

        // Sanitize code
        const sanitizedCode = adminSchoolCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');

        if (!sanitizedCode) {
            setToast({ message: '有効な学校コードを入力してください（英数字）', type: 'error' });
            setTimeout(() => setToast(null), 3000);
            return;
        }

        // Multi-stage save process
        setIsSaving(true);
        setSaveProgress(10);
        setSaveStatus('データを検証中...');

        const saveTimeout = setTimeout(() => {
            setSaveStatus('時間がかかっています。ネットワークやFirebaseのセキュリティルールを確認してください...');
        }, 5000);

        try {
            const school: School = {
                id: sanitizedCode,
                name: adminSchoolName,
                adminEmail: user?.email || '',
                programs: adminPrograms
            };

            setSaveProgress(40);
            setSaveStatus('サーバーに接続中...');

            await saveSchoolData(school);

            setSaveProgress(100);
            setSaveStatus('保存完了！');

            setToast({ message: '保存完了！', type: 'success' });
            setTimeout(() => setToast(null), 3000);
            setShowAdminDashboard(false); // Close on success
        } catch (error: any) {
            console.error('Save Error:', error);
            let msg = '保存に失敗しました';
            if (error.code === 'permission-denied') {
                msg = 'アクセス拒否: 管理者アカウント（kotakamada723@gmail.com）でログインしているか確認してください。';
            } else if (error.code === 'unavailable') {
                msg = 'ネットワークエラー: 通信状況を確認してください。';
            } else {
                msg += ': ' + error.message;
            }
            setToast({ message: msg, type: 'error' });
            setTimeout(() => setToast(null), 5000);
        } finally {
            clearTimeout(saveTimeout);
            setIsSaving(false);
            setSaveProgress(0);
            setSaveStatus('');
        }
    };

    // Calculate today's data
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const todayStudyLogs = studyLogs.filter(log => log.date === todayStr);

    const totalStudyMinutes = todayStudyLogs.reduce((acc, log) => acc + log.durationMinutes, 0);

    const categoryData = todayStudyLogs.reduce((acc, log) => {
        const existing = acc.find(item => item.name === log.category);
        if (existing) {
            existing.value += log.durationMinutes;
        } else {
            acc.push({ name: log.category, value: log.durationMinutes });
        }
        return acc;
    }, [] as { name: string; value: number }[]);

    const COLORS = ['#4f46e5', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#10b981'];

    const processTitle = (title: string, choice?: string | boolean) => {
        if (!choice) {
            if (title.includes('【')) return { title, isDimmed: true };
            return { title, isDimmed: false };
        }

        if (typeof choice === 'boolean') {
            return { title, isDimmed: !choice };
        }

        // Choice is a string (Split subject)
        if (title.includes('/')) {
            const sections = title.split('@');
            const subjectPart = sections[0];
            const restPart = sections[1];

            const subjectOptions = subjectPart.split('/').map(s => s.trim());
            const selectedIndex = subjectOptions.indexOf(choice);

            if (selectedIndex === -1) return { title, isDimmed: false };

            if (restPart) {
                const metaParts = restPart.split(',').map(p => p.trim());
                const resolvedMeta = metaParts.map(part => {
                    if (part.includes('/')) {
                        const options = part.split('/').map(o => o.trim());
                        return options[selectedIndex] || options[0];
                    }
                    return part;
                });
                return { title: `${choice} @ ${resolvedMeta.join(', ')}`, isDimmed: false };
            }
            return { title: choice, isDimmed: false };
        }
        return { title, isDimmed: false };
    };

    const todaySchedules = showWeeklyClasses ? [
        ...schedules.filter(s => s.date === todayStr),
        ...classSchedules
            .filter(c => c.dayOfWeek === today.getDay() && !c.deletedDates.includes(todayStr))
            .map(c => {
                const choice = userProfile?.electiveChoices?.[c.title];
                const { title, isDimmed } = processTitle(c.title, choice);
                return {
                    id: c.id,
                    title,
                    startTime: c.startTime,
                    endTime: c.endTime,
                    type: '授業' as ScheduleType,
                    date: todayStr,
                    isClassSchedule: true,
                    isDimmed
                };
            })
    ].sort((a, b) => a.startTime.localeCompare(b.startTime)) : schedules.filter(s => s.date === todayStr).sort((a, b) => a.startTime.localeCompare(b.startTime));

    const upcomingAssignments = [...assignments]
        .filter(a => !a.isCompleted)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    const upcomingExams = examEvents
        .filter(e => new Date(e.date) >= new Date(todayStr))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 2);

    const formatHours = (minutes: number) => {
        const hrs = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hrs}h ${mins}m`;
    };

    const weekGoalMinutes = userProfile?.weeklyTargetMinutes || 0;

    const getWeekReset = (date: Date) => {
        const d = startOfWeek(date, { weekStartsOn: 1 });
        d.setHours(4, 0, 0, 0);
        if (date < d) {
            const prev = new Date(d);
            prev.setDate(prev.getDate() - 7);
            return prev;
        }
        return d;
    };

    const weekStart = getWeekReset(today);
    const weekLogs = studyLogs.filter(log => new Date(log.date + 'T04:00:00') >= weekStart);
    const totalWeekMinutes = weekLogs.reduce((acc, log) => acc + log.durationMinutes, 0);
    const weekGoalProgress = weekGoalMinutes > 0 ? Math.min((totalWeekMinutes / weekGoalMinutes) * 100, 100) : 0;

    const dailyTarget = Math.floor(weekGoalMinutes / 7);
    const goalProgress = dailyTarget > 0 ? Math.min((totalStudyMinutes / dailyTarget) * 100, 100) : 0;

    return (
        <div className="flex-col" style={{ gap: '24px' }}>
            {/* Mandatory School Code Popup */}
            {showMandatoryPopup && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.9)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)', padding: '20px' }}>
                    <div className="card flex-col" style={{ maxWidth: '400px', width: '100%', padding: '32px', borderRadius: '32px', gap: '24px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                        <div style={{ width: '80px', height: '80px', background: 'var(--primary)20', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                            <SchoolIcon size={40} color="var(--primary)" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '12px' }}>学校コードを連携しましょう</h2>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>学校コードを持っている方は入力してください。<br /><b>（授業日程やイベントが自動的にインポートされます）</b></p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--primary)', marginTop: '8px', fontWeight: 700 }}>コードを知らない方は管理者に聞いてください。</p>
                        </div>
                        <div className="flex-col" style={{ gap: '12px' }}>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="例: SEIJO-H2-AB"
                                style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 700, padding: '16px', borderRadius: '16px' }}
                                value={schoolCodeInput}
                                onChange={e => setSchoolCodeInput(e.target.value)}
                            />
                            <button onClick={() => handleVerifySchool(schoolCodeInput)} className="btn btn-primary" style={{ padding: '16px', borderRadius: '16px', fontWeight: 800 }}>インポートを開始</button>
                            <button onClick={handleDismissMandatory} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.9rem', padding: '8px', fontWeight: 600 }}>今はしない（2週間後に再通知）</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Program Selection Modal */}
            {showSchoolModal && fetchedSchool && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="card flex-col" style={{ width: '100%', maxWidth: '400px', borderRadius: '32px', padding: '32px' }}>
                        {!pendingProgramId ? (
                            <>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 900 }}>{fetchedSchool.name}</h2>
                                <p style={{ color: 'var(--text-muted)' }}>自分のクラスを選択してください</p>
                                <div className="flex-col" style={{ gap: '12px', marginTop: '20px' }}>
                                    {fetchedSchool.programs.map(p => (
                                        <button key={p.id} onClick={() => handleSelectProgram(p.id)} className="btn" style={{ background: 'var(--bg-main)', border: '1px solid var(--border-light)', padding: '16px', borderRadius: '16px', justifyContent: 'space-between' }}>
                                            <span style={{ fontWeight: 800 }}>{p.name}</span>
                                            <ChevronUp size={20} style={{ transform: 'rotate(90deg)' }} />
                                        </button>
                                    ))}
                                </div>
                                <button onClick={() => setShowSchoolModal(false)} className="btn" style={{ marginTop: '20px' }}>キャンセル</button>
                            </>
                        ) : (
                            <>
                                <h2 style={{ fontSize: '1.2rem', fontWeight: 900 }}>選択科目の設定</h2>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>あなたに合わせた時間割を作成します</p>
                                <div className="flex-col" style={{ gap: '20px', marginTop: '20px', maxHeight: '400px', overflowY: 'auto', padding: '4px' }}>
                                    {electiveQuestions.map((q, idx) => (
                                        <div key={idx} className="flex-col" style={{ gap: '8px', padding: '12px', background: 'var(--bg-main)', borderRadius: '16px' }}>
                                            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                                                {q.type === 'split' ? 'どちらの科目を選択していますか？' : 'この科目を履修していますか？'}
                                            </p>
                                            <p style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 900 }}>{q.original.split('@')[0]}</p>

                                            {q.type === 'split' ? (
                                                <div className="flex-row" style={{ gap: '8px' }}>
                                                    {q.options.map(opt => (
                                                        <button
                                                            key={opt}
                                                            onClick={() => setTempElectiveChoices({ ...tempElectiveChoices, [q.original]: opt })}
                                                            className="btn"
                                                            style={{
                                                                flex: 1,
                                                                fontSize: '0.85rem',
                                                                padding: '10px',
                                                                background: tempElectiveChoices[q.original] === opt ? 'var(--primary)' : 'white',
                                                                color: tempElectiveChoices[q.original] === opt ? 'white' : 'inherit',
                                                                border: '1px solid var(--border-light)',
                                                                borderRadius: '12px'
                                                            }}
                                                        >
                                                            {opt}
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex-row" style={{ gap: '8px' }}>
                                                    <button
                                                        onClick={() => setTempElectiveChoices({ ...tempElectiveChoices, [q.original]: true })}
                                                        className="btn"
                                                        style={{
                                                            flex: 1,
                                                            padding: '10px',
                                                            background: tempElectiveChoices[q.original] === true ? 'var(--primary)' : 'white',
                                                            color: tempElectiveChoices[q.original] === true ? 'white' : 'inherit',
                                                            border: '1px solid var(--border-light)',
                                                            borderRadius: '12px'
                                                        }}
                                                    >
                                                        履修する
                                                    </button>
                                                    <button
                                                        onClick={() => setTempElectiveChoices({ ...tempElectiveChoices, [q.original]: false })}
                                                        className="btn"
                                                        style={{
                                                            flex: 1,
                                                            padding: '10px',
                                                            background: tempElectiveChoices[q.original] === false ? 'var(--danger)' : 'white',
                                                            color: tempElectiveChoices[q.original] === false ? 'white' : 'inherit',
                                                            border: '1px solid var(--border-light)',
                                                            borderRadius: '12px'
                                                        }}
                                                    >
                                                        未履修
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex-col" style={{ gap: '10px', marginTop: '20px' }}>
                                    <button onClick={() => finishProgramSelection(pendingProgramId, tempElectiveChoices)} disabled={isImporting} className="btn btn-primary" style={{ padding: '16px', borderRadius: '16px', fontWeight: 800 }}>
                                        {isImporting ? '読み込み中...' : 'この内容で決定'}
                                    </button>
                                    <button onClick={() => setPendingProgramId(null)} disabled={isImporting} className="btn" style={{ background: 'none', color: 'var(--text-muted)' }}>やり直す</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            <div className="row-between" style={{ padding: '8px 20px', marginBottom: '8px' }}>
                <div className="flex-col">
                    <div className="flex-row" style={{ alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <img src="/logo.png" alt="Logo" style={{ width: '28px', height: '28px' }} />
                        <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, background: 'linear-gradient(90deg, var(--primary), #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Ultimate Study</h1>
                    </div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>{format(new Date(), 'yyyy年MM月dd日')} の記録</span>
                </div>
                <div className="flex-row">
                    <button className="btn" onClick={() => setShowSettings(true)} style={{ padding: '8px', borderRadius: '50%', background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
                        <Settings size={20} />
                    </button>
                </div>
            </div>

            {user?.email === 'kotakamada723@gmail.com' && (
                <button
                    onClick={() => setShowAdminDashboard(true)}
                    className="btn"
                    style={{ background: 'var(--danger)', color: 'white', padding: '12px', borderRadius: '16px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                    <Layout size={20} /> 管理者用：学校データ構築
                </button>
            )}

            <div className="card" style={{ margin: 0, background: 'linear-gradient(135deg, var(--primary) 0%, #6366f1 100%)', color: 'white', position: 'relative', overflow: 'hidden', borderRadius: '28px' }}>
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div className="row-between" style={{ marginBottom: '12px' }}>
                        <h3 style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem' }}>今週の目標達成度 (目標: {weekGoalMinutes > 0 ? formatHours(weekGoalMinutes) : '未設定'})</h3>
                        <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>{weekGoalMinutes > 0 ? Math.floor(weekGoalProgress) : '未設定'}%</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.2)', borderRadius: '4px', marginBottom: '12px' }}>
                        <div style={{ width: `${weekGoalProgress}%`, height: '100%', background: 'white', borderRadius: '4px', boxShadow: '0 0 10px rgba(255,255,255,0.5)' }} />
                    </div>
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem' }}>
                        今週は合計 <b>{formatHours(totalWeekMinutes)}</b> 勉強しました。
                    </p>
                </div>
            </div>

            <div className="flex-row" style={{ gap: '16px' }}>
                <div className="card" style={{ flex: 1, margin: 0, padding: '16px', background: 'var(--accent)', color: 'white', borderRadius: '20px' }}>
                    <div className="flex-row" style={{ color: '#ccfbf1', marginBottom: '8px' }}>
                        <BookOpen size={16} />
                        <h3 style={{ margin: 0, fontSize: '0.85rem' }}>本日の学習</h3>
                    </div>
                    <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'white' }}>{formatHours(totalStudyMinutes)}</p>
                </div>

                <div className="card" style={{ flex: 1, margin: 0, padding: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '20px' }}>
                    <div className="flex-row" style={{ color: 'var(--primary)', marginBottom: '8px' }}>
                        <Target size={16} />
                        <h3 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>今日のノルマ</h3>
                    </div>
                    <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{Math.floor(goalProgress)}%</p>
                </div>
            </div>

            <div className="card" style={{ margin: 0, borderRadius: '28px' }}>
                <h3 style={{ fontSize: '1rem' }}>本日学習した教科の内訳</h3>
                {categoryData.length > 0 ? (
                    <div style={{ height: '200px', width: '100%', marginTop: '16px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" label={false}>
                                    {categoryData.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip formatter={(value: any) => `${value} min`} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <p style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>データがありません</p>
                )}
            </div>

            <div>
                <div className="row-between" style={{ marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}><Layout size={20} color="var(--primary)" /> 本日の予定・タスク</h3>
                    <div className="flex-row" style={{ gap: '12px', alignItems: 'center' }}>
                        <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: 'var(--text-muted)' }}>
                            <input type="checkbox" checked={showWeeklyClasses} onChange={e => setShowWeeklyClasses(e.target.checked)} />
                            <span>授業を表示</span>
                        </label>
                        <span onClick={() => setActiveTab('calendar')} style={{ fontSize: '0.85rem', color: 'var(--primary)', cursor: 'pointer', fontWeight: 700 }}>すべて見る</span>
                    </div>
                </div>
                <div className="flex-col" style={{ gap: '12px' }}>
                    {todaySchedules.length > 0 ? todaySchedules.map(schedule => (
                        <div key={schedule.id} className="card flex-row" style={{ padding: '16px', margin: 0, borderRadius: '20px', opacity: (schedule as any).isDimmed ? 0.4 : 1 }}>
                            <div style={{ width: '4px', height: '40px', background: schedule.type === '授業' ? 'var(--secondary)' : schedule.type === '予定' ? 'var(--warning)' : 'var(--primary)', borderRadius: '2px' }} />
                            <div style={{ flex: 1 }}>
                                <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem' }}>{schedule.title}</h4>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    {schedule.startTime} - {schedule.endTime} | <span className={schedule.type === '授業' ? 'badge badge-purple' : schedule.type === '予定' ? 'badge badge-orange' : 'badge badge-blue'} style={{ padding: '2px 6px', fontSize: '0.65rem' }}>{schedule.type}</span>
                                    {(schedule as any).isClassSchedule && <span style={{ marginLeft: '8px', color: 'var(--primary)', fontWeight: 600 }}>(学校連携)</span>}
                                    {(schedule as any).isDimmed && <span style={{ marginLeft: '8px', fontStyle: 'italic' }}>(未履修)</span>}
                                </p>
                            </div>
                        </div>
                    )) : <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>予定はありません</p>}
                </div>
            </div>

            <div>
                <div className="card" style={{ padding: 0, overflow: 'hidden', border: 'none', background: 'none', boxShadow: 'none' }}>
                    <button
                        onClick={() => setShowAssignmentList(!showAssignmentList)}
                        className="btn"
                        style={{ width: '100%', justifyContent: 'space-between', background: 'white', border: '1px solid var(--border-light)', padding: '14px 16px', borderRadius: '18px', color: 'var(--text-main)' }}
                    >
                        <div className="flex-row" style={{ gap: '10px' }}>
                            <ClipboardList size={20} color="var(--secondary)" />
                            <span style={{ fontWeight: 800 }}>課題リスト</span>
                            {upcomingAssignments.length > 0 && (
                                <span style={{ background: 'var(--danger)', color: 'white', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px' }}>{upcomingAssignments.length}</span>
                            )}
                        </div>
                        <div className="flex-row" style={{ gap: '8px' }}>
                            <button
                                onClick={e => { e.stopPropagation(); setShowAddAssignment(true); setShowAssignmentList(true); }}
                                style={{ background: 'var(--primary)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}
                            >
                                <Plus size={16} />
                            </button>
                            <ChevronUp size={20} style={{ transform: showAssignmentList ? 'rotate(0)' : 'rotate(180deg)', transition: 'transform 0.3s' }} />
                        </div>
                    </button>

                    {showAssignmentList && (
                        <div className="flex-col" style={{ gap: '10px', marginTop: '10px', padding: '4px' }}>
                            {showAddAssignment && (
                                <div className="card flex-col" style={{ padding: '16px', background: '#f8fafc', border: '1px solid var(--primary)', borderRadius: '20px', gap: '10px' }}>
                                    <div className="row-between">
                                        <h4 style={{ margin: 0, fontWeight: 800 }}>課題を追加</h4>
                                        <button onClick={() => setShowAddAssignment(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
                                    </div>
                                    <input
                                        type="text" className="input-field"
                                        placeholder="課題名 (例: 数学プリント P.42)"
                                        value={newAssnTitle}
                                        onChange={e => setNewAssnTitle(e.target.value)}
                                    />
                                    <div className="flex-row" style={{ gap: '8px' }}>
                                        <input type="text" className="input-field" style={{ flex: 1, fontSize: '0.85rem' }} placeholder="教科" value={newAssnSubject} onChange={e => setNewAssnSubject(e.target.value)} />
                                        <input type="date" className="input-field" style={{ flex: 1, fontSize: '0.85rem' }} value={newAssnDate} onChange={e => setNewAssnDate(e.target.value)} />
                                    </div>
                                    <div className="flex-row" style={{ gap: '8px' }}>
                                        <div className="flex-col" style={{ flex: 1, gap: '4px' }}>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>提出時間 (任意)</label>
                                            <input type="time" className="input-field" style={{ fontSize: '0.85rem' }} value={newAssnTime} onChange={e => setNewAssnTime(e.target.value)} />
                                        </div>
                                        <div className="flex-col" style={{ flex: 1, gap: '4px' }}>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>備考 (例:授業までに)</label>
                                            <input type="text" className="input-field" style={{ fontSize: '0.85rem' }} placeholder="4限までに" value={newAssnNote} onChange={e => setNewAssnNote(e.target.value)} />
                                        </div>
                                    </div>
                                    <button onClick={handleAddAssignmentLocal} disabled={!newAssnTitle} className="btn btn-primary" style={{ borderRadius: '14px', padding: '12px', fontWeight: 800 }}>追加する</button>
                                </div>
                            )}
                            {upcomingAssignments.length > 0 ? upcomingAssignments.map(assn => (
                                <div key={assn.id} className="card flex-row-between" style={{ padding: '14px 16px', margin: 0, borderRadius: '18px', background: 'white', transition: 'opacity 0.4s', opacity: assn.isCompleted ? 0.5 : 1 }}>
                                    <div className="flex-row" style={{ gap: '12px', flex: 1, minWidth: 0 }}>
                                        <button
                                            onClick={() => !assn.isCompleted && handleCompleteAssignment(assn.id)}
                                            style={{ background: 'none', border: 'none', padding: 0, color: assn.isCompleted ? 'var(--success)' : 'var(--primary)', cursor: assn.isCompleted ? 'default' : 'pointer', flexShrink: 0 }}
                                        >
                                            {assn.isCompleted ? <CheckCircle2 size={24} /> : <Circle size={24} style={{ opacity: 0.3 }} />}
                                        </button>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <h4 style={{ margin: 0, fontSize: '0.95rem', textDecoration: assn.isCompleted ? 'line-through' : 'none', color: assn.isCompleted ? 'var(--text-muted)' : 'inherit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{assn.title}</h4>
                                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 700 }}>期限: {format(new Date(assn.dueDate), 'M/d')}{(assn as any).dueDetail || ''} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>| {assn.subject}</span></p>
                                        </div>
                                    </div>
                                    <button onClick={() => deleteAssignment(assn.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px', opacity: 0.4, flexShrink: 0 }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )) : <p style={{ textAlign: 'center', padding: '10px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>未完了の課題はありません</p>}
                        </div>
                    )}
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden', border: 'none', background: 'none', boxShadow: 'none' }}>
                <button
                    onClick={() => setShowExamsList(!showExamsList)}
                    className="btn"
                    style={{ width: '100%', justifyContent: 'space-between', background: 'white', border: '1px solid var(--border-light)', padding: '16px', borderRadius: '18px', color: 'var(--text-main)' }}
                >
                    <div className="flex-row" style={{ gap: '12px' }}>
                        <CalendarIcon size={20} color="#ec4899" />
                        <span style={{ fontWeight: 800 }}>試験・イベントを確認</span>
                    </div>
                    <div className="flex-row" style={{ gap: '8px' }}>
                        <div
                            onClick={e => { e.stopPropagation(); setShowEventModal(true); setShowExamsList(true); }}
                            style={{ background: '#ec4899', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}
                        >
                            <Plus size={16} />
                        </div>
                        <ChevronUp size={20} style={{ transform: showExamsList ? 'rotate(0)' : 'rotate(180deg)', transition: 'transform 0.3s' }} />
                    </div>
                </button>

                {showExamsList && (
                    <div className="flex-col" style={{ gap: '10px', marginTop: '12px', padding: '4px' }}>
                        {upcomingExams.length > 0 ? upcomingExams.map(exam => (
                            <div key={exam.id} className="card" style={{ padding: '14px 16px', margin: 0, borderRadius: '18px', background: 'linear-gradient(to right, #fdf2f8, #ffffff)', border: '1px solid #fce7f3' }}>
                                <div className="flex-row" style={{ gap: '12px' }}>
                                    <div style={{ textAlign: 'center', padding: '0 10px', borderRight: '1px solid #fbcfe8', marginRight: '4px', flexShrink: 0 }}>
                                        <span style={{ display: 'block', fontSize: '0.65rem', color: '#db2777', fontWeight: 800 }}>{format(new Date(exam.date), 'M月')}</span>
                                        <span style={{ display: 'block', fontSize: '1.3rem', fontWeight: 900, color: '#9d174d' }}>{format(new Date(exam.date), 'd')}</span>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>{exam.title}</h4>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{exam.type} | {exam.subjects.length} 教科</p>
                                    </div>
                                    <div className="flex-col" style={{ gap: '4px', justifyContent: 'center' }}>
                                        <button
                                            onClick={() => setActiveTab('stats')}
                                            style={{ background: 'none', border: 'none', color: '#db2777', cursor: 'pointer', padding: '4px', opacity: 0.7 }}
                                            title="分析画面で編集"
                                        >
                                            <Edit3 size={15} />
                                        </button>
                                        <button
                                            onClick={() => { if (window.confirm(`「${exam.title}」を削除しますか？`)) deleteExamEvent(exam.id); }}
                                            style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px', opacity: 0.6 }}
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )) : <p style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>直近のテスト予定はありません</p>}
                    </div>
                )}
            </div>

            {showEventModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <div className="card flex-col" style={{ width: '100%', maxWidth: 'min(768px, 100vw)', margin: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, paddingBottom: '40px', gap: '20px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="row-between">
                            <h3 style={{ margin: 0 }}>試験・模試を追加</h3>
                            <button onClick={() => setShowEventModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
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

                        <button className="btn btn-primary" onClick={handleSaveEvent} disabled={!eventTitle || !eventDate || !subjects[0].name} style={{ marginTop: '16px' }}>追加する</button>
                    </div>
                </div>
            )}

            {/* Admin Dashboard Entry */}
            {showAdminDashboard && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--bg-main)', zIndex: 4000, display: 'flex', flexDirection: 'column' }}>
                    <header style={{ padding: '20px', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>学校・クラスデータ構築</h2>
                        <div className="flex-row" style={{ gap: '8px' }}>
                            <button onClick={applyMitaTemplate} className="btn" style={{ background: 'var(--bg-main)', border: '1px solid var(--primary)', color: 'var(--primary)', fontSize: '0.85rem' }}>
                                <Wand2 size={16} /> 時間割テンプレ#1
                            </button>
                            <button onClick={() => setShowAdminDashboard(false)} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>終了</button>
                        </div>
                    </header>

                    {/* Load Existing School Data Panel */}
                    <div style={{ padding: '12px 20px', background: '#f8fafc', borderBottom: '1px solid var(--border-light)' }}>
                        <p style={{ margin: '0 0 8px 0', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)' }}>既存の学校データを読み込んで編集</p>
                        <div className="flex-row" style={{ gap: '8px' }}>
                            <input
                                type="text"
                                className="input-field"
                                style={{ flex: 1, height: '42px', fontSize: '0.9rem' }}
                                placeholder="学校コード (例: MITA-H1)"
                                value={loadingCode}
                                onChange={e => setLoadingCode(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleLoadSchoolData()}
                            />
                            <button
                                onClick={handleLoadSchoolData}
                                disabled={isLoadingSchool || !loadingCode}
                                className="btn btn-primary"
                                style={{ height: '42px', padding: '0 16px', fontSize: '0.85rem', whiteSpace: 'nowrap', opacity: !loadingCode ? 0.5 : 1 }}
                            >
                                {isLoadingSchool ? '読み込み中...' : '読み込んで編集'}
                            </button>
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                        <div className="flex-col" style={{ gap: '24px' }}>
                            <div className="card flex-col" style={{ gap: '16px', borderRadius: '24px' }}>
                                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><SchoolIcon size={20} /> 学校基本情報</h3>
                                <div className="input-group">
                                    <label className="input-label">学校名</label>
                                    <input type="text" className="input-field" value={adminSchoolName} onChange={e => setAdminSchoolName(e.target.value)} placeholder="例: ○○高等学校" />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">学校コード (これがインポート用になります)</label>
                                    <input type="text" className="input-field" value={adminSchoolCode} onChange={e => setAdminSchoolCode(e.target.value)} placeholder="例: SEIJO-H2" />
                                </div>
                            </div>

                            <div className="flex-col" style={{ gap: '16px' }}>
                                <div className="row-between">
                                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><Layout size={20} /> クラス・コース設定</h3>
                                    <div className="flex-row" style={{ gap: '8px' }}>
                                        <input type="text" className="input-field" style={{ width: '150px' }} value={newProgramName} onChange={e => setNewProgramName(e.target.value)} placeholder="高2AB理系" />
                                        <button onClick={handleAddProgram} className="btn btn-primary" style={{ height: '46px', padding: '0 12px' }}><Plus size={20} /></button>
                                    </div>
                                </div>

                                {adminPrograms.map(prog => (
                                    <div key={prog.id} className="card flex-col" style={{ gap: '12px', border: editingProgramId === prog.id ? '2px solid var(--primary)' : '1px solid var(--border-light)', borderRadius: '24px' }}>
                                        <div className="row-between">
                                            <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>{prog.name}</h4>
                                            <button onClick={() => setEditingProgramId(editingProgramId === prog.id ? null : prog.id)} className="btn" style={{ background: 'var(--bg-main)', padding: '10px' }}>
                                                <Edit3 size={20} />
                                            </button>
                                        </div>

                                        {editingProgramId === prog.id && (
                                            <div className="flex-col" style={{ gap: '16px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
                                                {/* GRID EDITOR */}
                                                <div className="flex-col" style={{ gap: '8px' }}>
                                                    <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 800 }}>時間割をタップして選択（複数可）、下で一括入力</p>
                                                    <div className="admin-grid">
                                                        <div className="grid-header">時限</div>
                                                        {days.map(d => <div key={d.id} className="grid-header">{d.name}</div>)}

                                                        {periods.map(p => (
                                                            <React.Fragment key={p.id}>
                                                                <div className="period-label">{p.name === '昼休' ? '昼' : p.id > 5 ? p.id - 1 : p.id}</div>
                                                                {days.map(d => {
                                                                    const schedule = prog.schedules.find(s => s.dayOfWeek === d.id && s.startTime === p.start);
                                                                    const isSelected = selectedCells.find(c => c.day === d.id && c.period === p.id);
                                                                    const isSaturdayAfternoon = d.id === 6 && p.id > 4;
                                                                    const isLunch = p.id === 5;

                                                                    return (
                                                                        <div
                                                                            key={`${d.id}-${p.id}`}
                                                                            onClick={() => !isSaturdayAfternoon && !isLunch && toggleCellSelection(d.id, p.id)}
                                                                            className={`grid-cell ${isSelected ? 'selected' : ''} ${schedule ? 'has-data' : ''} ${isSaturdayAfternoon || isLunch ? 'disabled' : ''}`}
                                                                            style={{
                                                                                opacity: (isSaturdayAfternoon || isLunch) ? 0.3 : 1,
                                                                                pointerEvents: (isSaturdayAfternoon || isLunch) ? 'none' : 'auto',
                                                                                background: isLunch ? '#f1f5f9' : undefined
                                                                            }}
                                                                        >
                                                                            {isLunch ? (
                                                                                <div style={{ margin: 'auto', fontWeight: 800, color: 'var(--text-muted)' }}>LUNCH</div>
                                                                            ) : schedule ? (
                                                                                <>
                                                                                    <div className="grid-cell-title">{schedule.title.split('@')[0]}</div>
                                                                                    <div className="grid-cell-meta">{schedule.title.split('@')[1] || ''}</div>
                                                                                </>
                                                                            ) : <div style={{ opacity: 0.2 }}>空き</div>}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </React.Fragment>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* BULK INPUT BAR */}
                                                {selectedCells.length > 0 && (
                                                    <div className="card flex-col" style={{ background: 'var(--bg-main)', border: '2px solid var(--primary)', gap: '12px' }}>
                                                        <h4 style={{ margin: 0, fontSize: '0.9rem' }}>{selectedCells.length}件をまとめて入力</h4>
                                                        <div className="flex-row" style={{ flexWrap: 'wrap' }}>
                                                            <input type="text" className="input-field" style={{ flex: 1, minWidth: '120px' }} value={bulkSubject} onChange={e => setBulkSubject(e.target.value)} placeholder="教科 (例: 数学)" />
                                                            <input type="text" className="input-field" style={{ flex: 1, minWidth: '100px' }} value={bulkRoom} onChange={e => setBulkRoom(e.target.value)} placeholder="教室 (例: 201)" />
                                                            <input type="text" className="input-field" style={{ flex: 1, minWidth: '100px' }} value={bulkTeacher} onChange={e => setBulkTeacher(e.target.value)} placeholder="先生 (例: 高橋)" />
                                                            <button onClick={handleBulkApply} className="btn btn-primary">適用</button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {!editingProgramId && (
                                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>授業数: {prog.schedules.length} コマ</p>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="flex-col" style={{ marginTop: '20px', gap: '12px' }}>
                                {isSaving ? (
                                    <div className="card flex-col" style={{ padding: '20px', background: '#f8fafc', border: '1px solid var(--border-light)', borderRadius: '24px', gap: '12px' }}>
                                        <div className="row-between">
                                            <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--primary)' }}>保存ステータス</span>
                                            <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>{saveProgress}%</span>
                                        </div>
                                        <div style={{ width: '100%', height: '12px', background: '#e2e8f0', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
                                            <div style={{
                                                width: `${saveProgress}%`,
                                                height: '100%',
                                                background: `linear-gradient(90deg, #818cf8 0%, #4f46e5 ${saveProgress}%)`,
                                                transition: 'width 0.5s ease-out',
                                                boxShadow: '0 0 10px rgba(79, 70, 229, 0.3)'
                                            }} />
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4, textAlign: 'center' }}>
                                            {saveStatus}
                                        </p>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleSaveAdminData}
                                        className="btn btn-primary"
                                        style={{ padding: '18px', borderRadius: '20px', fontWeight: 900, fontSize: '1.1rem', gap: '12px' }}
                                    >
                                        <Save size={24} /> この内容をサーバーに保存・公開
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Monday Goal Update Popup */}
            {showGoalPopup && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                    <div className="card flex-col" style={{ width: '100%', maxWidth: '360px', borderRadius: '32px', padding: '32px', gap: '20px', textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem' }}>🎯</div>
                        <div>
                            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 900 }}>今週の目標を設定しましょう！</h3>
                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>月曜日なので、今週の週間目標を更新しますか？</p>
                        </div>
                        {/* Hours + Minutes input */}
                        <div className="flex-row" style={{ gap: '12px', justifyContent: 'center', alignItems: 'flex-end' }}>
                            <div className="flex-col" style={{ alignItems: 'center', gap: '6px' }}>
                                <input
                                    type="number" min="0" max="100"
                                    style={{ width: '80px', border: 'none', background: 'var(--bg-main)', borderRadius: '12px', fontSize: '2.2rem', fontWeight: 900, color: 'var(--primary)', textAlign: 'center', outline: 'none', padding: '10px 0' }}
                                    value={newGoalHours}
                                    onChange={e => setNewGoalHours(e.target.value)}
                                />
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700 }}>時間</span>
                            </div>
                            <span style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-muted)', paddingBottom: '28px' }}>:</span>
                            <div className="flex-col" style={{ alignItems: 'center', gap: '6px' }}>
                                <input
                                    type="number" min="0" max="59"
                                    style={{ width: '80px', border: 'none', background: 'var(--bg-main)', borderRadius: '12px', fontSize: '2.2rem', fontWeight: 900, color: 'var(--primary)', textAlign: 'center', outline: 'none', padding: '10px 0' }}
                                    value={newGoalMins}
                                    onChange={e => setNewGoalMins(e.target.value)}
                                />
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700 }}>分</span>
                            </div>
                        </div>
                        <p style={{ margin: '-8px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>合計 {(parseInt(newGoalHours) || 0) * 60 + (parseInt(newGoalMins) || 0)} 分 / 週</p>
                        <div className="flex-col" style={{ gap: '10px' }}>
                            <button
                                onClick={async () => {
                                    const total = (parseInt(newGoalHours) || 0) * 60 + (parseInt(newGoalMins) || 0);
                                    if (total > 0) setWeeklyTarget(total);
                                    await updateProfile({ lastGoalPrompt: Date.now() });
                                    setShowGoalPopup(false);
                                }}
                                className="btn btn-primary"
                                style={{ padding: '14px', borderRadius: '16px', fontWeight: 800 }}
                            >
                                設定する
                            </button>
                            <button
                                onClick={async () => {
                                    await updateProfile({ lastGoalPrompt: Date.now() });
                                    setShowGoalPopup(false);
                                }}
                                className="btn"
                                style={{ padding: '12px', borderRadius: '16px', background: '#f1f5f9', color: 'var(--text-muted)', fontWeight: 700 }}
                            >
                                今週はそのままでいい
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assignment Submission Confirmation Modal */}
            {assnToConfirm && (() => {
                const assn = assignments.find(a => a.id === assnToConfirm);
                return assn ? (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                        <div className="card flex-col" style={{ width: '100%', maxWidth: '360px', borderRadius: '32px', padding: '32px', gap: '20px', textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem' }}>✅</div>
                            <div>
                                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 900 }}>提出済みですか？</h3>
                                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>「{assn.title}」<br />を完了済みにしてリストから削除します。</p>
                            </div>
                            <div className="flex-col" style={{ gap: '10px' }}>
                                <button
                                    onClick={confirmAssignmentSubmission}
                                    className="btn btn-primary"
                                    style={{ padding: '14px', borderRadius: '16px', fontWeight: 800, fontSize: '1rem' }}
                                >
                                    はい、提出しました！
                                </button>
                                <button
                                    onClick={() => setAssnToConfirm(null)}
                                    className="btn"
                                    style={{ padding: '12px', borderRadius: '16px', background: '#f1f5f9', color: 'var(--text-muted)', fontWeight: 700 }}
                                >
                                    まだ提出していない
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null;
            })()}

            {/* Premium Toast Notification */}
            {toast && (
                <div style={{ position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 10000, animation: 'slideDown 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)' }}>
                    <div className="card" style={{
                        margin: 0,
                        background: toast.type === 'success' ? '#0f172a' : toast.type === 'info' ? 'var(--primary)' : 'var(--danger)',
                        color: 'white',
                        padding: '12px 24px',
                        borderRadius: '100px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        {toast.type === 'success' ? <CheckCircle2 size={20} color="#4ade80" /> : <Settings size={20} />}
                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{toast.message}</span>
                    </div>
                </div>
            )}
            <style>{`
                @keyframes slideDown {
                    from { opacity: 0; transform: translate(-50%, -20px); }
                    to { opacity: 1; transform: translate(-50%, 0); }
                }
            `}</style>

            {
                showSettings && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                        <div className="card flex-col" style={{ width: '100%', maxWidth: 'min(768px, 100vw)', margin: 0, borderRadius: '32px 32px 0 0', padding: '24px 24px 40px 24px', gap: '24px' }}>
                            <div className="row-between">
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 900 }}>設定</h3>
                                <button onClick={() => setShowSettings(false)} className="btn" style={{ background: '#f1f5f9', borderRadius: '50%', padding: '8px' }}>✕</button>
                            </div>

                            <div className="flex-col" style={{ gap: '16px' }}>
                                <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 800 }}>プロフィール設定</h4>
                                <div className="flex-row" style={{ gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '20px' }}>
                                    <img src={userProfile?.customPhotoURL || userProfile?.photoURL || ''} style={{ width: '56px', height: '56px', borderRadius: '50%', border: '2px solid white', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }} alt="u" />
                                    <div style={{ flex: 1 }}>
                                        <p style={{ margin: 0, fontWeight: 800, fontSize: '1rem' }}>{userProfile?.customDisplayName || userProfile?.displayName}</p>
                                        <input type="text" className="input-field" placeholder="表示名を変更" value={userProfile?.customDisplayName || ''} onChange={e => updateProfile({ customDisplayName: e.target.value })} style={{ marginTop: '8px', width: '100%', background: 'white' }} />
                                    </div>
                                </div>
                            </div>

                            <div className="flex-col" style={{ gap: '16px' }}>
                                <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 800 }}>学校・クラス設定</h4>
                                <div className="flex-col" style={{ gap: '12px', background: '#f8fafc', padding: '16px', borderRadius: '20px' }}>
                                    <div className="row-between">
                                        <div>
                                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>現在の連携</p>
                                            <p style={{ margin: 0, fontWeight: 800, color: 'var(--primary)' }}>{userProfile?.schoolCode || '未連携'}</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setShowSettings(false);
                                                if (userProfile?.schoolCode) {
                                                    handleVerifySchool(userProfile.schoolCode);
                                                } else {
                                                    setShowMandatoryPopup(true);
                                                }
                                            }}
                                            className="btn"
                                            style={{ background: 'white', border: '1px solid var(--border-light)', padding: '8px 16px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700 }}
                                        >
                                            {userProfile?.schoolCode ? 'クラスの変更' : '学校コードを入力'}
                                        </button>
                                    </div>
                                    {userProfile?.schoolCode && (
                                        <button
                                            onClick={() => {
                                                setShowSettings(false);
                                                setShowMandatoryPopup(true);
                                            }}
                                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'left', padding: 0, textDecoration: 'underline', cursor: 'pointer' }}
                                        >
                                            別の学校コードを入力する
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div style={{ marginTop: '8px' }}>
                                <button onClick={signOut} className="btn" style={{ width: '100%', color: 'var(--danger)', background: '#fee2e2', borderRadius: '16px', fontWeight: 800 }}>ログアウト</button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default DashboardScreen;
