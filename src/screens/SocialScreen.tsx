import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, Search, Send, Plus, Share2, Heart, MessageCircle, ChevronLeft, Settings as SettingsIcon } from 'lucide-react';
import { useAppContext } from '../AppContext';
import type { UserProfile, StudyLog, Group, StudyLogComment } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, subDays } from 'date-fns';

const SocialScreen: React.FC = () => {
    const {
        user, userProfile, friends, followRequests, sendFollowRequest,
        acceptFollowRequest, declineFollowRequest,
        groups, groupInvitations, createGroup, inviteToGroup,
        acceptGroupInvitation, declineGroupInvitation,
        fetchUserLogs, fetchUserProfiles, updateGroup,
        addLikeToLog, addCommentToLog, studyLogs, leaveGroup
    } = useAppContext();

    const GROUP_COLORS = ['#4f46e5', '#ec4899', '#14b8a6', '#f59e0b', '#dc2626', '#8b5cf6', '#10b981', '#334155'];
    const GROUP_EMOJIS = ['📚', '✍️', '💡', '🗓️', '🔥', '🎯', '🧪', '🌍', '🏠', '🏫', '🧠', '💪', '🎨', '💻'];

    const [view, setView] = useState<'timeline' | 'friends' | 'groups'>('timeline');
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
    const [groupMembers, setGroupMembers] = useState<UserProfile[]>([]);
    const [profileLogs, setProfileLogs] = useState<StudyLog[]>([]);
    const [profileUser, setProfileUser] = useState<UserProfile | null>(null);
    const [showGroupSettings, setShowGroupSettings] = useState(false);
    const [editGroupName, setEditGroupName] = useState('');
    const [editGroupColor, setEditGroupColor] = useState('');
    const [editGroupEmoji, setEditGroupEmoji] = useState('');

    const [showLeaveGroupModal, setShowLeaveGroupModal] = useState(false);

    const [timelineLogs, setTimelineLogs] = useState<StudyLog[]>([]);
    const [isTimelineLoading, setIsTimelineLoading] = useState(true);
    const [activeCommentLogId, setActiveCommentLogId] = useState<string | null>(null);
    const [commentInput, setCommentInput] = useState('');

    const getElapsedMins = (startTime?: number) => {
        if (!startTime) return 0;
        return Math.floor((Date.now() - startTime) / 60000);
    };

    const prepareChartData = (logs: StudyLog[]) => {
        const days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i));
        return days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const total = logs
                .filter(log => log.date === dateStr)
                .reduce((acc, curr) => acc + curr.durationMinutes, 0);
            return {
                name: format(day, 'MM/dd'),
                minutes: total,
                fullDate: dateStr
            };
        });
    };

    const [searchId, setSearchId] = useState('');

    useEffect(() => {
        const loadTimeline = async () => {
            if (view === 'timeline') {
                setIsTimelineLoading(true);
                try {
                    const allLogs: StudyLog[] = [...studyLogs]; // Start with own logs
                    for (const friend of friends) {
                        const logs = await fetchUserLogs(friend.id);
                        allLogs.push(...logs);
                    }
                    setTimelineLogs(allLogs.sort((a, b) => b.createdAt - a.createdAt));
                } catch (error) {
                    console.error('Timeline Load Error:', error);
                }
                setIsTimelineLoading(false);
            }
        };
        loadTimeline();
    }, [view, friends, studyLogs]); // Added studyLogs to dependencies

    const handleSearch = () => {
        if (!searchId) return;
        if (window.confirm(`${searchId} さんにフォローリクエストを送りますか？`)) {
            sendFollowRequest(searchId);
            setSearchId('');
        }
    };

    const [showGroupModal, setShowGroupModal] = useState(false);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);

    const handleOpenGroup = async (group: Group) => {
        setSelectedGroupId(group.id);
        setEditGroupName(group.name);
        setEditGroupColor(group.themeColor || GROUP_COLORS[0]);
        setEditGroupEmoji(group.iconEmoji || GROUP_EMOJIS[0]);
        const members = await fetchUserProfiles(group.members);
        setGroupMembers(members);
    };

    const handleSaveGroupSettings = async () => {
        if (!selectedGroupId) return;
        await updateGroup(selectedGroupId, {
            name: editGroupName,
            themeColor: editGroupColor,
            iconEmoji: editGroupEmoji
        });
        setShowGroupSettings(false);
    };

    const handleLeaveGroup = async () => {
        if (!selectedGroupId) return;
        await leaveGroup(selectedGroupId);
        setShowLeaveGroupModal(false);
        setShowGroupSettings(false);
        setSelectedGroupId(null);
        alert('グループから退出しました。');
    };

    const handleViewProfile = async (userId: string) => {
        setViewingProfileId(userId);
        const [logs, profiles] = await Promise.all([
            fetchUserLogs(userId),
            fetchUserProfiles([userId])
        ]);
        setProfileLogs(logs);
        setProfileUser(profiles[0] || null);
    };

    const handleCreateGroup = async () => {
        if (!newGroupName) return;
        const gid = await createGroup(newGroupName);
        if (typeof gid === 'string') {
            for (const fid of selectedFriendIds) {
                await inviteToGroup(gid, newGroupName, fid);
            }
            setNewGroupName('');
            setSelectedFriendIds([]);
            setShowGroupModal(false);
        }
    };

    const toggleFriendSelection = (id: string) => {
        setSelectedFriendIds((prev: string[]) => prev.includes(id) ? prev.filter((fid: string) => fid !== id) : [...prev, id]);
    };

    const handleInviteMore = async () => {
        if (!selectedGroupId) return;
        const group = groups.find(g => g.id === selectedGroupId);
        if (!group) return;

        for (const fid of selectedFriendIds) {
            await inviteToGroup(selectedGroupId, group.name, fid);
        }
        setSelectedFriendIds([]);
        setShowAddMemberModal(false);
    };

    const handleLike = async (log: StudyLog) => {
        if (!user) return;
        await addLikeToLog(log.userId, log.id);
        setTimelineLogs(prev => prev.map(l => {
            if (l.id === log.id) {
                const likes = l.likes || [];
                return { ...l, likes: likes.includes(user.uid) ? likes.filter(id => id !== user.uid) : [...likes, user.uid] };
            }
            return l;
        }));
    };

    const handleComment = async (log: StudyLog) => {
        if (!commentInput.trim() || !user) return;
        await addCommentToLog(log.userId, log.id, commentInput);
        const text = commentInput;
        setCommentInput('');
        setActiveCommentLogId(null);

        const newComm: StudyLogComment = {
            id: `temp-${Date.now()}`,
            userId: user.uid,
            userName: userProfile?.customDisplayName || userProfile?.displayName || user.displayName || '自分',
            text,
            timestamp: Date.now()
        };

        setTimelineLogs(prev => prev.map(l => {
            if (l.id === log.id) {
                return { ...l, comments: [...(l.comments || []), newComm] };
            }
            return l;
        }));
    };

    const shareToLine = (text: string) => {
        const url = `${window.location.origin}${window.location.pathname}?group=${selectedGroupId}`;
        const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(text + '\n' + url)}`;
        window.open(lineUrl, '_blank');
    };

    return (
        <div className="flex-col" style={{ gap: '20px' }}>
            <div className="row-between" style={{ marginTop: '10px' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>SNS・タイムライン</h2>
                <div className="flex-row" style={{ gap: '10px' }}>
                    <button className="btn" style={{ padding: '8px', background: 'var(--bg-card)', borderRadius: '50%', border: '1px solid var(--border-light)' }}>
                        <TrendingUp size={20} color="var(--primary)" />
                    </button>
                </div>
            </div>

            <nav className="card flex-row" style={{ padding: '4px', background: 'var(--bg-main)', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
                {(['timeline', 'friends', 'groups'] as const).map((v) => (
                    <button
                        key={v}
                        onClick={() => setView(v)}
                        style={{
                            flex: 1, padding: '10px 0', border: 'none', borderRadius: '12px',
                            background: view === v ? 'var(--bg-card)' : 'transparent',
                            fontWeight: view === v ? 800 : 500,
                            boxShadow: view === v ? 'var(--shadow-sm)' : 'none',
                            color: view === v ? 'var(--text-main)' : 'var(--text-muted)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {v === 'timeline' ? 'みんなの記録' : v === 'friends' ? '友達' : 'グループ'}
                    </button>
                ))}
            </nav>

            {view === 'timeline' && (
                <div className="flex-col" style={{ gap: '16px' }}>
                    {isTimelineLoading ? (
                        <div style={{ textAlign: 'center', padding: '60px' }}>
                            <div className="loader" style={{ margin: '0 auto 16px' }}></div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>読み込み中...</p>
                        </div>
                    ) : timelineLogs.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '60px', background: 'var(--bg-card)', borderRadius: '32px' }}>
                            <Users size={64} color="var(--text-muted)" style={{ marginBottom: '20px', opacity: 0.2 }} />
                            <h3 style={{ margin: 0 }}>タイムラインが空です</h3>
                            <p style={{ margin: '12px 0 24px 0', fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>自分自身の記録を付けたり、<br />友達を追加して切磋琢磨しましょう！</p>
                            <button onClick={() => setView('friends')} className="btn btn-primary" style={{ padding: '12px 24px', borderRadius: '14px' }}>友達を探しに行く</button>
                        </div>
                    ) : (
                        timelineLogs.map(log => (
                            <article key={log.id} className="card flex-col" style={{ padding: '20px', margin: 0, gap: '16px', borderRadius: '24px', boxShadow: 'var(--shadow-sm)', border: log.userId === user?.uid ? '2px solid var(--primary-light)' : '1px solid var(--border-light)' }}>
                                <div className="flex-row" style={{ gap: '12px', alignItems: 'center' }}>
                                    <div style={{ position: 'relative' }} onClick={() => handleViewProfile(log.userId)}>
                                        <img
                                            src={log.userPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${log.userId}`}
                                            alt={log.userName}
                                            style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'var(--bg-main)', cursor: 'pointer', objectFit: 'cover' }}
                                        />
                                        {log.userId === user?.uid && (
                                            <div style={{ position: 'absolute', top: -5, left: -5, background: 'var(--primary)', color: 'white', padding: '2px 6px', borderRadius: '10px', fontSize: '0.6rem', fontWeight: 900 }}>YOU</div>
                                        )}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{log.userName}</h4>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{format(new Date(log.createdAt), 'MM/dd HH:mm')}</p>
                                    </div>
                                    <span className="badge badge-blue" style={{ padding: '4px 10px' }}>{log.category}</span>
                                </div>

                                <div style={{ background: 'linear-gradient(to bottom, var(--bg-main), transparent)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
                                    <div className="row-between" style={{ alignItems: 'flex-end', marginBottom: '8px' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>{log.subject}</h3>
                                        <div style={{ textAlign: 'right' }}>
                                            <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary)', fontVariantNumeric: 'tabular-nums' }}>{log.durationMinutes}</span>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginLeft: '4px' }}>min</span>
                                        </div>
                                    </div>
                                    {log.memo && (
                                        <p style={{ margin: '12px 0 0 0', fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.5, paddingLeft: '12px', borderLeft: '3px solid var(--primary-light)' }}>
                                            {log.memo}
                                        </p>
                                    )}
                                </div>

                                <div className="flex-row" style={{ gap: '24px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
                                    <button
                                        onClick={() => handleLike(log)}
                                        className="flex-row"
                                        style={{ background: 'none', border: 'none', gap: '8px', alignItems: 'center', cursor: 'pointer', color: log.likes?.includes(user?.uid || '') ? 'var(--danger)' : 'var(--text-muted)', transition: 'transform 0.2s' }}
                                        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.9)'}
                                        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        <Heart size={22} fill={log.likes?.includes(user?.uid || '') ? 'currentColor' : 'none'} />
                                        <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{log.likes?.length || 0}</span>
                                    </button>
                                    <button
                                        onClick={() => setActiveCommentLogId(activeCommentLogId === log.id ? null : log.id)}
                                        className="flex-row"
                                        style={{ background: 'none', border: 'none', gap: '8px', alignItems: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}
                                    >
                                        <MessageCircle size={22} />
                                        <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{log.comments?.length || 0}</span>
                                    </button>
                                </div>

                                {(log.comments && log.comments.length > 0) && (
                                    <div className="flex-col" style={{ gap: '10px', background: 'var(--bg-main)', padding: '16px', borderRadius: '16px', marginTop: '4px' }}>
                                        {log.comments.map(c => (
                                            <div key={c.id} style={{ fontSize: '0.85rem', display: 'flex', gap: '8px' }}>
                                                <span style={{ fontWeight: 800, color: 'var(--primary)', whiteSpace: 'nowrap' }}>{c.userName}</span>
                                                <span style={{ color: 'var(--text-main)' }}>{c.text}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {activeCommentLogId === log.id && (
                                    <div className="flex-row" style={{ gap: '10px', marginTop: '4px' }}>
                                        <input
                                            type="text"
                                            className="input-field"
                                            placeholder="頑張った友達に応援コメント..."
                                            style={{ flex: 1, padding: '12px 16px', fontSize: '0.9rem', borderRadius: '14px' }}
                                            value={commentInput}
                                            onChange={e => setCommentInput(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleComment(log)}
                                            autoFocus
                                        />
                                        <button
                                            onClick={() => handleComment(log)}
                                            className="btn btn-primary"
                                            style={{ width: '45px', height: '45px', padding: 0, borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <Send size={20} />
                                        </button>
                                    </div>
                                )}
                            </article>
                        ))
                    )}
                </div>
            )
            }

            {
                view === 'friends' && (
                    <div className="flex-col" style={{ gap: '16px' }}>
                        <div className="card" style={{ padding: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '20px' }}>
                            <div className="flex-row" style={{ gap: '12px', alignItems: 'center' }}>
                                <Search size={22} color="var(--primary)" />
                                <input
                                    type="text"
                                    placeholder="ユーザーID（UUID）で友達を検索"
                                    style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '1rem', flex: 1, color: 'var(--text-main)' }}
                                    value={searchId}
                                    onChange={e => setSearchId(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                />
                                {searchId && <button onClick={handleSearch} className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '0.85rem', borderRadius: '10px' }}>リクエスト</button>}
                            </div>
                        </div>

                        {followRequests.length > 0 && (
                            <div className="flex-col" style={{ gap: '12px', padding: '20px', background: 'var(--primary-light)10', borderRadius: '24px', border: '2px solid var(--primary-light)' }}>
                                <div className="row-between">
                                    <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--primary)', fontWeight: 800 }}>👋 フォローリクエスト</h4>
                                    <span style={{ background: 'var(--primary)', color: 'white', fontSize: '0.75rem', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold' }}>{followRequests.length}</span>
                                </div>
                                {followRequests.map(req => (
                                    <div key={req.id} className="card flex-row" style={{ padding: '16px', margin: 0, gap: '16px', background: 'white', borderRadius: '16px' }}>
                                        <img src={req.senderPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.senderId}`} style={{ width: '48px', height: '48px', borderRadius: '12px' }} alt="sender" />
                                        <div style={{ flex: 1 }}>
                                            <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{req.senderName}</p>
                                            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>招待が届いています</p>
                                        </div>
                                        <div className="flex-row" style={{ gap: '8px' }}>
                                            <button onClick={() => acceptFollowRequest(req)} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>承認</button>
                                            <button onClick={() => declineFollowRequest(req.id)} className="btn" style={{ padding: '8px 16px', fontSize: '0.85rem', color: 'var(--danger)', background: 'var(--bg-main)' }}>拒否</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="row-between">
                            <h4 style={{ margin: '8px 0', fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 700 }}>友達 ({friends.length}人)</h4>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                            {friends.map(friend => (
                                <div key={friend.id} onClick={() => handleViewProfile(friend.id)} className="card flex-row" style={{ padding: '16px', margin: 0, gap: '16px', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.2s' }}>
                                    <div style={{ position: 'relative' }}>
                                        <img src={friend.customPhotoURL || friend.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.id}`} alt={friend.displayName} style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'var(--bg-main)' }} />
                                        <div style={{
                                            position: 'absolute', right: -2, bottom: -2, width: '16px', height: '16px', borderRadius: '50%',
                                            background: friend.status === 'studying' ? 'var(--secondary)' : friend.status === 'online' ? 'var(--success)' : 'var(--text-muted)',
                                            border: '3px solid white'
                                        }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>{friend.customDisplayName || friend.displayName}</h4>
                                        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            {friend.status === 'studying' ? (
                                                <span style={{ color: 'var(--secondary)', fontWeight: 700 }}>
                                                    🔥 {friend.currentSubject || '勉強中'} ({getElapsedMins(friend.timerStartTime)}分)
                                                </span>
                                            ) : friend.status === 'online' ? <span style={{ color: 'var(--success)' }}>オンライン</span> : 'オフライン'}
                                        </p>
                                    </div>
                                    <TrendingUp size={18} color="var(--primary)" />
                                </div>
                            ))}
                        </div>

                        <div className="card flex-col" style={{ padding: '24px', background: 'var(--bg-card)', borderRadius: '24px', margin: '16px 0 0 0', gap: '16px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-md)' }}>
                            <div className="flex-col" style={{ gap: '4px' }}>
                                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Share2 size={20} color="var(--primary)" />
                                    友達を招待する
                                </h4>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>あなたの招待URLを共有して一緒に勉強しよう！</p>
                            </div>

                            <div className="flex-row" style={{ gap: '8px' }}>
                                <input
                                    type="text"
                                    readOnly
                                    className="input-field"
                                    value={`${window.location.origin}?add=${user?.uid}`}
                                    style={{ flex: 1, padding: '12px', fontSize: '0.85rem', background: 'var(--bg-main)', color: 'var(--text-muted)' }}
                                    onClick={e => (e.target as HTMLInputElement).select()}
                                />
                                <button
                                    onClick={() => {
                                        const url = `${window.location.origin}?add=${user?.uid}`;
                                        navigator.clipboard.writeText(url);
                                        alert('URLをコピーしました！');
                                    }}
                                    className="btn btn-primary"
                                    style={{ padding: '0 16px', borderRadius: '12px', whiteSpace: 'nowrap', fontWeight: 700 }}
                                >
                                    コピー
                                </button>
                            </div>

                            <div className="flex-row" style={{ gap: '12px' }}>
                                <button
                                    onClick={() => {
                                        const url = `${window.location.origin}?add=${user?.uid}`;
                                        window.open(`https://line.me/R/msg/text/?Ultimate%20Study%E3%81%A7%E5%8F%8B%E9%81%94%E3%81%AB%E3%81%AA%E3%82%8D%E3%81%86%EF%BC%81%0A${encodeURIComponent(url)}`, '_blank');
                                    }}
                                    className="btn"
                                    style={{ flex: 1, padding: '14px', borderRadius: '16px', background: '#06c755', color: 'white', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                >
                                    LINEで招待
                                </button>
                                <button
                                    onClick={() => {
                                        const url = `${window.location.origin}?add=${user?.uid}`;
                                        window.open(`mailto:?subject=Ultimate%20Study%E3%81%AE%E6%8B%9B%E5%BE%85&body=Ultimate%20Study%E3%81%A7%E5%8F%8B%E9%81%94%E3%81%AB%E3%81%AA%E3%82%8D%E3%81%86%EF%BC%81%0A${encodeURIComponent(url)}`, '_blank');
                                    }}
                                    className="btn"
                                    style={{ flex: 1, padding: '14px', borderRadius: '16px', background: '#ea4335', color: 'white', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                >
                                    メールで招待
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                view === 'groups' && (
                    <div className="flex-col" style={{ gap: '16px' }}>
                        {groupInvitations.length > 0 && (
                            <div className="flex-col" style={{ gap: '12px', padding: '20px', background: 'var(--secondary)10', borderRadius: '24px', border: '2px solid var(--secondary)' }}>
                                <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--secondary)', fontWeight: 800 }}>📢 グループへの招待</h4>
                                {groupInvitations.map(inv => (
                                    <div key={inv.id} className="card flex-row" style={{ padding: '16px', margin: 0, gap: '16px', background: 'white', borderRadius: '16px' }}>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{inv.groupName}</p>
                                            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>招待者: {inv.senderName}</p>
                                        </div>
                                        <div className="flex-row" style={{ gap: '8px' }}>
                                            <button onClick={() => acceptGroupInvitation(inv)} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem', background: 'var(--secondary)' }}>参加</button>
                                            <button onClick={() => declineGroupInvitation(inv.id)} className="btn" style={{ padding: '8px 16px', fontSize: '0.85rem', color: 'var(--danger)', background: 'var(--bg-main)' }}>拒否</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="row-between">
                            <div className="flex-row" style={{ gap: '8px' }}>
                                <Users size={22} color="var(--primary)" />
                                <h3 style={{ margin: 0 }}>ルーム・グループ</h3>
                            </div>
                            <button className="btn btn-primary" onClick={() => setShowGroupModal(true)} style={{ padding: '8px 16px', fontSize: '0.85rem', borderRadius: '10px' }}>
                                <Plus size={18} style={{ marginRight: '4px' }} />新規作成
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                            {groups.map(group => (
                                <div key={group.id} onClick={() => handleOpenGroup(group)} className="card flex-row" style={{ padding: '20px', margin: 0, gap: '20px', borderLeft: `8px solid ${group.themeColor || 'var(--primary)'}`, borderRadius: '24px', cursor: 'pointer', transition: 'all 0.2s' }}>
                                    <div style={{ width: '60px', height: '60px', borderRadius: '18px', background: `${group.themeColor || 'var(--primary)'}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', border: `1px solid ${group.themeColor || 'var(--primary)'}30` }}>
                                        {group.iconEmoji || '📚'}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', fontWeight: 800 }}>{group.name}</h4>
                                        <div className="flex-row" style={{ gap: '12px' }}>
                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Users size={14} /> {group.members.length} members
                                            </span>
                                            {friends.filter(f => group.members.includes(f.id) && f.status === 'studying').length > 0 && (
                                                <span style={{ fontSize: '0.85rem', color: 'var(--secondary)', fontWeight: 800 }}>🔥 勉強中</span>
                                            )}
                                        </div>
                                    </div>
                                    <ChevronLeft size={24} style={{ transform: 'rotate(180deg)', color: 'var(--text-muted)' }} />
                                </div>
                            ))}
                        </div>

                        {groups.length === 0 && <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', border: '1px dashed var(--border-light)', borderRadius: '24px' }}>参加しているグループはありません。</div>}
                    </div>
                )
            }

            {/* Group Detail Full View */}
            {
                selectedGroupId && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--bg-main)', zIndex: 1100, display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.3s ease-out', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
                        <header style={{ padding: '20px', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-card)' }}>
                            <div className="row-between">
                                <button onClick={() => setSelectedGroupId(null)} className="btn" style={{ padding: '8px', background: 'var(--bg-main)', borderRadius: '50%' }}><ChevronLeft size={24} /></button>
                                <div className="flex-col" style={{ alignItems: 'center' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>{groups.find(g => g.id === selectedGroupId)?.iconEmoji} {groups.find(g => g.id === selectedGroupId)?.name}</h3>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{groupMembers.length} 人が参加中</p>
                                </div>
                                <button onClick={() => setShowGroupSettings(true)} className="btn" style={{ padding: '8px', background: 'var(--bg-main)', borderRadius: '50%' }}><SettingsIcon size={20} /></button>
                            </div>
                        </header>

                        <div style={{ flex: 1, padding: '24px', overflowY: 'auto', background: 'var(--bg-main)' }}>
                            <div className="flex-row" style={{ marginBottom: '24px', gap: '12px' }}>
                                <button
                                    onClick={() => shareToLine(`ルーム「${groups.find(g => g.id === selectedGroupId)?.name}」で一緒に勉強しませんか？`)}
                                    className="btn"
                                    style={{ flex: 1, background: '#06C755', color: 'white', padding: '12px', borderRadius: '14px', fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                >
                                    <Share2 size={18} /> LINEで招待
                                </button>
                                <button
                                    onClick={() => setShowAddMemberModal(true)}
                                    className="btn btn-primary"
                                    style={{ flex: 1, padding: '12px', borderRadius: '14px', fontWeight: 800, fontSize: '0.9rem' }}
                                >
                                    <Plus size={18} style={{ marginRight: '6px' }} /> 友達を招待
                                </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '20px' }}>
                                {groupMembers.map(member => (
                                    <div key={member.id} onClick={() => handleViewProfile(member.id)} className="card flex-col" style={{
                                        padding: '20px', margin: 0, alignItems: 'center', gap: '14px', borderRadius: '24px',
                                        background: member.status === 'studying' ? 'var(--bg-card)' : 'rgba(0,0,0,0.03)',
                                        border: member.id === user?.uid ? '2px solid var(--primary-light)' : member.status === 'studying' ? `2px solid ${groups.find(g => g.id === selectedGroupId)?.themeColor}40` : '1px dashed var(--border-light)',
                                        boxShadow: member.status === 'studying' ? 'var(--shadow-lg)' : 'none',
                                        position: 'relative', cursor: 'pointer'
                                    }}>
                                        {member.status === 'studying' && (
                                            <div style={{ position: 'absolute', top: -10, background: 'var(--secondary)', color: 'white', padding: '3px 10px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 900, boxShadow: '0 4px 10px rgba(245, 158, 11, 0.3)' }}>
                                                勉強中 🔥
                                            </div>
                                        )}
                                        <div style={{ position: 'relative' }}>
                                            <img src={member.customPhotoURL || member.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.id}`} style={{ width: '64px', height: '64px', borderRadius: '20px', opacity: member.status !== 'offline' ? 1 : 0.5 }} alt="member" />
                                            <div style={{ position: 'absolute', right: -4, bottom: -4, width: '18px', height: '18px', borderRadius: '50%', background: member.status === 'studying' ? 'var(--secondary)' : member.status === 'online' ? 'var(--success)' : 'var(--text-muted)', border: '3px solid white' }} />
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>{member.customDisplayName || member.displayName}</p>
                                            {member.status === 'studying' ? (
                                                <p style={{ margin: '6px 0 0 0', fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: 700 }}>{member.currentSubject} <br />({getElapsedMins(member.timerStartTime)}m)</p>
                                            ) : (
                                                <p style={{ margin: '6px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{member.status === 'online' ? '休憩中' : '離席'}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Profile Detail View */}
            {
                viewingProfileId && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--bg-main)', zIndex: 1200, padding: 'max(env(safe-area-inset-top), 20px) 20px env(safe-area-inset-bottom) 20px', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto', animation: 'slideInUp 0.3s ease-out' }}>
                        <div className="row-between">
                            <button onClick={() => setViewingProfileId(null)} className="btn" style={{ padding: '8px 16px', borderRadius: '12px', background: 'var(--bg-card)', fontWeight: 700 }}>← 戻る</button>
                            <h3 style={{ margin: 0, fontWeight: 800 }}>プロフィール</h3>
                            <div style={{ width: '60px' }} />
                        </div>

                        {profileUser && (
                            <div className="card flex-row" style={{ alignItems: 'center', gap: '24px', padding: '28px', borderRadius: '32px', background: 'linear-gradient(135deg, white 0%, var(--bg-main) 100%)' }}>
                                <img src={profileUser.customPhotoURL || profileUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileUser.id}`} style={{ width: '90px', height: '90px', borderRadius: '24px', boxShadow: 'var(--shadow-lg)' }} alt="profile" />
                                <div className="flex-col" style={{ gap: '8px' }}>
                                    <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900 }}>{profileUser.customDisplayName || profileUser.displayName}</h2>
                                    <div className="flex-row">
                                        <div className="badge" style={{ background: profileUser.status === 'studying' ? 'var(--secondary)15' : 'var(--bg-main)', color: profileUser.status === 'studying' ? 'var(--secondary)' : 'var(--text-muted)', border: '1px solid currentColor', padding: '4px 12px', fontWeight: 700 }}>
                                            {profileUser.status === 'studying' ? '集中 🔥' : profileUser.status === 'online' ? 'オンライン' : 'オフライン'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="card flex-col" style={{ gap: '20px', borderRadius: '32px', padding: '24px' }}>
                            <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>週間学習トレンド</h4>
                            <div style={{ width: '100%', height: '220px' }}>
                                <ResponsiveContainer>
                                    <BarChart data={prepareChartData(profileLogs)}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: 'var(--text-muted)' }} />
                                        <YAxis hide />
                                        <Tooltip
                                            cursor={{ fill: 'var(--primary-light)15' }}
                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: 'var(--shadow-xl)', padding: '12px' }}
                                        />
                                        <Bar dataKey="minutes" radius={[6, 6, 0, 0]}>
                                            {prepareChartData(profileLogs).map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={index === 6 ? 'var(--primary)' : 'var(--primary-light)'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="flex-col" style={{ gap: '12px' }}>
                            <h4 style={{ margin: '8px 0', fontSize: '1.1rem', fontWeight: 800 }}>直近の学習記録</h4>
                            {profileLogs.length === 0 ? (
                                <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', borderRadius: '24px' }}>まだ記録がありません。</div>
                            ) : profileLogs.map(log => (
                                <div key={log.id} className="card flex-col" style={{ padding: '18px', margin: 0, gap: '8px', borderRadius: '20px' }}>
                                    <div className="row-between">
                                        <span style={{ fontWeight: 800, fontSize: '1.05rem' }}>{log.subject}</span>
                                        <span className="badge badge-purple">{log.category}</span>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>{log.date} | {log.durationMinutes}分</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }

            {/* Modals restored with full functionality */}
            {
                showGroupModal && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                        <div className="card flex-col" style={{ width: '100%', maxWidth: 'min(768px, 100vw)', margin: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, paddingBottom: '48px', gap: '24px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '32px 32px 0 0' }}>
                            <div className="row-between">
                                <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>グループ作成</h3>
                                <button onClick={() => setShowGroupModal(false)} style={{ background: 'var(--bg-main)', border: 'none', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
                            </div>
                            <div className="input-group">
                                <label className="input-label">ルーム名</label>
                                <input type="text" className="input-field" placeholder="例: 2時限目自習室" style={{ padding: '16px', borderRadius: '16px' }} value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
                            </div>
                            <div className="input-group">
                                <label className="input-label">友達を招待</label>
                                <div className="flex-col" style={{ gap: '10px' }}>
                                    {friends.map(friend => (
                                        <div key={friend.id} onClick={() => toggleFriendSelection(friend.id)} className="flex-row" style={{ gap: '14px', padding: '12px', cursor: 'pointer', borderRadius: '16px', background: selectedFriendIds.includes(friend.id) ? 'var(--primary-light)15' : 'transparent', border: `2px solid ${selectedFriendIds.includes(friend.id) ? 'var(--primary)' : 'var(--border-light)'}` }}>
                                            <img src={friend.customPhotoURL || friend.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.id}`} alt={friend.displayName} style={{ width: '40px', height: '40px', borderRadius: '12px' }} />
                                            <span style={{ flex: 1, fontSize: '1rem', fontWeight: 600 }}>{friend.customDisplayName || friend.displayName}</span>
                                            <div style={{ width: '24px', height: '24px', borderRadius: '8px', border: '2px solid var(--primary)', background: selectedFriendIds.includes(friend.id) ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {selectedFriendIds.includes(friend.id) && <Plus size={16} color="white" />}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <button className="btn btn-primary" onClick={handleCreateGroup} disabled={!newGroupName} style={{ padding: '18px', borderRadius: '18px', fontSize: '1.1rem', fontWeight: 800 }}>ルームを作成して招待を送信</button>
                        </div>
                    </div>
                )
            }

            {
                showGroupSettings && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                        <div className="card flex-col" style={{ width: '100%', maxWidth: 'min(768px, 100vw)', margin: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, paddingBottom: '48px', gap: '24px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '32px 32px 0 0' }}>
                            <div className="row-between">
                                <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>ルーム設定を編集</h3>
                                <button onClick={() => setShowGroupSettings(false)} style={{ background: 'var(--bg-main)', border: 'none', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
                            </div>
                            <div className="input-group">
                                <label className="input-label">ルーム名</label>
                                <input type="text" className="input-field" style={{ padding: '16px', borderRadius: '16px' }} value={editGroupName} onChange={e => setEditGroupName(e.target.value)} />
                            </div>
                            <div className="input-group">
                                <label className="input-label">アイコン (絵文字)</label>
                                <div className="flex-row" style={{ flexWrap: 'wrap', gap: '10px' }}>
                                    {GROUP_EMOJIS.map(emoji => (
                                        <button
                                            key={emoji}
                                            onClick={() => setEditGroupEmoji(emoji)}
                                            style={{
                                                width: '50px', height: '50px', fontSize: '1.5rem', borderRadius: '16px',
                                                background: editGroupEmoji === emoji ? 'var(--primary-light)20' : 'var(--bg-main)',
                                                border: `2px solid ${editGroupEmoji === emoji ? 'var(--primary)' : 'var(--border-light)'}`
                                            }}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="input-group">
                                <label className="input-label">テーマカラー</label>
                                <div className="flex-row" style={{ flexWrap: 'wrap', gap: '12px' }}>
                                    {GROUP_COLORS.map(color => (
                                        <button
                                            key={color}
                                            onClick={() => setEditGroupColor(color)}
                                            style={{
                                                width: '40px', height: '40px', borderRadius: '50%', background: color,
                                                border: editGroupColor === color ? '4px solid white' : 'none',
                                                boxShadow: editGroupColor === color ? `0 0 0 3px ${color}` : 'none'
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                            <button className="btn btn-primary" onClick={handleSaveGroupSettings} style={{ padding: '18px', borderRadius: '18px', fontSize: '1.1rem', fontWeight: 800 }}>設定を保存する</button>
                            <button className="btn" onClick={() => setShowLeaveGroupModal(true)} style={{ padding: '18px', borderRadius: '18px', fontSize: '1rem', fontWeight: 700, background: 'var(--danger)20', color: 'var(--danger)', border: '1px solid var(--danger)40', marginTop: '12px' }}>グループから退出する</button>
                        </div>
                    </div>
                )
            }

            {
                showAddMemberModal && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                        <div className="card flex-col" style={{ width: '100%', maxWidth: 'min(768px, 100vw)', margin: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, paddingBottom: '48px', gap: '24px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '32px 32px 0 0' }}>
                            <div className="row-between">
                                <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>友達を追加招待</h3>
                                <button onClick={() => { setShowAddMemberModal(false); setSelectedFriendIds([]); }} style={{ background: 'var(--bg-main)', border: 'none', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
                            </div>
                            <div className="input-group">
                                <div className="flex-col" style={{ gap: '10px' }}>
                                    {friends.filter(f => !groups.find(g => g.id === selectedGroupId)?.members.includes(f.id)).map(friend => (
                                        <div key={friend.id} onClick={() => toggleFriendSelection(friend.id)} className="flex-row" style={{ gap: '14px', padding: '12px', cursor: 'pointer', borderRadius: '16px', background: selectedFriendIds.includes(friend.id) ? 'var(--primary-light)15' : 'transparent', border: `2px solid ${selectedFriendIds.includes(friend.id) ? 'var(--primary)' : 'var(--border-light)'}` }}>
                                            <img src={friend.customPhotoURL || friend.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.id}`} alt={friend.displayName} style={{ width: '40px', height: '40px', borderRadius: '12px' }} />
                                            <span style={{ flex: 1, fontSize: '1rem', fontWeight: 600 }}>{friend.customDisplayName || friend.displayName}</span>
                                            <div style={{ width: '24px', height: '24px', borderRadius: '8px', border: '2px solid var(--primary)', background: selectedFriendIds.includes(friend.id) ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {selectedFriendIds.includes(friend.id) && <Plus size={16} color="white" />}
                                            </div>
                                        </div>
                                    ))}
                                    {friends.filter(f => !groups.find(g => g.id === selectedGroupId)?.members.includes(f.id)).length === 0 && (
                                        <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>招待できる友達がいません。</p>
                                    )}
                                </div>
                            </div>
                            <button className="btn btn-primary" onClick={handleInviteMore} disabled={selectedFriendIds.length === 0} style={{ padding: '18px', borderRadius: '18px', fontSize: '1.1rem', fontWeight: 800 }}>選択した友達を招待</button>
                        </div>
                    </div>
                )
            }
            {/* Leave Group Styled Modal */}
            {
                showLeaveGroupModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
                        <div style={{ background: 'var(--bg-card)', padding: '30px 24px', borderRadius: '24px', width: '100%', maxWidth: '380px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)', textAlign: 'center', animation: 'scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                            <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #f87171 0%, #dc2626 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', color: 'white' }}>
                                <Users size={32} />
                            </div>
                            <h3 style={{ fontSize: '1.3rem', fontWeight: 900, marginBottom: '10px', color: 'var(--text-main)' }}>グループから退出</h3>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.6, fontSize: '0.95rem' }}>本当に「<span style={{ fontWeight: 800, color: 'var(--danger)' }}>{groups.find(g => g.id === selectedGroupId)?.name}</span>」から退出しますか？<br />※過去の学習記録やメッセージのやり取りは見られなくなります。</p>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button onClick={() => setShowLeaveGroupModal(false)} style={{ flex: 1, padding: '14px', borderRadius: '14px', background: 'var(--bg-main)', border: '1px solid var(--border-light)', color: 'var(--text-muted)', fontWeight: 700, cursor: 'pointer' }}>キャンセル</button>
                                <button onClick={handleLeaveGroup} style={{ flex: 1, padding: '14px', borderRadius: '14px', background: 'var(--danger)', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(220, 38, 38, 0.3)' }}>退出する</button>
                            </div>
                        </div>
                    </div>
                )
            }

            <style>{`
                .loader { width: 32px; height: 32px; border: 4px solid var(--primary-light); border-bottom-color: var(--primary); border-radius: 50%; animation: rotation 1s linear infinite; }
                @keyframes rotation { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
                @keyframes slideInUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
            `}</style>
        </div >
    );
};

export default SocialScreen;
