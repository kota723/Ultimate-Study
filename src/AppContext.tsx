import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { doc, setDoc, getDoc, updateDoc, collection, onSnapshot, query, where, addDoc, deleteDoc } from 'firebase/firestore';
import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, type User } from 'firebase/auth';
import { auth, googleProvider, db } from './firebase';
import type { UserProfile, FollowRequest, StudyLog, Schedule, Goal, Group, GroupInvitation, ExamEvent, Book, ClassSchedule, Assignment, StudyLogComment, AppNotification, School } from './types';

const mockGoals: Goal[] = [{ id: 'goal-default', title: '今週の目標学習時間', targetMinutes: 1200 }];

interface AppState {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    user: User | null;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
    studyLogs: StudyLog[];
    schedules: Schedule[];
    goals: Goal[];
    examEvents: ExamEvent[];
    books: Book[];
    categories: string[];
    classSchedules: ClassSchedule[];
    assignments: Assignment[];
    userProfile: UserProfile | null;
    friends: UserProfile[];
    followRequests: FollowRequest[];
    groups: Group[];
    groupInvitations: GroupInvitation[];
    notifications: AppNotification[];

    updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
    sendFollowRequest: (targetUserId: string) => Promise<void>;
    acceptFollowRequest: (request: FollowRequest) => Promise<void>;
    declineFollowRequest: (id: string) => Promise<void>;
    updateStatus: (status: 'online' | 'offline' | 'studying', subject?: string) => Promise<void>;

    createGroup: (name: string) => Promise<string | void>;
    inviteToGroup: (groupId: string, groupName: string, receiverId: string) => Promise<void>;
    acceptGroupInvitation: (invitation: GroupInvitation) => Promise<void>;
    declineGroupInvitation: (id: string) => Promise<void>;
    joinGroupById: (groupId: string, skipConfirm?: boolean) => Promise<boolean>;
    leaveGroup: (groupId: string) => Promise<void>;
    getGroupInfo: (groupId: string) => Promise<{ name: string } | null>;

    addStudyLog: (log: Omit<StudyLog, 'id' | 'createdAt' | 'userId' | 'userName' | 'userPhoto'>) => void;
    updateStudyLog: (id: string, updates: Partial<StudyLog>) => void;
    deleteStudyLog: (id: string) => void;
    addLikeToLog: (logOwnerId: string, logId: string) => Promise<void>;
    addCommentToLog: (logOwnerId: string, logId: string, text: string) => Promise<void>;
    clearNotification: (id: string) => Promise<void>;

    addSchedule: (sched: Omit<Schedule, 'id'>) => void;
    updateSchedule: (id: string, updates: Partial<Schedule>) => void;
    deleteSchedule: (id: string) => void;
    addExamEvent: (event: Omit<ExamEvent, 'id'>) => void;
    updateExamEvent: (id: string, updates: Partial<ExamEvent>) => void;
    deleteExamEvent: (id: string) => void;
    updateExamSubjectScore: (eventId: string, subjectId: string, score: number) => void;
    addBook: (title: string) => void;
    addCategory: (category: string) => void;
    addClassSchedule: (classSched: Omit<ClassSchedule, 'id' | 'deletedDates'>) => void;
    deleteClassScheduleInstance: (id: string, dateStr: string) => void;
    deleteClassScheduleEntirely: (id: string) => void;
    addAssignment: (assignment: Omit<Assignment, 'id' | 'createdAt'>) => void;
    toggleAssignment: (id: string) => void;
    deleteAssignment: (id: string) => void;
    fetchUserLogs: (userId: string) => Promise<StudyLog[]>;
    fetchUserProfiles: (userIds: string[]) => Promise<UserProfile[]>;
    timerState: { active: boolean; seconds: number; subject: string; startTime: number | null };
    startGlobalTimer: (subject: string) => void;
    stopGlobalTimer: () => void;
    resetGlobalTimer: () => void;
    updateGroup: (groupId: string, data: Partial<Group>) => Promise<void>;
    setWeeklyTarget: (minutes: number) => Promise<void>;

    // School methods
    fetchSchoolData: (code: string) => Promise<School | null>;
    applySchoolProgram: (school: School, programId: string, clearOld?: boolean, choices?: any) => Promise<void>;
    saveSchoolData: (school: School) => Promise<void>;
}

const AppContext = createContext<AppState | undefined>(undefined);

const loadSafe = (key: string, defaultVal: any) => {
    try {
        const stored = localStorage.getItem(`study-sync-${key}`);
        if (stored) return JSON.parse(stored);
    } catch { /* ignore */ }
    return defaultVal;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [activeTab, setActiveTab] = useState('home');
    const [user, setUser] = useState<User | null>(null);
    const [studyLogs, setStudyLogs] = useState<StudyLog[]>(() => loadSafe('logs', []));
    const [schedules, setSchedules] = useState<Schedule[]>(() => loadSafe('schedules', []));
    const [goals] = useState<Goal[]>(() => loadSafe('goals', mockGoals));
    const [examEvents, setExamEvents] = useState<ExamEvent[]>(() => loadSafe('events', []));
    const [books, setBooks] = useState<Book[]>(() => loadSafe('books', []));
    const [categories, setCategories] = useState<string[]>(() => loadSafe('categories', ['英語', '数学', '国語', '理科', '社会', '資格試験', 'その他']));
    const [classSchedules, setClassSchedules] = useState<ClassSchedule[]>(() => loadSafe('classSchedules', []));
    const [assignments, setAssignments] = useState<Assignment[]>(() => loadSafe('assignments', []));
    const syncCacheRef = useRef<string>('');
    const isReceivingFromFirestore = useRef(false);

    const [timerState, setTimerState] = useState<{ active: boolean; seconds: number; subject: string; startTime: number | null }>(() => {
        const saved = localStorage.getItem('study-sync-timer');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.active && parsed.startTime) {
                const elapsed = Math.floor((Date.now() - parsed.startTime) / 1000);
                return { ...parsed, seconds: elapsed };
            }
            return parsed;
        }
        return { active: false, seconds: 0, subject: '', startTime: null };
    });

    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [friends, setFriends] = useState<UserProfile[]>([]);
    const [followRequests, setFollowRequests] = useState<FollowRequest[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [groupInvitations, setGroupInvitations] = useState<GroupInvitation[]>([]);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);

    useEffect(() => {
        if (timerState.active) {
            const interval = setInterval(() => {
                if (timerState.startTime) {
                    const elapsed = Math.floor((Date.now() - timerState.startTime) / 1000);
                    setTimerState(prev => ({ ...prev, seconds: elapsed }));
                }
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [timerState.active, timerState.startTime]);

    useEffect(() => {
        localStorage.setItem('study-sync-timer', JSON.stringify(timerState));
    }, [timerState]);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
            setUser(u);
            if (u) {
                const userDocRef = doc(db, 'users', u.uid);
                const snap = await getDoc(userDocRef);

                if (!snap.exists()) {
                    const newProfile: UserProfile = {
                        id: u.uid,
                        displayName: u.displayName || '名無し',
                        photoURL: u.photoURL || '',
                        status: 'online',
                        lastStudyTime: Date.now(),
                        friends: []
                    };
                    await setDoc(userDocRef, newProfile);
                    setUserProfile(newProfile);
                } else {
                    setUserProfile({ id: snap.id, ...snap.data() } as UserProfile);
                }

                const unDoc = onSnapshot(userDocRef, (s) => {
                    if (s.exists()) {
                        const d = s.data();
                        isReceivingFromFirestore.current = true;
                        setUserProfile({ id: s.id, ...d } as UserProfile);
                        if (d.logs) setStudyLogs(d.logs);
                        if (d.schedules) setSchedules(d.schedules);
                        if (d.assignments) setAssignments(d.assignments);
                        if (d.classSchedules) setClassSchedules(d.classSchedules);
                        if (d.examEvents) setExamEvents(d.examEvents);
                        // Reset the flag after a short delay to allow state to settle
                        setTimeout(() => { isReceivingFromFirestore.current = false; }, 500);
                    }
                });

                const q = query(collection(db, 'followRequests'), where('receiverId', '==', u.uid), where('status', '==', 'pending'));
                const unRequests = onSnapshot(q, (qs) => {
                    setFollowRequests(qs.docs.map(d => ({ id: d.id, ...d.data() } as FollowRequest)));
                });

                const qGroups = query(collection(db, 'groups'), where('members', 'array-contains', u.uid));
                const unGroups = onSnapshot(qGroups, (qs) => {
                    setGroups(qs.docs.map(d => ({ id: d.id, ...d.data() } as Group)));
                });

                const qInvites = query(collection(db, 'groupInvitations'), where('receiverId', '==', u.uid));
                const unInvites = onSnapshot(qInvites, (qs) => {
                    setGroupInvitations(qs.docs.map(d => ({ id: d.id, ...d.data() } as GroupInvitation)));
                });

                const qNotes = query(collection(db, 'notifications'), where('userId', '==', u.uid), where('isRead', '==', false));
                const unNotes = onSnapshot(qNotes, (qs) => {
                    setNotifications(qs.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification)));
                });

                return () => { unDoc(); unRequests(); unGroups(); unInvites(); unNotes(); };
            } else {
                setUserProfile(null);
                setFriends([]);
                setFollowRequests([]);
                setNotifications([]);
            }
        });
        return unsubscribeAuth;
    }, []);

    useEffect(() => {
        if (userProfile?.friends?.length) {
            const unsubscribes = userProfile.friends.map(fid =>
                onSnapshot(doc(db, 'users', fid), (s) => {
                    if (s.exists()) {
                        setFriends(prev => {
                            const otherFriends = prev.filter(f => f.id !== fid);
                            return [...otherFriends, { id: s.id, ...s.data() } as UserProfile];
                        });
                    }
                })
            );
            return () => unsubscribes.forEach(un => un());
        } else {
            setFriends([]);
        }
    }, [userProfile?.friends]);

    useEffect(() => {
        if (user && !isReceivingFromFirestore.current) {
            const dataToSync = {
                logs: studyLogs,
                schedules: schedules,
                assignments: assignments,
                classSchedules: classSchedules,
                examEvents: examEvents
            };
            const serialized = JSON.stringify(dataToSync);

            // Prevent infinite loop by checking if data actually changed
            if (syncCacheRef.current !== serialized) {
                syncCacheRef.current = serialized;
                const userDocRef = doc(db, 'users', user.uid);
                updateDoc(userDocRef, { ...dataToSync, lastUpdated: Date.now() }).catch(() => {
                    console.error('Failed to sync data to Firestore');
                });
            }
        }
        localStorage.setItem('study-sync-logs', JSON.stringify(studyLogs));
        localStorage.setItem('study-sync-schedules', JSON.stringify(schedules));
        localStorage.setItem('study-sync-assignments', JSON.stringify(assignments));
        localStorage.setItem('study-sync-classSchedules', JSON.stringify(classSchedules));
        localStorage.setItem('study-sync-events', JSON.stringify(examEvents));
    }, [user, studyLogs, schedules, assignments, classSchedules, examEvents]);

    useEffect(() => {
        localStorage.setItem('study-sync-goals', JSON.stringify(goals));
        localStorage.setItem('study-sync-books', JSON.stringify(books));
        localStorage.setItem('study-sync-categories', JSON.stringify(categories));
    }, [goals, books, categories]);

    const signIn = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error: any) {
            alert('ログインに失敗しました: ' + error.message);
        }
    };

    const signOut = async () => {
        try {
            await firebaseSignOut(auth);
            setActiveTab('home');
        } catch (error: any) {
            alert('ログアウトに失敗しました: ' + error.message);
        }
    };

    const updateProfile = async (updates: Partial<UserProfile>) => {
        if (!user) return;
        try {
            await updateDoc(doc(db, 'users', user.uid), updates);
        } catch (error: any) {
            console.error('Profile Update Error:', error);
        }
    };

    const sendFollowRequest = async (targetUserId: string) => {
        if (!user || !userProfile || targetUserId === user.uid) return;
        try {
            await addDoc(collection(db, 'followRequests'), {
                senderId: user.uid,
                senderName: userProfile.customDisplayName || userProfile.displayName || user.displayName,
                senderPhoto: userProfile.customPhotoURL || userProfile.photoURL || user.photoURL,
                receiverId: targetUserId,
                status: 'pending',
                timestamp: Date.now()
            });
            alert('フォローリクエストを送信しました');
        } catch (error: any) {
            alert('エラーが発生しました: ' + error.message);
        }
    };

    const acceptFollowRequest = async (request: FollowRequest) => {
        if (!user || !userProfile) return;
        try {
            const currentFriends = userProfile.friends || [];
            if (!currentFriends.includes(request.senderId)) {
                await updateDoc(doc(db, 'users', user.uid), {
                    friends: [...currentFriends, request.senderId]
                });
            }
            const senderRef = doc(db, 'users', request.senderId);
            const senderSnap = await getDoc(senderRef);
            if (senderSnap.exists()) {
                const senderFriends = senderSnap.data().friends || [];
                if (!senderFriends.includes(user.uid)) {
                    await updateDoc(senderRef, { friends: [...senderFriends, user.uid] });
                }
            }
            await updateDoc(doc(db, 'followRequests', request.id), { status: 'accepted' });
        } catch (error: any) {
            alert('エラーが発生しました: ' + error.message);
        }
    };

    const declineFollowRequest = async (id: string) => {
        try {
            await updateDoc(doc(db, 'followRequests', id), { status: 'declined' });
        } catch (error: any) {
            alert('エラーが発生しました: ' + error.message);
        }
    };

    const updateStatus = async (status: 'online' | 'offline' | 'studying', subject?: string) => {
        if (!user) return;
        try {
            await updateDoc(doc(db, 'users', user.uid), {
                status,
                currentSubject: subject || '',
                lastStudyTime: Date.now(),
                timerStartTime: status === 'studying' ? Date.now() : null
            });
        } catch (error) {
            console.error('Status Update Error:', error);
        }
    };

    const createGroup = async (name: string) => {
        if (!user) return;
        try {
            const docRef = await addDoc(collection(db, 'groups'), {
                name,
                members: [user.uid],
                themeColor: '#4f46e5',
                iconEmoji: '📚'
            });
            return docRef.id;
        } catch (error: any) {
            alert('エラーが発生しました: ' + error.message);
        }
    };

    const inviteToGroup = async (groupId: string, groupName: string, receiverId: string) => {
        if (!user) return;
        try {
            await addDoc(collection(db, 'groupInvitations'), {
                groupId,
                groupName,
                senderId: user.uid,
                senderName: userProfile?.customDisplayName || userProfile?.displayName || user.displayName,
                receiverId,
                status: 'pending'
            });
        } catch (error: any) {
            alert('招待の送信に失敗しました: ' + error.message);
        }
    };

    const acceptGroupInvitation = async (invitation: GroupInvitation) => {
        if (!user) return;
        try {
            const groupRef = doc(db, 'groups', invitation.groupId);
            const groupSnap = await getDoc(groupRef);
            if (groupSnap.exists()) {
                const groupData = groupSnap.data();
                if (!(groupData.members || []).includes(user.uid)) {
                    await updateDoc(groupRef, {
                        members: [...(groupData.members || []), user.uid]
                    });
                }
            }
            await deleteDoc(doc(db, 'groupInvitations', invitation.id));
        } catch (error: any) {
            alert('参加に失敗しました: ' + error.message);
        }
    };

    const declineGroupInvitation = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'groupInvitations', id));
        } catch (error: any) {
            alert('エラーが発生しました: ' + error.message);
        }
    };

    const getGroupInfo = async (groupId: string) => {
        try {
            const groupRef = doc(db, 'groups', groupId);
            const groupSnap = await getDoc(groupRef);
            if (groupSnap.exists()) {
                return { name: groupSnap.data().name as string };
            }
        } catch (error) {
            console.error(error);
        }
        return null;
    };

    const joinGroupById = async (groupId: string, skipConfirm?: boolean): Promise<boolean> => {
        if (!user) return false;
        try {
            const groupRef = doc(db, 'groups', groupId);
            const groupSnap = await getDoc(groupRef);
            if (groupSnap.exists()) {
                const groupData = groupSnap.data();
                if (skipConfirm || confirm(`グループ「${groupData.name}」に参加しますか？`)) {
                    if (!(groupData.members || []).includes(user.uid)) {
                        await updateDoc(groupRef, {
                            members: [...(groupData.members || []), user.uid]
                        });
                    }
                    return true;
                }
            } else {
                alert('グループが見つかりませんでした。');
            }
        } catch (error: any) {
            alert('参加に失敗しました: ' + error.message);
        }
        return false;
    };

    const leaveGroup = async (groupId: string) => {
        if (!user) return;
        try {
            const groupRef = doc(db, 'groups', groupId);
            const groupSnap = await getDoc(groupRef);
            if (groupSnap.exists()) {
                const groupData = groupSnap.data();
                const newMembers = (groupData.members || []).filter((id: string) => id !== user.uid);
                await updateDoc(groupRef, { members: newMembers });
            }
        } catch (error: any) {
            alert('退出に失敗しました: ' + error.message);
        }
    };

    const startGlobalTimer = (subject: string) => {
        setTimerState({ active: true, seconds: 0, subject, startTime: Date.now() });
        updateStatus('studying', subject);
    };

    const stopGlobalTimer = () => {
        setTimerState(prev => ({ ...prev, active: false }));
        updateStatus('online');
    };

    const resetGlobalTimer = () => {
        setTimerState({ active: false, seconds: 0, subject: '', startTime: null });
        updateStatus('online');
    };

    const addStudyLog = (log: Omit<StudyLog, 'id' | 'createdAt' | 'userId' | 'userName' | 'userPhoto'>) => {
        const newLog: StudyLog = {
            ...log,
            id: `study-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            createdAt: Date.now(),
            userId: user?.uid || 'anonymous',
            userName: userProfile?.customDisplayName || userProfile?.displayName || user?.displayName || '自分',
            userPhoto: userProfile?.customPhotoURL || userProfile?.photoURL || user?.photoURL || '',
            likes: [],
            comments: []
        };
        setStudyLogs(prev => [newLog, ...prev]);
    };

    const updateStudyLog = (id: string, updates: Partial<StudyLog>) => {
        setStudyLogs(prev => prev.map(log => log.id === id ? { ...log, ...updates } : log));
    };

    const deleteStudyLog = (id: string) => {
        setStudyLogs(prev => prev.filter(log => log.id !== id));
    };

    const sendNotification = async (targetUserId: string, type: 'like' | 'comment', text: string, logId: string) => {
        if (targetUserId === user?.uid) return;
        await addDoc(collection(db, 'notifications'), {
            userId: targetUserId,
            senderId: user?.uid,
            senderName: userProfile?.customDisplayName || userProfile?.displayName || user?.displayName || '友達',
            type,
            text,
            logId,
            timestamp: Date.now(),
            isRead: false
        });
    };

    const addLikeToLog = async (logOwnerId: string, logId: string) => {
        if (!user) return;
        let isLiking = false;
        if (logOwnerId === user.uid) {
            setStudyLogs(prev => prev.map(l => {
                if (l.id === logId) {
                    const likes = l.likes || [];
                    isLiking = !likes.includes(user.uid);
                    return { ...l, likes: isLiking ? [...likes, user.uid] : likes.filter(id => id !== user.uid) };
                }
                return l;
            }));
        } else {
            const ownerRef = doc(db, 'users', logOwnerId);
            const snap = await getDoc(ownerRef);
            if (snap.exists()) {
                const data = snap.data();
                const updatedLogs = (data.logs || []).map((l: any) => {
                    if (l.id === logId) {
                        const likes = l.likes || [];
                        isLiking = !likes.includes(user.uid);
                        return { ...l, likes: isLiking ? [...likes, user.uid] : likes.filter((id: string) => id !== user.uid) };
                    }
                    return l;
                });
                await updateDoc(ownerRef, { logs: updatedLogs });
                if (isLiking) {
                    sendNotification(logOwnerId, 'like', 'あなたの勉強にいいね！しました。', logId);
                }
            }
        }
    };

    const addCommentToLog = async (logOwnerId: string, logId: string, text: string) => {
        if (!user || !text.trim()) return;
        const newComment: StudyLogComment = {
            id: `comm-${Date.now()}`,
            userId: user.uid,
            userName: userProfile?.customDisplayName || userProfile?.displayName || user?.displayName || '自分',
            text,
            timestamp: Date.now()
        };

        if (logOwnerId === user.uid) {
            setStudyLogs(prev => prev.map(l => {
                if (l.id === logId) {
                    return { ...l, comments: [...(l.comments || []), newComment] };
                }
                return l;
            }));
        } else {
            const ownerRef = doc(db, 'users', logOwnerId);
            const snap = await getDoc(ownerRef);
            if (snap.exists()) {
                const data = snap.data();
                const updatedLogs = (data.logs || []).map((l: any) => {
                    if (l.id === logId) {
                        return { ...l, comments: [...(l.comments || []), newComment] };
                    }
                    return l;
                });
                await updateDoc(ownerRef, { logs: updatedLogs });
                sendNotification(logOwnerId, 'comment', `「${text.substring(0, 20)}${text.length > 20 ? '...' : ''}」とコメントしました。`, logId);
            }
        }
    };

    const clearNotification = async (id: string) => {
        await updateDoc(doc(db, 'notifications', id), { isRead: true });
    };

    const addSchedule = (sched: Omit<Schedule, 'id'>) => {
        setSchedules(prev => [...prev, { ...sched, id: `sched-${Date.now()}` }]);
    };
    const updateSchedule = (id: string, updates: Partial<Schedule>) => {
        setSchedules(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    };
    const deleteSchedule = (id: string) => {
        setSchedules(prev => prev.filter(s => s.id !== id));
    };

    const addExamEvent = (event: Omit<ExamEvent, 'id'>) => {
        setExamEvents(prev => [...prev, { ...event, id: `exam-${Date.now()}` }]);
    };
    const updateExamSubjectScore = (eventId: string, subjectId: string, score: number) => {
        setExamEvents(prev => prev.map(e => e.id === eventId ? {
            ...e, subjects: e.subjects.map(s => s.id === subjectId ? { ...s, actualScore: score } : s)
        } : e));
    };
    const updateExamEvent = (id: string, updates: Partial<ExamEvent>) => {
        setExamEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    };
    const deleteExamEvent = (id: string) => {
        setExamEvents(prev => prev.filter(e => e.id !== id));
    };

    const addBook = (title: string) => {
        setBooks(prev => [...prev, { id: `book-${Date.now()}`, title }]);
    };
    const addCategory = (category: string) => {
        if (!categories.includes(category)) setCategories(prev => [...prev, category]);
    };

    const addClassSchedule = (classSched: Omit<ClassSchedule, 'id' | 'deletedDates'>) => {
        setClassSchedules(prev => [...prev, { ...classSched, id: `class-${Date.now()}`, deletedDates: [] }]);
    };
    const deleteClassScheduleInstance = (id: string, dateStr: string) => {
        setClassSchedules(prev => prev.map(c => c.id === id ? { ...c, deletedDates: [...c.deletedDates, dateStr] } : c));
    };
    const deleteClassScheduleEntirely = (id: string) => {
        setClassSchedules(prev => prev.filter(c => c.id !== id));
    };

    const addAssignment = (assignment: Omit<Assignment, 'id' | 'createdAt'>) => {
        setAssignments(prev => [...prev, { ...assignment, id: `assn-${Date.now()}`, createdAt: Date.now() }]);
    };
    const toggleAssignment = (id: string) => {
        setAssignments(prev => prev.map(a => a.id === id ? { ...a, isCompleted: !a.isCompleted } : a));
    };
    const deleteAssignment = (id: string) => {
        setAssignments(prev => prev.filter(a => a.id !== id));
    };

    const fetchUserLogs = async (userId: string): Promise<StudyLog[]> => {
        try {
            const snap = await getDoc(doc(db, 'users', userId));
            if (snap.exists()) {
                const data = snap.data();
                return (data.logs || []) as StudyLog[];
            }
        } catch (error) {
            console.error('Fetch Logs Error:', error);
        }
        return [];
    };

    const fetchUserProfiles = async (userIds: string[]): Promise<UserProfile[]> => {
        try {
            const profiles: UserProfile[] = [];
            for (const uid of userIds) {
                const snap = await getDoc(doc(db, 'users', uid));
                if (snap.exists()) {
                    profiles.push({ id: snap.id, ...snap.data() } as UserProfile);
                }
            }
            return profiles;
        } catch (error) {
            console.error('Fetch Profiles Error:', error);
        }
        return [];
    };

    const updateGroup = async (groupId: string, data: Partial<Group>) => {
        try {
            await updateDoc(doc(db, 'groups', groupId), data);
        } catch (error: any) {
            alert('グループの更新に失敗しました: ' + error.message);
        }
    };

    const setWeeklyTarget = async (minutes: number) => {
        if (!user) return;
        try {
            await updateDoc(doc(db, 'users', user.uid), {
                weeklyTargetMinutes: minutes,
                lastGoalReset: Date.now()
            });
        } catch (error: any) {
            alert('目標の設定に失敗しました: ' + error.message);
        }
    };

    // School methods
    const fetchSchoolData = async (code: string): Promise<School | null> => {
        const snap = await getDoc(doc(db, 'schools', code));
        if (snap.exists()) return { id: snap.id, ...snap.data() } as School;
        return null;
    };

    const applySchoolProgram = async (school: School, programId: string, clearOld?: boolean, electiveChoices?: { [key: string]: string | boolean }) => {
        if (!user) return;
        const program = school.programs.find(p => p.id === programId);
        if (!program) return;

        const newClassSchedules: ClassSchedule[] = program.schedules.map((s, idx) => {
            let finalTitle = s.title;

            if (electiveChoices && electiveChoices[finalTitle] !== undefined) {
                if (finalTitle.includes('/')) {
                    const choice = electiveChoices[finalTitle];
                    if (typeof choice === 'string') {
                        const mainSplit = finalTitle.split(' @ ');
                        const options = mainSplit[0].split('/').map(p => p.trim());
                        const choiceIndex = options.indexOf(choice);

                        if (choiceIndex !== -1) {
                            let newTitle = choice;
                            if (mainSplit.length > 1) {
                                let roomPart = mainSplit[1];
                                let teacherPart = '';
                                if (roomPart.includes(', ')) {
                                    const p = roomPart.split(', ');
                                    roomPart = p[0];
                                    teacherPart = p[1];
                                }

                                const roomOptions = roomPart.split('/').map(r => r.trim());
                                const newRoom = roomOptions[choiceIndex] || roomOptions[0] || '';

                                const teacherOptions = teacherPart.split('/').map(t => t.trim());
                                const newTeacher = teacherOptions[choiceIndex] || teacherOptions[0] || '';

                                newTitle += ` @ ${newRoom}`;
                                if (newTeacher) newTitle += `, ${newTeacher}`;
                            }
                            finalTitle = newTitle;
                        }
                    }
                } else if (finalTitle.includes('【')) {
                    if (electiveChoices[finalTitle] === false) {
                        return null; // Opted out of optional class
                    }
                }
            }

            return {
                id: `school-class-${idx}-${Date.now()}`,
                title: finalTitle,
                dayOfWeek: s.dayOfWeek || 0,
                startTime: s.startTime,
                endTime: s.endTime,
                deletedDates: []
            };
        }).filter(Boolean) as ClassSchedule[];

        setClassSchedules(prev => {
            const keepers = clearOld ? prev.filter(c => !c.id.startsWith('school-class-')) : prev;
            return [...keepers, ...newClassSchedules];
        });

        // Normally we don't wipe exams, but we could if we wanted. For now just clear old school-exams if clearOld is true.
        setExamEvents(prev => {
            const keepers = clearOld ? prev.filter(e => !e.id.startsWith('school-exam-')) : prev;
            return [...keepers, ...program.exams.map(e => ({ ...e, id: `school-exam-${Date.now()}` } as ExamEvent))];
        });

        await updateProfile({ schoolCode: school.id, programId, electiveChoices });
    };

    const saveSchoolData = async (school: School) => {
        try {
            const schoolRef = doc(db, 'schools', school.id);
            await setDoc(schoolRef, school);
            alert('学校データをサーバーに保存・公開しました！');
        } catch (error: any) {
            console.error('Save School Data Error:', error);
            throw new Error(error.message || '保存に失敗しました。詳細: ' + error.message);
        }
    };

    return (
        <AppContext.Provider value={{
            activeTab, setActiveTab, user, signIn, signOut,
            userProfile, updateProfile, friends, followRequests,
            groups, groupInvitations, createGroup, inviteToGroup, acceptGroupInvitation, declineGroupInvitation, joinGroupById, leaveGroup, getGroupInfo,
            sendFollowRequest, acceptFollowRequest, declineFollowRequest, updateStatus,
            studyLogs, schedules, goals, examEvents, books, categories, classSchedules, assignments, notifications,
            addStudyLog, updateStudyLog, deleteStudyLog, addLikeToLog, addCommentToLog, clearNotification,
            addSchedule, updateSchedule, deleteSchedule, addExamEvent, updateExamEvent, deleteExamEvent, updateExamSubjectScore,
            addBook, addCategory,
            addClassSchedule, deleteClassScheduleInstance, deleteClassScheduleEntirely,
            addAssignment, toggleAssignment, deleteAssignment,
            fetchUserLogs, fetchUserProfiles,
            timerState, startGlobalTimer, stopGlobalTimer, resetGlobalTimer,
            updateGroup, setWeeklyTarget,
            fetchSchoolData, applySchoolProgram, saveSchoolData
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useAppContext must be used within AppProvider');
    return context;
};
