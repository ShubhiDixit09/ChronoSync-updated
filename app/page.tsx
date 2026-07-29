"use client";

import {
  ArrowUpRight,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  DoorOpen,
  Download,
  FlaskConical,
  HelpCircle,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  RefreshCcw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  UserRound,
  Users,
  WandSparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type View = "schedule" | "courses" | "faculty" | "rooms" | "constraints";

type ScheduledSession = {
  session_id: string;
  course_id: string;
  course_name: string;
  faculty_id: string;
  faculty_name: string;
  group_id: string;
  day: string;
  slot_id: string;
  slot_label: string;
  room_id: string;
  room_name: string;
  duration_slots: number;
  color: string;
};

type ScheduleResponse = {
  status: string;
  sessions: ScheduledSession[];
  metrics: {
    hard_conflicts: number;
    soft_penalty: number;
    preference_fit: number;
    room_utilisation: number;
    scheduled_sessions: number;
    unassigned_sessions: number;
  };
  run: {
    algorithm: string;
    generations: number;
    tabu_iterations: number;
    convergence: number[];
  };
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const SLOTS = [
  { id: "08:00", label: "08:00 – 09:00" },
  { id: "09:00", label: "09:00 – 10:00" },
  { id: "10:15", label: "10:15 – 11:15" },
  { id: "11:15", label: "11:15 – 12:15" },
  { id: "13:00", label: "13:00 – 14:00" },
  { id: "14:00", label: "14:00 – 15:00" },
];

const DEMO_ROWS = [
  ["CS201-1", "CS201", "Data Structures", "f1", "Dr. A. Sharma", "CSE-A", "Monday", "08:00", "08:00 – 09:00", "C-203", "C-203", 1, "blue"],
  ["CS301-1", "CS301", "Algorithms", "f3", "Dr. P. Nair", "CSE-B", "Monday", "09:00", "09:00 – 10:00", "C-204", "C-204", 1, "amber"],
  ["MA201-1", "MA201", "Probability & Statistics", "f6", "Dr. S. Iyer", "CSE-A", "Monday", "11:15", "11:15 – 12:15", "M-101", "M-101", 1, "sand"],
  ["CS352-1", "CS352", "Database Systems Lab", "f5", "Dr. M. Patel", "CSE-B", "Monday", "13:00", "13:00 – 15:00", "CS-L2", "CS Lab 2", 2, "sage"],
  ["CS202-1", "CS202", "Object Oriented Programming", "f2", "Dr. R. Verma", "CSE-A", "Tuesday", "08:00", "08:00 – 09:00", "C-203", "C-203", 1, "amber"],
  ["CS302-1", "CS302", "Database Systems", "f5", "Dr. M. Patel", "CSE-B", "Tuesday", "10:15", "10:15 – 11:15", "C-204", "C-204", 1, "blue"],
  ["CS201-2", "CS201", "Data Structures", "f1", "Dr. A. Sharma", "CSE-A", "Tuesday", "13:00", "13:00 – 14:00", "C-203", "C-203", 1, "blue"],
  ["HS201-1", "HS201", "Technical Communication", "f6", "Dr. S. Iyer", "CSE-B", "Tuesday", "14:00", "14:00 – 15:00", "M-101", "M-101", 1, "violet"],
  ["CS301-2", "CS301", "Algorithms", "f3", "Dr. P. Nair", "CSE-B", "Wednesday", "09:00", "09:00 – 10:00", "C-204", "C-204", 1, "blue"],
  ["CS251-1", "CS251", "Data Structures Lab", "f4", "Dr. K. Singh", "CSE-A", "Wednesday", "10:15", "10:15 – 12:15", "CS-L1", "CS Lab 1", 2, "sage"],
  ["CS302-2", "CS302", "Database Systems", "f5", "Dr. M. Patel", "CSE-B", "Wednesday", "13:00", "13:00 – 14:00", "C-203", "C-203", 1, "amber"],
  ["CS201-3", "CS201", "Data Structures", "f1", "Dr. A. Sharma", "CSE-A", "Thursday", "08:00", "08:00 – 09:00", "C-203", "C-203", 1, "blue"],
  ["CS301-3", "CS301", "Algorithms", "f3", "Dr. P. Nair", "CSE-B", "Thursday", "10:15", "10:15 – 11:15", "C-204", "C-204", 1, "blue"],
  ["CS202-2", "CS202", "Object Oriented Programming", "f2", "Dr. R. Verma", "CSE-A", "Thursday", "13:00", "13:00 – 14:00", "C-203", "C-203", 1, "amber"],
  ["MA201-2", "MA201", "Probability & Statistics", "f6", "Dr. S. Iyer", "CSE-A", "Friday", "09:00", "09:00 – 10:00", "M-101", "M-101", 1, "sand"],
  ["HS201-2", "HS201", "Technical Communication", "f6", "Dr. S. Iyer", "CSE-B", "Friday", "11:15", "11:15 – 12:15", "C-204", "C-204", 1, "violet"],
] as const;

const DEMO_SESSIONS: ScheduledSession[] = DEMO_ROWS.map(
  ([
    session_id,
    course_id,
    course_name,
    faculty_id,
    faculty_name,
    group_id,
    day,
    slot_id,
    slot_label,
    room_id,
    room_name,
    duration_slots,
    color,
  ]) => ({
    session_id,
    course_id,
    course_name,
    faculty_id,
    faculty_name,
    group_id,
    day,
    slot_id,
    slot_label,
    room_id,
    room_name,
    duration_slots,
    color,
  }),
);

const INITIAL_RESULT: ScheduleResponse = {
  status: "feasible",
  sessions: DEMO_SESSIONS,
  metrics: {
    hard_conflicts: 0,
    soft_penalty: 12.4,
    preference_fit: 88,
    room_utilisation: 74,
    scheduled_sessions: 16,
    unassigned_sessions: 0,
  },
  run: {
    algorithm: "Constraint-aware GA + Repair + Tabu Search",
    generations: 47,
    tabu_iterations: 35,
    convergence: [0.21, 0.31, 0.42, 0.49, 0.58, 0.63, 0.72, 0.79, 0.86, 0.93],
  },
};

const FACULTY = [
  { id: "f1", initials: "AS", name: "Dr. A. Sharma", subject: "Data Structures", preference: "Morning · Mon, Wed, Fri", load: 9, max: 12, tone: "blue" },
  { id: "f3", initials: "PN", name: "Dr. P. Nair", subject: "Algorithms", preference: "09:00 – 13:00", load: 8, max: 12, tone: "amber" },
  { id: "f5", initials: "MP", name: "Dr. M. Patel", subject: "Database Systems", preference: "Tue, Thu · after 10:00", load: 10, max: 12, tone: "rose" },
  { id: "f4", initials: "KS", name: "Dr. K. Singh", subject: "Laboratory", preference: "Midday slots", load: 6, max: 12, tone: "sage" },
];

const COURSES = [
  { code: "CS201", name: "Data Structures", group: "CSE-A", sessions: "3 lectures", faculty: "Dr. A. Sharma", type: "Core" },
  { code: "CS202", name: "Object Oriented Programming", group: "CSE-A", sessions: "2 lectures", faculty: "Dr. R. Verma", type: "Core" },
  { code: "CS251", name: "Data Structures Lab", group: "CSE-A", sessions: "1 × 2-hour lab", faculty: "Dr. K. Singh", type: "Lab" },
  { code: "CS301", name: "Algorithms", group: "CSE-B", sessions: "3 lectures", faculty: "Dr. P. Nair", type: "Core" },
  { code: "CS302", name: "Database Systems", group: "CSE-B", sessions: "2 lectures", faculty: "Dr. M. Patel", type: "Core" },
  { code: "CS352", name: "Database Systems Lab", group: "CSE-B", sessions: "1 × 2-hour lab", faculty: "Dr. M. Patel", type: "Lab" },
];

const ROOMS = [
  { name: "C-203", building: "Computing Block", capacity: 72, type: "Lecture", utilisation: 82 },
  { name: "C-204", building: "Computing Block", capacity: 64, type: "Lecture", utilisation: 76 },
  { name: "M-101", building: "Main Block", capacity: 80, type: "Lecture", utilisation: 61 },
  { name: "CS Lab 1", building: "Computing Block", capacity: 42, type: "Laboratory", utilisation: 68 },
  { name: "CS Lab 2", building: "Computing Block", capacity: 42, type: "Laboratory", utilisation: 56 },
];

const CONSTRAINTS = [
  { name: "No faculty clashes", detail: "A faculty member can teach only one class at a time.", hard: true, weight: 100 },
  { name: "No section clashes", detail: "A student group cannot attend overlapping sessions.", hard: true, weight: 100 },
  { name: "Room capacity & type", detail: "Capacity and laboratory requirements must be satisfied.", hard: true, weight: 100 },
  { name: "Faculty preferred hours", detail: "Reward classes placed inside preferred teaching windows.", hard: false, weight: 80 },
  { name: "Minimise student gaps", detail: "Avoid isolated classes and long idle gaps during the day.", hard: false, weight: 65 },
  { name: "Balance the week", detail: "Spread the teaching load instead of creating heavy days.", hard: false, weight: 58 },
];

const NAV_ITEMS = [
  { id: "schedule" as const, label: "Schedule", icon: CalendarDays },
  { id: "courses" as const, label: "Courses", icon: BookOpen },
  { id: "faculty" as const, label: "Faculty", icon: Users },
  { id: "rooms" as const, label: "Rooms", icon: DoorOpen },
  { id: "constraints" as const, label: "Constraints", icon: SlidersHorizontal },
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function Home() {
  const [view, setView] = useState<View>("schedule");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [result, setResult] = useState<ScheduleResponse>(INITIAL_RESULT);
  const [group, setGroup] = useState("All sections");
  const [query, setQuery] = useState("");
  const [isGenerating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [connection, setConnection] = useState<"checking" | "live" | "demo">("checking");
  const [notice, setNotice] = useState("");
  const [enabledConstraints, setEnabledConstraints] = useState<Record<string, boolean>>(
    Object.fromEntries(CONSTRAINTS.map((item) => [item.name, true])),
  );

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE}/health`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("offline");
        setConnection("live");
      })
      .catch(() => setConnection("demo"));
    return () => controller.abort();
  }, []);

  const filteredSessions = useMemo(
    () =>
      result.sessions.filter(
        (item) =>
          (group === "All sections" || item.group_id === group) &&
          `${item.course_name} ${item.course_id} ${item.faculty_name} ${item.room_name}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [group, query, result.sessions],
  );

  async function generateTimetable() {
    if (isGenerating) return;
    setGenerating(true);
    setProgress(8);
    setNotice("");
    const timer = window.setInterval(
      () => setProgress((value) => Math.min(92, value + Math.ceil(Math.random() * 9))),
      180,
    );
    try {
      const sampleResponse = await fetch(`${API_BASE}/sample`);
      if (!sampleResponse.ok) throw new Error("Sample dataset unavailable");
      const sample = await sampleResponse.json();
      const response = await fetch(`${API_BASE}/schedules/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sample),
      });
      if (!response.ok) throw new Error("Optimiser unavailable");
      setResult(await response.json());
      setConnection("live");
      setNotice("New feasible timetable generated and scored.");
    } catch {
      await new Promise((resolve) => window.setTimeout(resolve, 900));
      setResult({
        ...INITIAL_RESULT,
        metrics: { ...INITIAL_RESULT.metrics, preference_fit: 91, soft_penalty: 9.8 },
      });
      setConnection("demo");
      setNotice("Demo run completed. Start the API container for live optimisation.");
    } finally {
      window.clearInterval(timer);
      setProgress(100);
      window.setTimeout(() => setGenerating(false), 420);
    }
  }

  const pageTitle = {
    schedule: "Weekly timetable",
    courses: "Course requirements",
    faculty: "Faculty availability",
    rooms: "Rooms & resources",
    constraints: "Optimisation rules",
  }[view];

  return (
    <main className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "is-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Clock3 size={22} strokeWidth={2.2} /></div>
          <div>
            <div className="brand-name">ChronoSync</div>
            <div className="brand-subtitle">Academic operations</div>
          </div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X size={20} /></button>
        </div>
        <p className="nav-eyebrow">Workspace</p>
        <nav className="nav-list" aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`nav-item ${view === item.id ? "active" : ""}`}
                onClick={() => {
                  setView(item.id);
                  setSidebarOpen(false);
                }}
              >
                <Icon size={19} />
                <span>{item.label}</span>
                {item.id === "schedule" && <span className="nav-count">v3</span>}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-story">
          <Sparkles size={17} />
          <strong>Optimisation engine</strong>
          <p>GA explores globally. Repair keeps schedules feasible. Tabu Search refines locally.</p>
          <button onClick={() => setView("constraints")}>See how it works <ArrowUpRight size={14} /></button>
        </div>
        <div className="sidebar-footer">
          <button><Settings size={18} /> Settings</button>
          <button><HelpCircle size={18} /> Help & docs</button>
          <div className="profile">
            <span>AO</span>
            <div><strong>Academic Ops</strong><small>Timetable team</small></div>
            <ChevronDown size={15} />
          </div>
        </div>
      </aside>

      {sidebarOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}

      <section className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button className="menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={22} /></button>
            <button className="selector"><Building2 size={17} /><span>Northbridge Institute of Technology</span><ChevronDown size={15} /></button>
            <button className="selector term"><CalendarDays size={17} /><span>Odd 2026</span><ChevronDown size={15} /></button>
          </div>
          <div className="topbar-actions">
            <span className={`connection ${connection}`}><span />{connection === "live" ? "API connected" : connection === "demo" ? "Demo mode" : "Checking"}</span>
            <button className="icon-button" aria-label="Notifications"><Bell size={19} /><i /></button>
            <button className="avatar">SD</button>
          </div>
        </header>

        <div className="page">
          <div className="page-heading">
            <div>
              <div className="breadcrumb"><LayoutDashboard size={14} /> Academic planning <span>/</span> {pageTitle}</div>
              <h1>{pageTitle}</h1>
              <p>{view === "schedule" ? "Draft v3 · generated from current constraints and preferences" : "Configure the inputs used by the scheduling engine."}</p>
            </div>
            <div className="heading-actions">
              {view === "schedule" && <button className="secondary-button"><Download size={17} /> Export</button>}
              <button className="primary-button" onClick={generateTimetable}>
                {isGenerating ? <RefreshCcw className="spin" size={18} /> : <WandSparkles size={18} />}
                {isGenerating ? "Optimising…" : "Generate timetable"}
              </button>
            </div>
          </div>

          {notice && <div className="notice"><CheckCircle2 size={17} />{notice}<button onClick={() => setNotice("")} aria-label="Dismiss"><X size={15} /></button></div>}

          {view === "schedule" && (
            <>
              <section className="metric-grid" aria-label="Schedule metrics">
                <Metric icon={<ShieldCheck />} label="Hard conflicts" value={String(result.metrics.hard_conflicts)} detail="Feasible schedule" tone="blue" />
                <Metric icon={<Target />} label="Preference fit" value={`${Math.round(result.metrics.preference_fit)}%`} detail="Faculty choices honoured" tone="amber" />
                <Metric icon={<Building2 />} label="Room utilisation" value={`${Math.round(result.metrics.room_utilisation)}%`} detail="Across active teaching rooms" tone="sage" />
                <Metric icon={<BarChart3 />} label="Soft penalty" value={result.metrics.soft_penalty.toFixed(1)} detail="Lower is better" tone="violet" />
              </section>

              <section className="schedule-toolbar">
                <div className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search course, faculty or room" /></div>
                <label className="field-select">Section<select value={group} onChange={(event) => setGroup(event.target.value)}><option>All sections</option><option>CSE-A</option><option>CSE-B</option></select></label>
                <button className="filter-button"><SlidersHorizontal size={17} /> More filters</button>
                <div className="toolbar-status"><CheckCircle2 size={16} /> All hard constraints satisfied</div>
              </section>

              <div className="schedule-layout">
                <section className="timetable-card">
                  <div className="timetable-scroll">
                    <div className="timetable-grid">
                      <div className="grid-head time-head">Time</div>
                      {DAYS.map((day) => <div key={day} className="grid-head">{day}<small>{filteredSessions.filter((item) => item.day === day).length} sessions</small></div>)}
                      {SLOTS.flatMap((slot) => [
                        <div key={`time-${slot.id}`} className="time-cell"><strong>{slot.id}</strong><small>{slot.label.split("–")[1]}</small></div>,
                        ...DAYS.map((day) => {
                          const items = filteredSessions.filter((item) => item.day === day && item.slot_id === slot.id);
                          return (
                            <div key={`${day}-${slot.id}`} className="schedule-cell">
                              {items.map((item) => <SessionCard key={item.session_id} session={item} />)}
                            </div>
                          );
                        }),
                      ])}
                    </div>
                  </div>
                  <div className="legend">
                    <span><i className="blue" /> Core CS</span>
                    <span><i className="amber" /> Foundations</span>
                    <span><i className="sage" /> Laboratory</span>
                    <span><i className="violet" /> Humanities</span>
                    <span className="legend-note"><LockKeyhole size={14} /> Locked sessions stay fixed during re-optimisation</span>
                  </div>
                </section>

                <aside className="insight-panel">
                  <div className="panel-heading">
                    <div><span className="eyebrow">Human inputs</span><h2>Faculty preferences</h2></div>
                    <button aria-label="Preference settings"><SlidersHorizontal size={17} /></button>
                  </div>
                  <div className="faculty-stack">
                    {FACULTY.map((faculty) => (
                      <article className="faculty-card" key={faculty.id}>
                        <div className={`faculty-avatar ${faculty.tone}`}>{faculty.initials}</div>
                        <div className="faculty-copy">
                          <div><strong>{faculty.name}</strong><small>{faculty.subject}</small></div>
                          <p><Clock3 size={13} />{faculty.preference}</p>
                          <div className="load-line"><span>Workload</span><div><i style={{ width: `${(faculty.load / faculty.max) * 100}%` }} /></div><b>{faculty.load}/{faculty.max}h</b></div>
                        </div>
                      </article>
                    ))}
                  </div>
                  <button className="text-button" onClick={() => setView("faculty")}>Review all preferences <ArrowUpRight size={15} /></button>
                  <div className="algorithm-note">
                    <div className="algorithm-icon"><Sparkles size={18} /></div>
                    <div><strong>Why this timetable?</strong><p>The engine first removed clashes, then improved preference fit and student-day balance.</p></div>
                  </div>
                </aside>
              </div>
            </>
          )}

          {view === "courses" && <CourseView />}
          {view === "faculty" && <FacultyView />}
          {view === "rooms" && <RoomView />}
          {view === "constraints" && <ConstraintView enabled={enabledConstraints} setEnabled={setEnabledConstraints} />}
        </div>
      </section>

      {isGenerating && (
        <div className="run-drawer" role="status" aria-live="polite">
          <div className="run-top"><div><span className="live-dot" />Optimisation run</div><strong>{progress}%</strong></div>
          <div className="progress-track"><i style={{ width: `${progress}%` }} /></div>
          <div className="run-stages">
            <span className={progress >= 18 ? "done" : "active"}><Check size={13} />Validate</span>
            <span className={progress >= 45 ? "done" : progress >= 18 ? "active" : ""}><Check size={13} />Seed</span>
            <span className={progress >= 78 ? "done" : progress >= 45 ? "active" : ""}><Check size={13} />Evolve</span>
            <span className={progress >= 96 ? "done" : progress >= 78 ? "active" : ""}><Check size={13} />Refine</span>
          </div>
        </div>
      )}
    </main>
  );
}

function Metric({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: string; detail: string; tone: string }) {
  return <article className="metric-card"><div className={`metric-icon ${tone}`}>{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></article>;
}

function SessionCard({ session }: { session: ScheduledSession }) {
  return (
    <article className={`session-card ${session.color}`}>
      <div className="session-title"><strong>{session.course_id}</strong>{session.duration_slots > 1 && <FlaskConical size={14} />}</div>
      <p>{session.course_name}</p>
      <small><UserRound size={12} />{session.faculty_name}</small>
      <div className="session-meta"><span>{session.room_name}</span><b>{session.group_id}</b></div>
    </article>
  );
}

function CourseView() {
  return (
    <section className="management-card">
      <div className="management-toolbar"><div className="search-field"><Search size={17} /><input placeholder="Search courses" /></div><button className="secondary-button">Import CSV</button><button className="primary-button">Add course</button></div>
      <div className="data-table">
        <div className="table-row table-header"><span>Course</span><span>Student group</span><span>Requirement</span><span>Faculty</span><span>Type</span></div>
        {COURSES.map((course) => <div className="table-row" key={course.code}><span><b>{course.code}</b><small>{course.name}</small></span><span>{course.group}</span><span>{course.sessions}</span><span>{course.faculty}</span><span><i className={`tag ${course.type === "Lab" ? "sage" : "blue"}`}>{course.type}</i></span></div>)}
      </div>
    </section>
  );
}

function FacultyView() {
  return (
    <div className="profile-grid">
      {FACULTY.map((faculty) => <article className="profile-card" key={faculty.id}><div className="profile-card-top"><div className={`faculty-avatar large ${faculty.tone}`}>{faculty.initials}</div><div><h3>{faculty.name}</h3><p>{faculty.subject}</p></div><button>•••</button></div><div className="preference-box"><Clock3 size={16} /><div><span>Preferred teaching window</span><strong>{faculty.preference}</strong></div></div><div className="profile-load"><span>Assigned load <b>{faculty.load} / {faculty.max} hours</b></span><div><i style={{ width: `${(faculty.load / faculty.max) * 100}%` }} /></div></div></article>)}
    </div>
  );
}

function RoomView() {
  return (
    <div className="room-grid">
      {ROOMS.map((room) => <article className="room-card" key={room.name}><div className="room-card-head"><div><Building2 size={20} /><h3>{room.name}</h3></div><span>{room.utilisation}% used</span></div><p>{room.building}</p><div className="room-stats"><span><b>{room.capacity}</b> seats</span><span><b>{room.type}</b> type</span></div><div className="profile-load"><div><i style={{ width: `${room.utilisation}%` }} /></div></div></article>)}
    </div>
  );
}

function ConstraintView({ enabled, setEnabled }: { enabled: Record<string, boolean>; setEnabled: React.Dispatch<React.SetStateAction<Record<string, boolean>>> }) {
  return (
    <div className="constraint-layout">
      <section className="constraint-list">
        {CONSTRAINTS.map((item) => <article className="constraint-card" key={item.name}><div className={`constraint-symbol ${item.hard ? "hard" : "soft"}`}>{item.hard ? <ShieldCheck size={19} /> : <Target size={19} />}</div><div className="constraint-copy"><div><h3>{item.name}</h3><span className={item.hard ? "hard-tag" : "soft-tag"}>{item.hard ? "Hard constraint" : `Weight ${item.weight}`}</span></div><p>{item.detail}</p></div><button className={`toggle ${enabled[item.name] ? "on" : ""} ${item.hard ? "locked" : ""}`} onClick={() => !item.hard && setEnabled((current) => ({ ...current, [item.name]: !current[item.name] }))} aria-label={`Toggle ${item.name}`}><i /></button></article>)}
      </section>
      <aside className="method-card"><span className="eyebrow">Hybrid method</span><h2>How a schedule improves</h2><ol><li><b>01</b><div><strong>Constrained seeding</strong><p>Rare rooms, labs and inflexible faculty are placed first.</p></div></li><li><b>02</b><div><strong>Genetic exploration</strong><p>Selection, crossover and adaptive mutation search globally.</p></div></li><li><b>03</b><div><strong>Repair</strong><p>Invalid offspring are repaired instead of simply discarded.</p></div></li><li><b>04</b><div><strong>Tabu refinement</strong><p>Local moves reduce gaps and improve preference fit.</p></div></li></ol></aside>
    </div>
  );
}
