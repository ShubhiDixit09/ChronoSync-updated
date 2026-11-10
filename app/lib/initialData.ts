import { Course, Faculty, Room, TimeSlot, ConstraintSetting, OptimizerConfig } from "./types";

export const DEFAULT_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export const DEFAULT_SLOTS: TimeSlot[] = [
  { id: "08:00", label: "08:00 – 09:00" },
  { id: "09:00", label: "09:00 – 10:00" },
  { id: "10:15", label: "10:15 – 11:15" },
  { id: "11:15", label: "11:15 – 12:15" },
  { id: "13:00", label: "13:00 – 14:00" },
  { id: "14:00", label: "14:00 – 15:00" },
];

export const DEFAULT_FACULTY: Faculty[] = [
  {
    id: "f1",
    name: "Dr. A. Sharma",
    initials: "AS",
    subject: "Data Structures",
    preferred_slots: ["08:00", "09:00", "10:15"],
    unavailable_slots: [],
    max_daily_sessions: 3,
    tone: "blue",
  },
  {
    id: "f2",
    name: "Dr. R. Verma",
    initials: "RV",
    subject: "Object Oriented Programming",
    preferred_slots: ["08:00", "09:00", "11:15"],
    unavailable_slots: [],
    max_daily_sessions: 3,
    tone: "amber",
  },
  {
    id: "f3",
    name: "Dr. P. Nair",
    initials: "PN",
    subject: "Algorithms",
    preferred_slots: ["09:00", "10:15", "13:00"],
    unavailable_slots: [],
    max_daily_sessions: 3,
    tone: "amber",
  },
  {
    id: "f4",
    name: "Dr. K. Singh",
    initials: "KS",
    subject: "Laboratory Systems",
    preferred_slots: ["10:15", "11:15", "13:00"],
    unavailable_slots: [],
    max_daily_sessions: 3,
    tone: "sage",
  },
  {
    id: "f5",
    name: "Dr. M. Patel",
    initials: "MP",
    subject: "Database Systems",
    preferred_slots: ["10:15", "13:00", "14:00"],
    unavailable_slots: ["Monday|08:00"],
    max_daily_sessions: 3,
    tone: "rose",
  },
  {
    id: "f6",
    name: "Dr. S. Iyer",
    initials: "SI",
    subject: "Probability & Humanities",
    preferred_slots: ["08:00", "11:15", "14:00"],
    unavailable_slots: [],
    max_daily_sessions: 3,
    tone: "violet",
  },
];

export const DEFAULT_ROOMS: Room[] = [
  { id: "C-203", name: "C-203", capacity: 72, room_type: "lecture", building: "Computing Block" },
  { id: "C-204", name: "C-204", capacity: 64, room_type: "lecture", building: "Computing Block" },
  { id: "M-101", name: "M-101", capacity: 80, room_type: "lecture", building: "Main Block" },
  { id: "CS-L1", name: "CS Lab 1", capacity: 42, room_type: "lab", building: "Computing Block" },
  { id: "CS-L2", name: "CS Lab 2", capacity: 42, room_type: "lab", building: "Computing Block" },
];

export const DEFAULT_COURSES: Course[] = [
  {
    id: "CS201",
    name: "Data Structures",
    faculty_id: "f1",
    group_id: "CSE-A",
    room_type: "lecture",
    capacity: 60,
    weekly_sessions: 3,
    duration_slots: 1,
    color: "blue",
  },
  {
    id: "CS202",
    name: "Object Oriented Programming",
    faculty_id: "f2",
    group_id: "CSE-A",
    room_type: "lecture",
    capacity: 60,
    weekly_sessions: 2,
    duration_slots: 1,
    color: "amber",
  },
  {
    id: "CS251",
    name: "Data Structures Lab",
    faculty_id: "f4",
    group_id: "CSE-A",
    room_type: "lab",
    capacity: 40,
    weekly_sessions: 1,
    duration_slots: 2,
    color: "sage",
  },
  {
    id: "CS301",
    name: "Algorithms",
    faculty_id: "f3",
    group_id: "CSE-B",
    room_type: "lecture",
    capacity: 58,
    weekly_sessions: 3,
    duration_slots: 1,
    color: "blue",
  },
  {
    id: "CS302",
    name: "Database Systems",
    faculty_id: "f5",
    group_id: "CSE-B",
    room_type: "lecture",
    capacity: 58,
    weekly_sessions: 2,
    duration_slots: 1,
    color: "amber",
  },
  {
    id: "CS352",
    name: "Database Systems Lab",
    faculty_id: "f5",
    group_id: "CSE-B",
    room_type: "lab",
    capacity: 40,
    weekly_sessions: 1,
    duration_slots: 2,
    color: "sage",
  },
  {
    id: "MA201",
    name: "Probability & Statistics",
    faculty_id: "f6",
    group_id: "CSE-A",
    room_type: "lecture",
    capacity: 60,
    weekly_sessions: 2,
    duration_slots: 1,
    color: "sand",
  },
  {
    id: "HS201",
    name: "Technical Communication",
    faculty_id: "f6",
    group_id: "CSE-B",
    room_type: "lecture",
    capacity: 58,
    weekly_sessions: 2,
    duration_slots: 1,
    color: "violet",
  },
];

export const DEFAULT_CONSTRAINTS: ConstraintSetting[] = [
  {
    id: "no-faculty-clash",
    name: "No faculty clashes",
    detail: "A faculty member can teach only one class at a time.",
    hard: true,
    enabled: true,
    weight: 100,
  },
  {
    id: "no-group-clash",
    name: "No section clashes",
    detail: "A student group cannot attend overlapping sessions.",
    hard: true,
    enabled: true,
    weight: 100,
  },
  {
    id: "room-capacity",
    name: "Room capacity & type",
    detail: "Capacity and laboratory requirements must be strictly satisfied.",
    hard: true,
    enabled: true,
    weight: 100,
  },
  {
    id: "faculty-preferences",
    name: "Faculty preferred hours",
    detail: "Reward classes placed inside preferred teaching windows.",
    hard: false,
    enabled: true,
    weight: 80,
  },
  {
    id: "student-gaps",
    name: "Minimise student gaps",
    detail: "Avoid isolated classes and long idle gaps during the day.",
    hard: false,
    enabled: true,
    weight: 65,
  },
  {
    id: "balance-week",
    name: "Balance the week",
    detail: "Spread the teaching load instead of creating heavy days.",
    hard: false,
    enabled: true,
    weight: 58,
  },
  {
    id: "room-stability",
    name: "Stable room assignments",
    detail: "Keep classes of the same student group in consistent lecture rooms.",
    hard: false,
    enabled: true,
    weight: 30,
  },
];

export const DEFAULT_CONFIG: OptimizerConfig = {
  population_size: 48,
  generations: 50,
  mutation_rate: 0.2,
  elite_size: 4,
  tournament_size: 4,
  tabu_iterations: 30,
  seed: 42,
};

// ---------------------------------------------------------------------------
// PRESET TEMPLATES
// ---------------------------------------------------------------------------

export interface TimetableTemplate {
  id: string;
  name: string;
  institution: string;
  term: string;
  description: string;
  courses: Course[];
  faculty: Faculty[];
  rooms: Room[];
}

export const PRESET_TEMPLATES: TimetableTemplate[] = [
  {
    id: "engineering",
    name: "Computer Science & Engineering",
    institution: "Northbridge Institute of Technology",
    term: "Odd Semester 2026",
    description: "2 sections (CSE-A & CSE-B), labs, algorithms, data structures & databases.",
    courses: DEFAULT_COURSES,
    faculty: DEFAULT_FACULTY,
    rooms: DEFAULT_ROOMS,
  },
  {
    id: "high_school",
    name: "High School (Classes 10-A & 10-B)",
    institution: "St. Xavier's Model Senior Secondary School",
    term: "Academic Session 2026-27",
    description: "Classes 10-A & 10-B: Mathematics, Physics, Chemistry, English, Biology, History & Science Labs.",
    faculty: [
      { id: "hs-1", name: "Mr. Rajesh Sharma", initials: "RS", subject: "Mathematics", preferred_slots: ["08:00", "09:00", "10:15"], unavailable_slots: [], max_daily_sessions: 4, tone: "blue" },
      { id: "hs-2", name: "Ms. Sunita Rao", initials: "SR", subject: "Physics", preferred_slots: ["09:00", "10:15", "11:15"], unavailable_slots: [], max_daily_sessions: 4, tone: "amber" },
      { id: "hs-3", name: "Dr. Anita Sen", initials: "AS", subject: "Chemistry", preferred_slots: ["10:15", "11:15", "13:00"], unavailable_slots: [], max_daily_sessions: 3, tone: "sage" },
      { id: "hs-4", name: "Mr. David Miller", initials: "DM", subject: "English Literature", preferred_slots: ["08:00", "11:15", "14:00"], unavailable_slots: [], max_daily_sessions: 4, tone: "violet" },
      { id: "hs-5", name: "Dr. Priya Kapoor", initials: "PK", subject: "Biology", preferred_slots: ["10:15", "13:00", "14:00"], unavailable_slots: [], max_daily_sessions: 3, tone: "rose" },
      { id: "hs-6", name: "Mr. Vikram Joshi", initials: "VJ", subject: "Social Science & History", preferred_slots: ["08:00", "09:00", "13:00"], unavailable_slots: [], max_daily_sessions: 4, tone: "sand" },
    ],
    rooms: [
      { id: "R-101", name: "Classroom 10-A", capacity: 45, room_type: "lecture", building: "Senior Wing" },
      { id: "R-102", name: "Classroom 10-B", capacity: 45, room_type: "lecture", building: "Senior Wing" },
      { id: "SCI-LAB", name: "Science Lab", capacity: 40, room_type: "lab", building: "Science Block" },
      { id: "COMP-LAB", name: "Computer Lab", capacity: 40, room_type: "lab", building: "Science Block" },
    ],
    courses: [
      { id: "MATH-10A", name: "Mathematics", faculty_id: "hs-1", group_id: "Class 10-A", room_type: "lecture", capacity: 40, weekly_sessions: 3, duration_slots: 1, color: "blue" },
      { id: "PHY-10A", name: "Physics", faculty_id: "hs-2", group_id: "Class 10-A", room_type: "lecture", capacity: 40, weekly_sessions: 2, duration_slots: 1, color: "amber" },
      { id: "CHEM-10A", name: "Chemistry Lab", faculty_id: "hs-3", group_id: "Class 10-A", room_type: "lab", capacity: 35, weekly_sessions: 1, duration_slots: 2, color: "sage" },
      { id: "ENG-10A", name: "English Literature", faculty_id: "hs-4", group_id: "Class 10-A", room_type: "lecture", capacity: 40, weekly_sessions: 3, duration_slots: 1, color: "violet" },
      { id: "BIO-10A", name: "Biology", faculty_id: "hs-5", group_id: "Class 10-A", room_type: "lecture", capacity: 40, weekly_sessions: 2, duration_slots: 1, color: "rose" },
      { id: "SST-10A", name: "Social Science", faculty_id: "hs-6", group_id: "Class 10-A", room_type: "lecture", capacity: 40, weekly_sessions: 2, duration_slots: 1, color: "sand" },

      { id: "MATH-10B", name: "Mathematics", faculty_id: "hs-1", group_id: "Class 10-B", room_type: "lecture", capacity: 40, weekly_sessions: 3, duration_slots: 1, color: "blue" },
      { id: "PHY-10B", name: "Physics", faculty_id: "hs-2", group_id: "Class 10-B", room_type: "lecture", capacity: 40, weekly_sessions: 2, duration_slots: 1, color: "amber" },
      { id: "CHEM-10B", name: "Chemistry Lab", faculty_id: "hs-3", group_id: "Class 10-B", room_type: "lab", capacity: 35, weekly_sessions: 1, duration_slots: 2, color: "sage" },
      { id: "ENG-10B", name: "English Literature", faculty_id: "hs-4", group_id: "Class 10-B", room_type: "lecture", capacity: 40, weekly_sessions: 3, duration_slots: 1, color: "violet" },
      { id: "BIO-10B", name: "Biology", faculty_id: "hs-5", group_id: "Class 10-B", room_type: "lecture", capacity: 40, weekly_sessions: 2, duration_slots: 1, color: "rose" },
      { id: "SST-10B", name: "Social Science", faculty_id: "hs-6", group_id: "Class 10-B", room_type: "lecture", capacity: 40, weekly_sessions: 2, duration_slots: 1, color: "sand" },
    ],
  },
  {
    id: "business_school",
    name: "School of Business & Management",
    institution: "Imperial Graduate School of Management",
    term: "Term 2 - MBA Batch 2026",
    description: "Sections MBA-1 & MBA-2: Accounting, Microeconomics, Business Law, Marketing & Statistics.",
    faculty: [
      { id: "mba-1", name: "Prof. Ramesh Gupta", initials: "RG", subject: "Financial Accounting", preferred_slots: ["08:00", "09:00"], unavailable_slots: [], max_daily_sessions: 3, tone: "blue" },
      { id: "mba-2", name: "Dr. Meera Nambiar", initials: "MN", subject: "Microeconomics", preferred_slots: ["09:00", "10:15", "11:15"], unavailable_slots: [], max_daily_sessions: 3, tone: "amber" },
      { id: "mba-3", name: "Prof. K. Subramanian", initials: "KS", subject: "Corporate Law", preferred_slots: ["11:15", "13:00"], unavailable_slots: [], max_daily_sessions: 3, tone: "sage" },
      { id: "mba-4", name: "Dr. Shalini Roy", initials: "SR", subject: "Marketing Management", preferred_slots: ["10:15", "13:00", "14:00"], unavailable_slots: [], max_daily_sessions: 3, tone: "rose" },
      { id: "mba-5", name: "Prof. Amit Saxena", initials: "AS", subject: "Business Analytics", preferred_slots: ["08:00", "14:00"], unavailable_slots: [], max_daily_sessions: 3, tone: "violet" },
    ],
    rooms: [
      { id: "HALL-A", name: "Executive Hall A", capacity: 60, room_type: "lecture", building: "MBA Tower" },
      { id: "HALL-B", name: "Executive Hall B", capacity: 60, room_type: "lecture", building: "MBA Tower" },
      { id: "ANALYTICS-LAB", name: "Analytics Lab", capacity: 50, room_type: "lab", building: "MBA Tower" },
    ],
    courses: [
      { id: "ACC-M1", name: "Financial Accounting", faculty_id: "mba-1", group_id: "MBA-1", room_type: "lecture", capacity: 50, weekly_sessions: 3, duration_slots: 1, color: "blue" },
      { id: "ECO-M1", name: "Microeconomics", faculty_id: "mba-2", group_id: "MBA-1", room_type: "lecture", capacity: 50, weekly_sessions: 2, duration_slots: 1, color: "amber" },
      { id: "LAW-M1", name: "Corporate Law", faculty_id: "mba-3", group_id: "MBA-1", room_type: "lecture", capacity: 50, weekly_sessions: 2, duration_slots: 1, color: "sage" },
      { id: "MKT-M1", name: "Marketing Management", faculty_id: "mba-4", group_id: "MBA-1", room_type: "lecture", capacity: 50, weekly_sessions: 2, duration_slots: 1, color: "rose" },
      { id: "ANL-M1", name: "Analytics & Statistics", faculty_id: "mba-5", group_id: "MBA-1", room_type: "lab", capacity: 45, weekly_sessions: 1, duration_slots: 2, color: "violet" },

      { id: "ACC-M2", name: "Financial Accounting", faculty_id: "mba-1", group_id: "MBA-2", room_type: "lecture", capacity: 50, weekly_sessions: 3, duration_slots: 1, color: "blue" },
      { id: "ECO-M2", name: "Microeconomics", faculty_id: "mba-2", group_id: "MBA-2", room_type: "lecture", capacity: 50, weekly_sessions: 2, duration_slots: 1, color: "amber" },
      { id: "LAW-M2", name: "Corporate Law", faculty_id: "mba-3", group_id: "MBA-2", room_type: "lecture", capacity: 50, weekly_sessions: 2, duration_slots: 1, color: "sage" },
      { id: "MKT-M2", name: "Marketing Management", faculty_id: "mba-4", group_id: "MBA-2", room_type: "lecture", capacity: 50, weekly_sessions: 2, duration_slots: 1, color: "rose" },
      { id: "ANL-M2", name: "Analytics & Statistics", faculty_id: "mba-5", group_id: "MBA-2", room_type: "lab", capacity: 45, weekly_sessions: 1, duration_slots: 2, color: "violet" },
    ],
  },
  {
    id: "blank",
    name: "Blank Canvas (100% Custom)",
    institution: "My Custom Institution",
    term: "Term 1",
    description: "Start completely clean. Add your own teachers, subjects, classes and rooms.",
    faculty: [
      { id: "t1", name: "Teacher 1", initials: "T1", subject: "Subject 1", preferred_slots: [], unavailable_slots: [], max_daily_sessions: 4, tone: "blue" },
    ],
    rooms: [
      { id: "Room-1", name: "Classroom 1", capacity: 50, room_type: "lecture", building: "Main Building" },
    ],
    courses: [
      { id: "SUB-1", name: "Subject 1", faculty_id: "t1", group_id: "Section A", room_type: "lecture", capacity: 40, weekly_sessions: 2, duration_slots: 1, color: "blue" },
    ],
  },
];
