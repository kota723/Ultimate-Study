export type ScheduleType = '授業' | '自習' | '予定';

export interface StudyLog {
    id: string;
    userId: string;
    userName: string;
    userPhoto?: string;
    subject: string;
    durationMinutes: number;
    date: string; // YYYY-MM-DD
    category: string;
    memo?: string;
    createdAt: number;
    likes?: string[]; // user ids
    comments?: StudyLogComment[];
}

export interface StudyLogComment {
    id: string;
    userId: string;
    userName: string;
    text: string;
    timestamp: number;
}

export interface Schedule {
    id: string;
    title: string;
    startTime: string; // HH:mm
    endTime: string; // HH:mm
    type: ScheduleType;
    date: string; // YYYY-MM-DD
    completed?: boolean;
}

export interface Goal {
    id: string;
    title: string;
    targetMinutes: number;
}

export interface ExamSubject {
    id: string;
    name: string;
    maxScore: number;
    targetScore: number;
    actualScore?: number;
}

export interface ExamEvent {
    id: string;
    title: string;
    date: string; // YYYY-MM-DD
    type: '定期テスト' | '模試';
    subjects: ExamSubject[];
}

export interface Book {
    id: string;
    title: string;
}

export interface ClassSchedule {
    id: string;
    title: string;
    dayOfWeek: number; // 0 (Sun) to 6 (Sat)
    startTime: string; // HH:mm
    endTime: string; // HH:mm
    deletedDates: string[]; // YYYY-MM-DD of skipped days
    room?: string;
    teacher?: string;
    memo?: string;
}

export interface Assignment {
    id: string;
    title: string;
    dueDate: string; // YYYY-MM-DD
    dueDetail?: string; // e.g. ' 13:00 (4限までに)'
    subject: string;
    isCompleted: boolean;
    createdAt: number;
}

export interface UserProfile {
    id: string;
    displayName: string;
    customDisplayName?: string;
    photoURL?: string;
    customPhotoURL?: string;
    status: 'online' | 'offline' | 'studying';
    currentSubject?: string;
    lastStudyTime: number;
    timerStartTime?: number; // timestamp when they started studying
    friends: string[]; // list of user ids
    weeklyTargetMinutes?: number;
    lastGoalReset?: number; // timestamp of last Monday 4 AM reset
    schoolCode?: string;
    programId?: string;
    lastSchoolCodeReminder?: number;
    lastGoalPrompt?: number;
    electiveChoices?: { [key: string]: string | boolean };
}

export interface School {
    id: string; // school code
    name: string;
    adminEmail: string;
    programs: SchoolProgram[];
}

export interface SchoolProgram {
    id: string;
    name: string;
    schedules: (Omit<Schedule, 'id' | 'date' | 'completed'> & { dayOfWeek: number })[]; // patterns
    exams: Omit<ExamEvent, 'id'>[];
}

export interface AppNotification {
    id: string;
    userId: string;
    type: 'like' | 'comment';
    senderName: string;
    senderId: string;
    logId: string;
    text: string;
    timestamp: number;
    isRead: boolean;
}

export interface FollowRequest {
    id: string;
    senderId: string;
    senderName: string;
    senderPhoto?: string;
    receiverId: string;
    status: 'pending' | 'accepted' | 'declined';
    timestamp: number;
}

export interface ChatMessage {
    id: string;
    senderId: string;
    text: string;
    timestamp: number;
}

export interface Group {
    id: string;
    name: string;
    members: string[]; // user ids
    themeColor?: string;
    iconEmoji?: string;
}

export interface GroupInvitation {
    id: string;
    groupId: string;
    groupName: string;
    senderId: string;
    senderName: string;
    receiverId: string;
    status: 'pending';
}

