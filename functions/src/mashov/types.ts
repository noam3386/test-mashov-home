export interface MashovSession {
  cookie: string;
  csrfToken: string;
  semel: number;
  studentId: string;
}

export interface MashovGrade {
  gradingEventId: number;
  teacherName: string;
  subject: string;
  grade: number;
  maxGrade: number;
  weight: number;
  eventDate: string;
  gradingPeriod: string;
  title: string;
}

export interface MashovMessage {
  id: number;
  subject: string;
  body: string;
  senderName: string;
  sendDate: string;
  isRead: boolean;
}

export interface MashovBehavior {
  id: number;
  teacherName: string;
  justification: string;
  eventDate: string;
  categoryName: string;
}

export interface StudentConfig {
  memberId: string;
  semel: number;
  username: string;
  passwordSecret: string;
  year: number;
}
