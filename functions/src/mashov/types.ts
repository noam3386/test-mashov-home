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
  reporterName: string;
  justification: string;
  justified: number;
  eventDate: string;
  timestamp: string;
  lessonDate: string;
  categoryName: string;
  eventType: string;
  eventCode: number;
  groupId: number;
  lessonId: number;
}

export interface MashovHomework {
  lessonId: number;
  subjectName: string;
  teacherName: string;
  homework: string;
  remark: string;
  lessonDate: string;
}

export interface MashovHatamot {
  code: string;
  name: string;
  remark: string;
}

export interface MashovTimetableEntry {
  timeTable: {
    day: number;
    lesson: number;
    roomNum: string;
    subjectName?: string;
  };
  groupDetails: {
    subjectName: string;
    groupName: string;
    groupTeachers: { teacherName: string }[];
  };
}

export interface StudentConfig {
  memberId: string;
  semel: number;
  username: string;
  password: string;
  year: number;
}
