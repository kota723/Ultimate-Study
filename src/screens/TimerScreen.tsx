import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../AppContext';
import { Play, Pause, Square, Save, Search, ScanLine } from 'lucide-react';
import { format } from 'date-fns';

const TimerScreen: React.FC = () => {
    const {
        addStudyLog, books, addBook, categories,
        timerState, startGlobalTimer, stopGlobalTimer, resetGlobalTimer
    } = useAppContext();

    const [subject, setSubject] = useState(timerState.subject);
    const [selectedBookId, setSelectedBookId] = useState<string>('');
    const [category, setCategory] = useState<string>('英語');
    const [memo, setMemo] = useState('');
    const [isSaved, setIsSaved] = useState(false);

    const [showBookModal, setShowBookModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [mode, setMode] = useState<'stopwatch' | 'countdown' | 'manual'>('countdown');
    const [countdownInput, setCountdownInput] = useState('30');
    const [initialCountdownSeconds, setInitialCountdownSeconds] = useState(1800);
    const [manualHours, setManualHours] = useState('0');
    const [manualMins, setManualMins] = useState('30');
    const [manualDate, setManualDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [stream, setStream] = useState<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isScanning, setIsScanning] = useState(false);

    // Sync subject from timerState if it changes
    useEffect(() => {
        if (timerState.subject && !subject) {
            setSubject(timerState.subject);
        }
    }, [timerState.subject]);

    // Handle Countdown completion
    useEffect(() => {
        if (mode === 'countdown' && timerState.active && timerState.seconds >= initialCountdownSeconds) {
            stopGlobalTimer();
            // Don't auto-reset, let user see they finished
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('学習完了！', { body: '目標時間に到達しました🎉' });
            } else {
                alert('目標時間に到達しました！お疲れ様です🎉');
            }
        }
    }, [timerState.seconds, timerState.active, mode, initialCountdownSeconds]);

    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);

    const handleStart = () => {
        if (mode === 'countdown' && !timerState.active) {
            const initial = parseInt(countdownInput) * 60 || 0;
            setInitialCountdownSeconds(initial);
        }
        const bookTitle = selectedBookId ? books.find(b => b.id === selectedBookId)?.title : subject;
        startGlobalTimer(bookTitle || '無題の学習');
    };

    const handlePause = () => {
        stopGlobalTimer();
    };

    const handleReset = () => {
        resetGlobalTimer();
    };

    const handleSave = () => {
        if (mode === 'manual') {
            const totalMins = (parseInt(manualHours) || 0) * 60 + (parseInt(manualMins) || 0);
            if (totalMins === 0) { alert('時間を入力してください'); return; }
            const bookTitle = selectedBookId ? books.find(b => b.id === selectedBookId)?.title : subject;
            addStudyLog({
                subject: bookTitle || '無題の学習',
                category,
                date: manualDate,
                durationMinutes: totalMins,
                memo,
            });
            setIsSaved(true);
            setSubject('');
            setSelectedBookId('');
            setMemo('');
            setTimeout(() => setIsSaved(false), 3000);
            return;
        }

        if (timerState.seconds < 60 && mode === 'stopwatch' && !window.confirm('学習時間が1分未満ですが保存しますか？')) return;

        const bookTitle = selectedBookId ? books.find(b => b.id === selectedBookId)?.title : subject;
        addStudyLog({
            subject: bookTitle || '無題の学習',
            category,
            date: format(new Date(), 'yyyy-MM-dd'),
            durationMinutes: Math.max(1, Math.floor(timerState.seconds / 60)),
            memo,
        });

        setIsSaved(true);
        handleReset();
        setSubject('');
        setSelectedBookId('');
        setMemo('');
        setTimeout(() => setIsSaved(false), 3000);
    };


    const startCamera = async () => {
        try {
            const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            setStream(s);
            setIsScanning(true);
            if (videoRef.current) videoRef.current.srcObject = s;
        } catch (err) {
            alert('カメラの起動に失敗しました。カメラの使用を許可してください。');
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setIsScanning(false);
    };

    const formatTime = (totalSeconds: number) => {
        const displaySeconds = mode === 'countdown' ? Math.max(0, initialCountdownSeconds - totalSeconds) : totalSeconds;
        const hrs = Math.floor(displaySeconds / 3600);
        const mins = Math.floor((displaySeconds % 3600) / 60);
        const secs = displaySeconds % 60;

        if (hrs > 0) {
            return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <>
            <div className="flex-col" style={{ gap: '24px' }}>
                <div className="row-between" style={{ marginTop: '10px' }}>
                    <h2 style={{ margin: 0 }}>学習タイマー</h2>
                </div>

                <div className="card flex-row" style={{ padding: '4px', background: 'var(--bg-main)', margin: '0 0 16px 0', borderRadius: '12px' }}>
                    {(['countdown', 'stopwatch', 'manual'] as const).map((m) => (
                        <button
                            key={m}
                            onClick={() => { setMode(m); if (m !== 'manual') handleReset(); }}
                            style={{
                                flex: 1, padding: '8px 0', border: 'none', borderRadius: '8px',
                                background: mode === m ? 'var(--bg-card)' : 'transparent',
                                fontWeight: mode === m ? 700 : 500,
                                boxShadow: mode === m ? 'var(--shadow-sm)' : 'none',
                                color: mode === m ? 'var(--text-main)' : 'var(--text-muted)',
                                fontSize: '0.85rem'
                            }}
                        >
                            {m === 'stopwatch' ? 'ストップ' : m === 'countdown' ? 'タイマー' : '手入力'}
                        </button>
                    ))}
                </div>

                {mode === 'manual' ? (
                    <div className="card flex-col" style={{ alignItems: 'center', padding: '40px 20px', background: 'var(--bg-card)', borderRadius: '32px', gap: '24px' }}>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>タイマーをかけ忘れた場合などに手動で記録できます</p>
                        <div className="flex-row" style={{ gap: '12px', alignItems: 'center' }}>
                            <div className="flex-col" style={{ alignItems: 'center' }}>
                                <input
                                    type="number" min="0" max="24"
                                    style={{ width: '80px', textAlign: 'center', fontSize: '3rem', fontWeight: 900, border: 'none', background: 'transparent', color: 'var(--primary)', outline: 'none' }}
                                    value={manualHours}
                                    onChange={e => setManualHours(e.target.value)}
                                />
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>時間</span>
                            </div>
                            <span style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--text-muted)', marginBottom: '20px' }}>:</span>
                            <div className="flex-col" style={{ alignItems: 'center' }}>
                                <input
                                    type="number" min="0" max="59"
                                    style={{ width: '80px', textAlign: 'center', fontSize: '3rem', fontWeight: 900, border: 'none', background: 'transparent', color: 'var(--primary)', outline: 'none' }}
                                    value={manualMins}
                                    onChange={e => setManualMins(e.target.value)}
                                />
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>分</span>
                            </div>
                        </div>
                        <div className="input-group" style={{ width: '100%' }}>
                            <label className="input-label">学習日</label>
                            <input type="date" className="input-field" value={manualDate} onChange={e => setManualDate(e.target.value)} />
                        </div>
                    </div>
                ) : (
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', background: 'var(--bg-card)', borderRadius: '32px', boxShadow: '0 20px 40px rgba(0,0,0,0.05)' }}>
                        {mode === 'countdown' && !timerState.active && timerState.seconds === 0 && (
                            <div className="flex-row" style={{ marginBottom: '24px', background: 'var(--bg-main)', padding: '8px 16px', borderRadius: '20px' }}>
                                <input
                                    type="number"
                                    className="input-field"
                                    style={{ width: '80px', textAlign: 'center', fontSize: '1.5rem', padding: '0', background: 'transparent', border: 'none', fontWeight: 800, color: 'var(--primary)' }}
                                    value={countdownInput}
                                    onChange={e => setCountdownInput(e.target.value)}
                                />
                                <span style={{ fontSize: '1.2rem', fontWeight: 700, marginLeft: '8px' }}>分に設定</span>
                            </div>
                        )}

                        <div style={{ position: 'relative' }}>
                            {timerState.active && (
                                <div style={{
                                    position: 'absolute', top: -40, left: -40, right: -40, bottom: -40,
                                    borderRadius: '50%', border: '4px solid var(--primary)',
                                    opacity: 0.1, animation: 'ripple 2s infinite linear', zIndex: 0
                                }} />
                            )}
                            <div className="timer-display" style={{
                                zIndex: 1, position: 'relative', fontSize: '6rem', fontWeight: 900,
                                color: mode === 'countdown' && (initialCountdownSeconds - timerState.seconds) < 60 && timerState.active ? 'var(--danger)' : 'var(--text-main)',
                                fontVariantNumeric: 'tabular-nums',
                                transition: 'color 0.3s ease'
                            }}>
                                {formatTime(timerState.seconds)}
                            </div>
                        </div>

                        <div className="flex-row" style={{ gap: '32px', marginTop: '40px', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                            <div style={{ width: '60px' }} />

                            {!timerState.active ? (
                                <button className="btn btn-primary" onClick={handleStart} style={{ width: '90px', height: '90px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 20px var(--primary-light)' }}>
                                    <Play size={44} fill="white" style={{ transform: 'translateX(4px)' }} />
                                </button>
                            ) : (
                                <button className="btn" onClick={handlePause} style={{ width: '90px', height: '90px', borderRadius: '50%', padding: 0, background: 'var(--warning)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 20px rgba(245, 158, 11, 0.3)' }}>
                                    <Pause size={44} fill="white" />
                                </button>
                            )}

                            <button
                                className="btn"
                                onClick={handleReset}
                                disabled={timerState.seconds === 0 && !timerState.active}
                                style={{
                                    width: '60px', height: '60px', borderRadius: '50%', padding: 0,
                                    background: timerState.seconds === 0 && !timerState.active ? 'var(--bg-main)' : 'var(--danger)',
                                    color: 'white', opacity: timerState.seconds === 0 && !timerState.active ? 0.3 : 1,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                            >
                                <Square size={24} fill="white" />
                            </button>
                        </div>
                    </div>
                )}

                <div className="card flex-col" style={{ gap: '16px', borderRadius: '24px' }}>
                    <h3 style={{ fontSize: '1.2rem' }}>学習の記録</h3>

                    {isSaved && (
                        <div style={{ background: 'var(--success)', color: 'white', padding: '12px', borderRadius: '12px', textAlign: 'center', fontWeight: 'bold', animation: 'fadeIn 0.3s ease' }}>
                            保存完了！お疲れ様でした💪
                        </div>
                    )}

                    <div className="input-group">
                        <label className="input-label">教材・内容</label>
                        <div className="flex-col" style={{ gap: '8px' }}>
                            <select
                                className="input-field"
                                style={{ padding: '14px', borderRadius: '12px' }}
                                value={selectedBookId}
                                onChange={(e) => {
                                    setSelectedBookId(e.target.value);
                                    setSubject('');
                                }}
                            >
                                <option value="">▼ 登録済みの教材から選ぶ</option>
                                {books.map(b => (
                                    <option key={b.id} value={b.id}>{b.title}</option>
                                ))}
                            </select>
                            <div className="flex-row" style={{ alignItems: 'center', background: 'var(--bg-main)', borderRadius: '12px', padding: '4px 12px' }}>
                                <input
                                    type="text"
                                    className="input-field"
                                    style={{ flex: 1, padding: '10px', background: 'transparent', border: 'none' }}
                                    placeholder="または内容を直接入力..."
                                    value={subject}
                                    onChange={(e) => {
                                        setSubject(e.target.value);
                                        setSelectedBookId('');
                                    }}
                                />
                            </div>
                            <button
                                className="btn"
                                style={{ width: '100%', padding: '12px', marginTop: '4px', background: 'white', color: 'var(--primary)', border: '1px solid var(--primary)', borderRadius: '12px' }}
                                onClick={() => setShowBookModal(true)}
                            >
                                <ScanLine size={18} style={{ marginRight: '8px' }} />
                                新しい教材を登録 (バーコード対応)
                            </button>
                        </div>
                    </div>

                    <div className="input-group">
                        <label className="input-label">カテゴリー</label>
                        <div className="flex-row" style={{ flexWrap: 'wrap', gap: '8px' }}>
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    className={`btn ${category === cat ? 'btn-primary' : ''}`}
                                    style={{
                                        padding: '10px 18px',
                                        background: category === cat ? 'var(--primary)' : 'var(--bg-main)',
                                        color: category === cat ? 'white' : 'var(--text-main)',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontSize: '0.85rem'
                                    }}
                                    onClick={() => setCategory(cat)}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="input-group">
                        <label className="input-label">メモ (任意)</label>
                        <textarea
                            className="input-field"
                            style={{ borderRadius: '12px', padding: '12px' }}
                            placeholder="今日学んだことや、次回の目標など..."
                            rows={3}
                            value={memo}
                            onChange={(e) => setMemo(e.target.value)}
                        />
                    </div>

                    <button
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={mode !== 'manual' && timerState.seconds === 0}
                        style={{ width: '100%', marginTop: '12px', padding: '16px', borderRadius: '16px', fontSize: '1.1rem', fontWeight: 700, opacity: mode !== 'manual' && timerState.seconds === 0 ? 0.5 : 1 }}
                    >
                        <Save size={22} style={{ marginRight: '8px' }} />
                        学習を記録して終了
                    </button>
                </div>

                <style>{`
        @keyframes ripple {
          0% { transform: scale(1); opacity: 0.2; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
            </div>

            {showBookModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                    <div className="card flex-col" style={{ width: '100%', maxWidth: 'min(768px, 100vw)', margin: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, paddingBottom: '40px', gap: '20px', maxHeight: '95vh', overflowY: 'auto', borderRadius: '32px 32px 0 0' }}>
                        <div className="row-between">
                            <h3 style={{ margin: 0 }}>教材を登録</h3>
                            <button onClick={() => { setShowBookModal(false); stopCamera(); }} style={{ background: 'var(--bg-main)', border: 'none', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
                        </div>

                        {!isScanning ? (
                            <button onClick={startCamera} className="btn" style={{ padding: '20px', background: 'var(--bg-main)', borderRadius: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', border: '2px dashed var(--border-light)' }}>
                                <ScanLine size={40} color="var(--primary)" />
                                <span style={{ fontWeight: 700 }}>バーコードをスキャン</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ISBNを自動読み取りします</span>
                            </button>
                        ) : (
                            <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', background: 'black', borderRadius: '20px', overflow: 'hidden' }}>
                                <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <div style={{ position: 'absolute', top: '50%', left: '10%', right: '10%', height: '2px', background: 'var(--danger)', boxShadow: '0 0 10px var(--danger)', animation: 'scanline 2s infinite ease-in-out' }} />
                                <button onClick={stopCamera} className="btn" style={{ position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,255,255,0.8)', color: 'black', padding: '8px 16px' }}>カメラを止める</button>
                            </div>
                        )}

                        <div className="flex-col" style={{ gap: '12px' }}>
                            <label className="input-label">教材名で手動検索・登録</label>
                            <div className="flex-row" style={{ gap: '12px', background: 'var(--bg-main)', padding: '14px', borderRadius: '16px', alignItems: 'center' }}>
                                <Search size={20} color="var(--text-muted)" />
                                <input
                                    type="text"
                                    placeholder="教材名またはISBN..."
                                    style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '1rem', outline: 'none' }}
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            className="btn btn-primary"
                            disabled={!searchQuery && !isScanning}
                            style={{ padding: '16px', borderRadius: '16px', fontWeight: 700 }}
                            onClick={() => {
                                addBook(searchQuery || 'スキャンした教材');
                                setShowBookModal(false);
                                stopCamera();
                                setSearchQuery('');
                                alert('教材を登録しました！');
                            }}
                        >
                            {searchQuery ? 'この名前で登録' : isScanning ? 'スキャンして登録' : '教材を追加'}
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes scanline {
                    0% { top: 20%; }
                    50% { top: 80%; }
                    100% { top: 20%; }
                }
            `}</style>

        </>
    );
};

export default TimerScreen;
