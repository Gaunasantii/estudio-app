export interface Subject {
  id: string;
  name: string;
  color: string;
  isCurrentlyTaking: boolean;
  totalSeconds?: number;
  totalHours?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClassSchedule {
  id: string;
  dayOfWeek: number; // 1 (Lunes) a 7 (Domingo)
  startTime: string;
  endTime: string;
  classroom?: string;
  subject: Subject | string;
}

export interface Exam {
  id: string;
  title: string;
  examDate: string;
  targetHours?: number;
  isCompleted: boolean;
  score?: number;
  subject: Subject | string;
}

export type StudyMethod = 'POMODORO' | 'CHRONOMETER';

export type ActivityType = 'THEORY' | 'PRACTICE' | 'ASSIGNMENT' | 'EXAM_PREP';

export interface StudySession {
  id: string;
  method: StudyMethod;
  activityType: ActivityType;
  startTime: string;
  endTime?: string;
  durationSeconds: number;
  notes?: string;
  subject: Subject | { id: string; name?: string } | string;
}

export interface HeatmapEntry {
  date: string;
  totalSeconds: number;
  totalMinutes: number;
  totalHours: number;
  sessionsCount: number;
}

export interface StudyStatsResponse {
  heatmap: HeatmapEntry[];
  byDate: Record<string, HeatmapEntry>;
  totalSeconds: number;
  totalHours: number;
  totalSessions: number;
  currentStreak?: number;
  restDaysAvailable?: number;
  daysSinceLastStudy?: number;
}

export interface DashboardOutletContext {
  subjects: Subject[];
  subjectSecondsMap: Record<string, number>;
  loadingSubjects: boolean;
  refreshAcademicData: () => Promise<void>;
  openSubjectsDrawer: () => void;
}
