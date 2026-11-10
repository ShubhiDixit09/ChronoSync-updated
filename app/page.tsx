"use client";

import {
  AlertTriangle,
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
  FileText,
  FileUp,
  FlaskConical,
  HelpCircle,
  Info,
  LayoutDashboard,
  Lock,
  LockKeyhole,
  Menu,
  Pencil,
  Plus,
  Printer,
  RefreshCcw,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trash2,
  Unlock,
  UserRound,
  Users,
  WandSparkles,
  X,
  Layers,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_CONFIG,
  DEFAULT_CONSTRAINTS,
  DEFAULT_COURSES,
  DEFAULT_DAYS,
  DEFAULT_FACULTY,
  DEFAULT_ROOMS,
  DEFAULT_SLOTS,
  PRESET_TEMPLATES,
  TimetableTemplate,
} from "./lib/initialData";
import { ClientScheduler, validateCapacity } from "./lib/optimizer";
import {
  ConstraintSetting,
  Course,
  Faculty,
  OptimizerConfig,
  Room,
  ScheduledSession,
  ScheduleResponse,
  ValidationResult,
} from "./lib/types";

type View = "schedule" | "courses" | "faculty" | "rooms" | "constraints";
type FilterMode = "group" | "faculty" | "room";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function Home() {
  const [view, setView] = useState<View>("schedule");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Institution & Term metadata
  const [institutionName, setInstitutionName] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("chronosync_inst_name") || "Northbridge Institute of Technology";
    }
    return "Northbridge Institute of Technology";
  });

  const [termName, setTermName] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("chronosync_term_name") || "Odd 2026";
    }
    return "Odd 2026";
  });

  const [isEditingInstName, setEditingInstName] = useState(false);
  const [isEditingTermName, setEditingTermName] = useState(false);

  // Core entities state
  const [courses, setCourses] = useState<Course[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("chronosync_courses");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return DEFAULT_COURSES;
  });

  const [faculty, setFaculty] = useState<Faculty[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("chronosync_faculty");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return DEFAULT_FACULTY;
  });

  const [rooms, setRooms] = useState<Room[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("chronosync_rooms");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return DEFAULT_ROOMS;
  });

  const [constraints, setConstraints] = useState<ConstraintSetting[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("chronosync_constraints");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return DEFAULT_CONSTRAINTS;
  });

  const [config, setConfig] = useState<OptimizerConfig>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("chronosync_config");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return DEFAULT_CONFIG;
  });

  // Locked sessions map: sessionId -> { day, slot_id, room_id }
  const [lockedSessions, setLockedSessions] = useState<
    Record<string, { day: string; slot_id: string; room_id: string }>
  >(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("chronosync_locked");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return {};
  });

  // Initial schedule result generated with client optimizer
  const [result, setResult] = useState<ScheduleResponse>(() => {
    const lockedMap = new Map<string, { day: string; slot_id: string; room_id: string }>();
    const scheduler = new ClientScheduler(
      institutionName,
      termName,
      DEFAULT_DAYS,
      DEFAULT_SLOTS,
      DEFAULT_ROOMS,
      DEFAULT_FACULTY,
      DEFAULT_COURSES,
      DEFAULT_CONSTRAINTS,
      DEFAULT_CONFIG,
      lockedMap,
    );
    return scheduler.run();
  });

  // Filtering & Search
  const [filterMode, setFilterMode] = useState<FilterMode>("group");
  const [filterValue, setFilterValue] = useState<string>("All");
  const [query, setQuery] = useState("");

  // Running status
  const [isGenerating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [engine, setEngine] = useState<"browser" | "api">("browser");
  const [connection, setConnection] = useState<"checking" | "live" | "offline">("checking");
  const [notice, setNotice] = useState("");

  // Modals
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isCourseModalOpen, setCourseModalOpen] = useState(false);

  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
  const [isFacultyModalOpen, setFacultyModalOpen] = useState(false);

  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [isRoomModalOpen, setRoomModalOpen] = useState(false);

  const [selectedSession, setSelectedSession] = useState<ScheduledSession | null>(null);
  const [isSessionModalOpen, setSessionModalOpen] = useState(false);

  const [isDiagnosticsModalOpen, setDiagnosticsModalOpen] = useState(false);
  const [diagnosticsResult, setDiagnosticsResult] = useState<ValidationResult | null>(null);

  const [isExportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [isImportModalOpen, setImportModalOpen] = useState(false);
  const [csvInput, setCsvInput] = useState("");

  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  const [isWizardModalOpen, setWizardModalOpen] = useState(false);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem("chronosync_inst_name", institutionName);
  }, [institutionName]);

  useEffect(() => {
    localStorage.setItem("chronosync_term_name", termName);
  }, [termName]);

  useEffect(() => {
    localStorage.setItem("chronosync_courses", JSON.stringify(courses));
  }, [courses]);

  useEffect(() => {
    localStorage.setItem("chronosync_faculty", JSON.stringify(faculty));
  }, [faculty]);

  useEffect(() => {
    localStorage.setItem("chronosync_rooms", JSON.stringify(rooms));
  }, [rooms]);

  useEffect(() => {
    localStorage.setItem("chronosync_constraints", JSON.stringify(constraints));
  }, [constraints]);

  useEffect(() => {
    localStorage.setItem("chronosync_config", JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem("chronosync_locked", JSON.stringify(lockedSessions));
  }, [lockedSessions]);

  // Check backend health
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE}/health`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("offline");
        setConnection("live");
      })
      .catch(() => setConnection("offline"));
    return () => controller.abort();
  }, []);

  // Filter options
  const uniqueGroups = useMemo(
    () => Array.from(new Set(courses.map((c) => c.group_id))).sort(),
    [courses],
  );

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    return result.sessions.filter((item) => {
      // 1. Perspective Filter
      if (filterMode === "group") {
        if (filterValue !== "All" && item.group_id !== filterValue) return false;
      } else if (filterMode === "faculty") {
        if (filterValue !== "All" && item.faculty_id !== filterValue) return false;
      } else if (filterMode === "room") {
        if (filterValue !== "All" && item.room_id !== filterValue) return false;
      }

      // 2. Query Search
      if (query.trim()) {
        const text = `${item.course_name} ${item.course_id} ${item.faculty_name} ${item.room_name} ${item.group_id}`.toLowerCase();
        if (!text.includes(query.toLowerCase())) return false;
      }

      return true;
    });
  }, [result.sessions, filterMode, filterValue, query]);

  // Dynamic faculty workloads
  const facultyLoads = useMemo(() => {
    const map = new Map<string, number>();
    result.sessions.forEach((s) => {
      map.set(s.faculty_id, (map.get(s.faculty_id) || 0) + s.duration_slots);
    });
    return map;
  }, [result.sessions]);

  // Dynamic room utilisations
  const roomUtilisations = useMemo(() => {
    const map = new Map<string, number>();
    const totalSlots = DEFAULT_DAYS.length * DEFAULT_SLOTS.length;
    result.sessions.forEach((s) => {
      map.set(s.room_id, (map.get(s.room_id) || 0) + s.duration_slots);
    });
    const percentMap = new Map<string, number>();
    rooms.forEach((r) => {
      const occupied = map.get(r.id) || 0;
      percentMap.set(r.id, Math.round((occupied / totalSlots) * 100));
    });
    return percentMap;
  }, [result.sessions, rooms]);

  // Run optimisation
  async function generateTimetable() {
    if (isGenerating) return;
    setGenerating(true);
    setProgress(15);
    setNotice("");

    const progressTimer = window.setInterval(() => {
      setProgress((v) => Math.min(94, v + Math.ceil(Math.random() * 12)));
    }, 150);

    try {
      const lockedMap = new Map<string, { day: string; slot_id: string; room_id: string }>();
      Object.entries(lockedSessions).forEach(([k, v]) => lockedMap.set(k, v));

      if (engine === "api" && connection === "live") {
        const payload = {
          institution: institutionName,
          term: termName,
          days: DEFAULT_DAYS,
          slots: DEFAULT_SLOTS,
          rooms,
          faculty,
          courses,
          locked_sessions: Object.entries(lockedSessions).map(([id, val]) => ({
            session_id: id,
            day: val.day,
            slot_id: val.slot_id,
            room_id: val.room_id,
          })),
          config,
        };

        const res = await fetch(`${API_BASE}/schedules/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error("API failed");
        const apiData = await res.json();
        apiData.sessions = apiData.sessions.map((s: ScheduledSession) => ({
          ...s,
          is_locked: !!lockedSessions[s.session_id],
        }));
        setResult(apiData);
        setNotice(`Generated with FastAPI Hybrid Optimizer (${apiData.metrics.hard_conflicts} clashes).`);
      } else {
        // Run Client TypeScript Genetic Algorithm
        await new Promise((resolve) => setTimeout(resolve, 350));
        const scheduler = new ClientScheduler(
          institutionName,
          termName,
          DEFAULT_DAYS,
          DEFAULT_SLOTS,
          rooms,
          faculty,
          courses,
          constraints,
          config,
          lockedMap,
        );
        const clientResult = scheduler.run();
        setResult(clientResult);
        setNotice(
          `Schedule generated in ${clientResult.run.execution_ms}ms using client-side Genetic Algorithm (${clientResult.metrics.hard_conflicts} clashes).`,
        );
      }
    } catch {
      // Fallback to client scheduler
      const lockedMap = new Map<string, { day: string; slot_id: string; room_id: string }>();
      Object.entries(lockedSessions).forEach(([k, v]) => lockedMap.set(k, v));

      const scheduler = new ClientScheduler(
        institutionName,
        termName,
        DEFAULT_DAYS,
        DEFAULT_SLOTS,
        rooms,
        faculty,
        courses,
        constraints,
        config,
        lockedMap,
      );
      const clientResult = scheduler.run();
      setResult(clientResult);
      setNotice("Executed in-browser Genetic Algorithm successfully.");
    } finally {
      window.clearInterval(progressTimer);
      setProgress(100);
      window.setTimeout(() => setGenerating(false), 300);
    }
  }

  // Pre-flight check
  function handleCheckDiagnostics() {
    const diag = validateCapacity(DEFAULT_DAYS, DEFAULT_SLOTS, rooms, faculty, courses);
    setDiagnosticsResult(diag);
    setDiagnosticsModalOpen(true);
  }

  // Apply a template
  function handleApplyTemplate(template: TimetableTemplate) {
    setInstitutionName(template.institution);
    setTermName(template.term);
    setCourses(template.courses);
    setFaculty(template.faculty);
    setRooms(template.rooms);
    setLockedSessions({});

    const scheduler = new ClientScheduler(
      template.institution,
      template.term,
      DEFAULT_DAYS,
      DEFAULT_SLOTS,
      template.rooms,
      template.faculty,
      template.courses,
      constraints,
      config,
    );
    setResult(scheduler.run());
    setWizardModalOpen(false);
    setNotice(`Loaded '${template.name}' with ${template.courses.length} subjects & ${template.faculty.length} teachers.`);
  }

  // Export handlers
  function handleExportCSV() {
    setExportDropdownOpen(false);
    const headers = [
      "Session ID",
      "Course Code",
      "Course Name",
      "Student Group",
      "Faculty",
      "Room",
      "Day",
      "Time Slot",
      "Duration (hours)",
      "Locked",
    ];

    const rows = result.sessions.map((s) => [
      `"${s.session_id}"`,
      `"${s.course_id}"`,
      `"${s.course_name}"`,
      `"${s.group_id}"`,
      `"${s.faculty_name}"`,
      `"${s.room_name}"`,
      `"${s.day}"`,
      `"${s.slot_label}"`,
      s.duration_slots,
      s.is_locked ? "Yes" : "No",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `chronosync-${institutionName.toLowerCase().replace(/\s+/g, "-")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleExportJSON() {
    setExportDropdownOpen(false);
    const data = {
      institution: institutionName,
      term: termName,
      generated_at: new Date().toISOString(),
      metrics: result.metrics,
      sessions: result.sessions,
      configuration: { courses, faculty, rooms, constraints, config },
    };
    const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", jsonStr);
    link.setAttribute("download", `chronosync-timetable.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handlePrintPDF() {
    setExportDropdownOpen(false);
    window.print();
  }

  // Toggle locked session
  function handleToggleLockSession(session: ScheduledSession) {
    setLockedSessions((prev) => {
      const next = { ...prev };
      if (next[session.session_id]) {
        delete next[session.session_id];
        setNotice(`Session ${session.course_id} unlocked.`);
      } else {
        next[session.session_id] = {
          day: session.day,
          slot_id: session.slot_id,
          room_id: session.room_id,
        };
        setNotice(`Session ${session.course_id} locked to ${session.day} at ${session.slot_id} in ${session.room_name}.`);
      }
      return next;
    });

    setResult((prev) => ({
      ...prev,
      sessions: prev.sessions.map((s) =>
        s.session_id === session.session_id ? { ...s, is_locked: !s.is_locked } : s,
      ),
    }));

    if (selectedSession && selectedSession.session_id === session.session_id) {
      setSelectedSession({ ...selectedSession, is_locked: !selectedSession.is_locked });
    }
  }

  // Direct In-Place Edit from Session Modal
  function handleUpdateSessionDetails(
    sessionId: string,
    updatedCourseName: string,
    updatedFacultyName: string,
    updatedGroupId: string,
    newDay: string,
    newSlotId: string,
    newRoomId: string,
  ) {
    const session = result.sessions.find((s) => s.session_id === sessionId);
    if (!session) return;

    // 1. Update or create faculty if teacher name was changed
    let activeFacultyId = session.faculty_id;
    const existingFaculty = faculty.find(
      (f) => f.name.toLowerCase() === updatedFacultyName.trim().toLowerCase(),
    );

    if (existingFaculty) {
      activeFacultyId = existingFaculty.id;
    } else if (updatedFacultyName.trim()) {
      // Create new teacher
      const newFId = `f-${Date.now().toString().slice(-4)}`;
      const initials = updatedFacultyName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 3);

      const newFacultyObj: Faculty = {
        id: newFId,
        name: updatedFacultyName.trim(),
        initials: initials || "T",
        subject: updatedCourseName || "General",
        preferred_slots: [],
        unavailable_slots: [],
        max_daily_sessions: 4,
        tone: "blue",
      };
      setFaculty((prev) => [...prev, newFacultyObj]);
      activeFacultyId = newFId;
    }

    // 2. Update Course in course list
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id === session.course_id) {
          return {
            ...c,
            name: updatedCourseName.trim() || c.name,
            faculty_id: activeFacultyId,
            group_id: updatedGroupId.trim() || c.group_id,
          };
        }
        return c;
      }),
    );

    // 3. Update all scheduled sessions of this course
    const targetRoom = rooms.find((r) => r.id === newRoomId);
    const targetSlot = DEFAULT_SLOTS.find((s) => s.id === newSlotId);

    const updatedSessions = result.sessions.map((s) => {
      const isThisSession = s.session_id === sessionId;
      const isThisCourse = s.course_id === session.course_id;

      return {
        ...s,
        course_name: isThisCourse ? updatedCourseName.trim() || s.course_name : s.course_name,
        faculty_id: isThisCourse ? activeFacultyId : s.faculty_id,
        faculty_name: isThisCourse ? updatedFacultyName.trim() || s.faculty_name : s.faculty_name,
        group_id: isThisCourse ? updatedGroupId.trim() || s.group_id : s.group_id,
        day: isThisSession ? newDay : s.day,
        slot_id: isThisSession ? newSlotId : s.slot_id,
        slot_label: isThisSession && targetSlot ? targetSlot.label : s.slot_label,
        room_id: isThisSession ? newRoomId : s.room_id,
        room_name: isThisSession && targetRoom ? targetRoom.name : s.room_name,
        is_locked: isThisSession ? true : s.is_locked,
      };
    });

    if (newDay !== session.day || newSlotId !== session.slot_id || newRoomId !== session.room_id) {
      setLockedSessions((prev) => ({
        ...prev,
        [sessionId]: { day: newDay, slot_id: newSlotId, room_id: newRoomId },
      }));
    }

    setResult((prev) => ({ ...prev, sessions: updatedSessions }));
    setSessionModalOpen(false);
    setNotice(`Updated details for subject '${updatedCourseName}' and teacher '${updatedFacultyName}'.`);
  }

  // Delete single session from current schedule
  function handleDeleteSession(sessionId: string) {
    setResult((prev) => ({
      ...prev,
      sessions: prev.sessions.filter((s) => s.session_id !== sessionId),
      metrics: {
        ...prev.metrics,
        scheduled_sessions: prev.metrics.scheduled_sessions - 1,
        unassigned_sessions: prev.metrics.unassigned_sessions + 1,
      },
    }));
    setLockedSessions((prev) => {
      const next = { ...prev };
      delete next[sessionId];
      return next;
    });
    setSessionModalOpen(false);
    setNotice(`Session removed from timetable.`);
  }

  // CSV Import handler
  function handleImportCSV() {
    if (!csvInput.trim()) return;
    try {
      const lines = csvInput.trim().split("\n");
      const newCourses: Course[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const [id, name, faculty_id, group_id, room_type, capacity, weekly_sessions, duration_slots, color] = line
          .split(",")
          .map((item) => item.replace(/^["']|["']$/g, "").trim());

        if (id && name) {
          newCourses.push({
            id,
            name,
            faculty_id: faculty_id || faculty[0]?.id || "f1",
            group_id: group_id || "Class-1",
            room_type: room_type === "lab" ? "lab" : "lecture",
            capacity: parseInt(capacity) || 50,
            weekly_sessions: parseInt(weekly_sessions) || 2,
            duration_slots: parseInt(duration_slots) || 1,
            color: (color as any) || "blue",
          });
        }
      }

      if (newCourses.length > 0) {
        setCourses(newCourses);
        setImportModalOpen(false);
        setCsvInput("");
        setNotice(`Successfully imported ${newCourses.length} courses from CSV!`);
      } else {
        alert("No valid courses found in CSV. Please follow the sample format.");
      }
    } catch (err: any) {
      alert("Failed to parse CSV: " + err.message);
    }
  }

  const pageTitle = {
    schedule: "Weekly timetable",
    courses: "Subjects & courses",
    faculty: "Teachers & faculty",
    rooms: "Rooms & classrooms",
    constraints: "Rules & parameters",
  }[view];

  return (
    <main className="app-shell">
      {/* SIDEBAR NAVIGATION */}
      <aside className={`sidebar ${sidebarOpen ? "is-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <Clock3 size={22} strokeWidth={2.2} />
          </div>
          <div>
            <div className="brand-name">ChronoSync</div>
            <div className="brand-subtitle">Timetable Platform</div>
          </div>
          <button
            className="sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        <p className="nav-eyebrow">Workspaces</p>
        <nav className="nav-list" aria-label="Primary navigation">
          {[
            { id: "schedule" as const, label: "Timetable View", icon: CalendarDays, count: `${result.sessions.length}` },
            { id: "courses" as const, label: "Subjects / Courses", icon: BookOpen, count: `${courses.length}` },
            { id: "faculty" as const, label: "Teachers / Faculty", icon: Users, count: `${faculty.length}` },
            { id: "rooms" as const, label: "Rooms / Labs", icon: DoorOpen, count: `${rooms.length}` },
            { id: "constraints" as const, label: "Rules & Engine", icon: SlidersHorizontal },
          ].map((item) => {
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
                {item.count && <span className="nav-count">{item.count}</span>}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-story">
          <Sparkles size={17} />
          <strong>Custom Timetables</strong>
          <p>
            Build schedules for schools, colleges, or departments with custom teachers, subjects, and classes.
          </p>
          <button onClick={() => setWizardModalOpen(true)}>
            Custom Timetable Wizard <ArrowUpRight size={14} />
          </button>
        </div>

        <div className="sidebar-footer">
          <button onClick={() => setWizardModalOpen(true)}>
            <Layers size={18} /> New / Switch Template
          </button>
          <button onClick={() => setSettingsModalOpen(true)}>
            <Settings size={18} /> Settings & Algorithm
          </button>
          <button onClick={handleCheckDiagnostics}>
            <ShieldCheck size={18} /> Check Feasibility
          </button>
          <div className="profile">
            <span>SD</span>
            <div>
              <strong>Shubhi Dixit</strong>
              <small>Timetable Admin</small>
            </div>
            <ChevronDown size={15} />
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          className="mobile-scrim"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* MAIN WORKSPACE */}
      <section className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="menu-button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={22} />
            </button>

            {/* Editable Institution Name */}
            {isEditingInstName ? (
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <input
                  className="form-input"
                  style={{ height: "36px", minWidth: "260px", fontWeight: 600 }}
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  onBlur={() => setEditingInstName(false)}
                  onKeyDown={(e) => e.key === "Enter" && setEditingInstName(false)}
                  autoFocus
                />
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => setEditingInstName(false)}
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                className="selector"
                onClick={() => setEditingInstName(true)}
                title="Click to rename institution / school"
              >
                <Building2 size={17} />
                <span>{institutionName}</span>
                <Pencil size={12} style={{ color: "var(--ink-soft)" }} />
              </button>
            )}

            {/* Editable Term Name */}
            {isEditingTermName ? (
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <input
                  className="form-input"
                  style={{ height: "36px", minWidth: "140px", fontWeight: 600 }}
                  value={termName}
                  onChange={(e) => setTermName(e.target.value)}
                  onBlur={() => setEditingTermName(false)}
                  onKeyDown={(e) => e.key === "Enter" && setEditingTermName(false)}
                  autoFocus
                />
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => setEditingTermName(false)}
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                className="selector term"
                onClick={() => setEditingTermName(true)}
                title="Click to rename term or class"
              >
                <CalendarDays size={17} />
                <span>{termName}</span>
                <Pencil size={12} style={{ color: "var(--ink-soft)" }} />
              </button>
            )}
          </div>

          <div className="topbar-actions">
            {/* Quick Template Switcher / Custom Timetable Button */}
            <button
              className="secondary-button"
              onClick={() => setWizardModalOpen(true)}
              style={{ fontWeight: 700 }}
            >
              <Layers size={16} /> New / Templates
            </button>

            <span className={`connection ${connection === "live" ? "live" : "demo"}`}>
              <span />
              {connection === "live" ? "FastAPI Online" : "In-Browser Engine"}
            </span>

            <button
              className="icon-button"
              onClick={handleCheckDiagnostics}
              title="Pre-flight feasibility check"
            >
              <ShieldCheck size={19} />
            </button>

            <button
              className="icon-button"
              onClick={() => setSettingsModalOpen(true)}
              title="Algorithm Settings"
            >
              <Settings size={19} />
            </button>

            <button className="avatar">SD</button>
          </div>
        </header>

        <div className="page">
          {/* PAGE HEADING */}
          <div className="page-heading">
            <div>
              <div className="breadcrumb">
                <LayoutDashboard size={14} /> Academic Planning <span>/</span> {pageTitle}
              </div>
              <h1>{pageTitle}</h1>
              <p>
                {view === "schedule"
                  ? `${result.sessions.length} scheduled periods · ${Object.keys(lockedSessions).length} locked · ${uniqueGroups.length} class sections · ${faculty.length} teachers`
                  : view === "courses"
                  ? "Manage subjects, weekly periods, and assign teachers."
                  : view === "faculty"
                  ? "Manage teachers, subjects taught, and working hours."
                  : view === "rooms"
                  ? "Manage classrooms, lecture halls, and laboratory rooms."
                  : "Tune solver engine, constraint weights, and genetic algorithm parameters."}
              </p>
            </div>

            <div className="heading-actions">
              {view === "schedule" && (
                <>
                  <div style={{ position: "relative" }}>
                    <button
                      className="secondary-button"
                      onClick={() => setExportDropdownOpen(!isExportDropdownOpen)}
                    >
                      <Download size={17} /> Export <ChevronDown size={14} />
                    </button>
                    {isExportDropdownOpen && (
                      <div className="dropdown-menu">
                        <button className="dropdown-item" onClick={handleExportCSV}>
                          <FileText size={15} /> Export as CSV (Excel)
                        </button>
                        <button className="dropdown-item" onClick={handleExportJSON}>
                          <Download size={15} /> Export as JSON
                        </button>
                        <button className="dropdown-item" onClick={handlePrintPDF}>
                          <Printer size={15} /> Print / Save PDF
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    className="secondary-button"
                    onClick={() => {
                      setEditingCourse(null);
                      setCourseModalOpen(true);
                    }}
                    title="Add a new subject to schedule"
                  >
                    <Plus size={16} /> Add Subject
                  </button>
                </>
              )}

              {view === "courses" && (
                <>
                  <button className="secondary-button" onClick={() => setImportModalOpen(true)}>
                    <FileUp size={16} /> Import CSV
                  </button>
                  <button
                    className="primary-button"
                    onClick={() => {
                      setEditingCourse(null);
                      setCourseModalOpen(true);
                    }}
                  >
                    <Plus size={16} /> Add subject
                  </button>
                </>
              )}

              {view === "faculty" && (
                <button
                  className="primary-button"
                  onClick={() => {
                    setEditingFaculty(null);
                    setFacultyModalOpen(true);
                  }}
                >
                  <Plus size={16} /> Add teacher
                </button>
              )}

              {view === "rooms" && (
                <button
                  className="primary-button"
                  onClick={() => {
                    setEditingRoom(null);
                    setRoomModalOpen(true);
                  }}
                >
                  <Plus size={16} /> Add classroom
                </button>
              )}

              <button
                className="primary-button"
                onClick={generateTimetable}
                disabled={isGenerating}
              >
                {isGenerating ? <RefreshCcw className="spin" size={18} /> : <WandSparkles size={18} />}
                {isGenerating ? "Optimising…" : "Generate timetable"}
              </button>
            </div>
          </div>

          {notice && (
            <div className="notice">
              <CheckCircle2 size={17} />
              <span>{notice}</span>
              <button onClick={() => setNotice("")} aria-label="Dismiss">
                <X size={15} />
              </button>
            </div>
          )}

          {/* VIEW: SCHEDULE */}
          {view === "schedule" && (
            <>
              {/* METRIC CARDS */}
              <section className="metric-grid" aria-label="Schedule metrics">
                <Metric
                  icon={<ShieldCheck />}
                  label="Clash status"
                  value={String(result.metrics.hard_conflicts)}
                  detail={
                    result.metrics.hard_conflicts === 0
                      ? "Feasible · Zero overlaps"
                      : "Clashes require attention"
                  }
                  tone={result.metrics.hard_conflicts === 0 ? "blue" : "amber"}
                />
                <Metric
                  icon={<Target />}
                  label="Preference fit"
                  value={`${Math.round(result.metrics.preference_fit)}%`}
                  detail="Teacher preferred slots honoured"
                  tone="amber"
                />
                <Metric
                  icon={<Building2 />}
                  label="Room utilisation"
                  value={`${Math.round(result.metrics.room_utilisation)}%`}
                  detail="Across active classrooms"
                  tone="sage"
                />
                <Metric
                  icon={<BarChart3 />}
                  label="Soft penalty"
                  value={result.metrics.soft_penalty.toFixed(1)}
                  detail={`Execution: ${result.run.execution_ms || 320}ms`}
                  tone="violet"
                />
              </section>

              {/* SCHEDULE TOOLBAR */}
              <section className="schedule-toolbar">
                <div className="search-field">
                  <Search size={17} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search subject, teacher, classroom, or class…"
                  />
                  {query && (
                    <button
                      onClick={() => setQuery("")}
                      style={{ border: 0, background: "transparent", cursor: "pointer" }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Perspective selector tabs */}
                <div className="view-mode-tabs">
                  <button
                    className={`view-mode-tab ${filterMode === "group" ? "active" : ""}`}
                    onClick={() => {
                      setFilterMode("group");
                      setFilterValue("All");
                    }}
                  >
                    Class / Section
                  </button>
                  <button
                    className={`view-mode-tab ${filterMode === "faculty" ? "active" : ""}`}
                    onClick={() => {
                      setFilterMode("faculty");
                      setFilterValue("All");
                    }}
                  >
                    Teacher View
                  </button>
                  <button
                    className={`view-mode-tab ${filterMode === "room" ? "active" : ""}`}
                    onClick={() => {
                      setFilterMode("room");
                      setFilterValue("All");
                    }}
                  >
                    Classroom View
                  </button>
                </div>

                {/* Dynamic Dropdown depending on perspective */}
                <label className="field-select">
                  <span>
                    {filterMode === "group"
                      ? "Class"
                      : filterMode === "faculty"
                      ? "Teacher"
                      : "Room"}
                    :
                  </span>
                  <select
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                  >
                    <option value="All">
                      All {filterMode === "group" ? "Classes" : filterMode === "faculty" ? "Teachers" : "Rooms"}
                    </option>
                    {filterMode === "group" &&
                      uniqueGroups.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    {filterMode === "faculty" &&
                      faculty.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    {filterMode === "room" &&
                      rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                  </select>
                </label>

                <button
                  className="filter-button"
                  onClick={() => {
                    setEditingCourse(null);
                    setCourseModalOpen(true);
                  }}
                  title="Add new subject"
                >
                  <Plus size={15} /> Add Subject
                </button>

                <div className="toolbar-status">
                  {result.metrics.hard_conflicts === 0 ? (
                    <>
                      <CheckCircle2 size={16} /> Clash-free schedule
                    </>
                  ) : (
                    <span style={{ color: "#d9534f" }}>
                      <AlertTriangle size={16} /> {result.metrics.hard_conflicts} clash(es)
                    </span>
                  )}
                </div>
              </section>

              {/* TIMETABLE GRID & RIGHT PANEL */}
              <div className="schedule-layout">
                <section className="timetable-card">
                  <div className="timetable-scroll">
                    <div className="timetable-grid">
                      <div className="grid-head time-head">Time</div>
                      {DEFAULT_DAYS.map((day) => {
                        const daySessions = filteredSessions.filter((item) => item.day === day);
                        return (
                          <div key={day} className="grid-head">
                            {day}
                            <small>{daySessions.length} periods</small>
                          </div>
                        );
                      })}

                      {DEFAULT_SLOTS.flatMap((slot) => [
                        <div key={`time-${slot.id}`} className="time-cell">
                          <strong>{slot.id}</strong>
                          <small>{slot.label.split("–")[1]}</small>
                        </div>,
                        ...DEFAULT_DAYS.map((day) => {
                          const items = filteredSessions.filter(
                            (item) => item.day === day && item.slot_id === slot.id,
                          );
                          return (
                            <div key={`${day}-${slot.id}`} className="schedule-cell">
                              {items.map((item) => (
                                <SessionCard
                                  key={item.session_id}
                                  session={item}
                                  onClick={() => {
                                    setSelectedSession(item);
                                    setSessionModalOpen(true);
                                  }}
                                />
                              ))}
                            </div>
                          );
                        }),
                      ])}
                    </div>
                  </div>

                  <div className="legend">
                    <span>
                      <i className="blue" /> Core Subject
                    </span>
                    <span>
                      <i className="amber" /> Theory
                    </span>
                    <span>
                      <i className="sage" /> Practical / Lab
                    </span>
                    <span>
                      <i className="violet" /> Language / Elective
                    </span>
                    <span className="legend-note">
                      <LockKeyhole size={14} /> Click any class to edit subject, teacher, section or lock in place
                    </span>
                  </div>
                </section>

                {/* INSIGHT PANEL (TEACHERS & QUICK EDIT) */}
                <aside className="insight-panel">
                  <div className="panel-heading">
                    <div>
                      <span className="eyebrow">Assigned Workload</span>
                      <h2>Teachers & Faculty</h2>
                    </div>
                    <button
                      onClick={() => {
                        setEditingFaculty(null);
                        setFacultyModalOpen(true);
                      }}
                      title="Add new teacher"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "11px",
                        color: "var(--cobalt)",
                        fontWeight: 700,
                        border: 0,
                        background: "transparent",
                        cursor: "pointer",
                      }}
                    >
                      <Plus size={14} /> Add
                    </button>
                  </div>

                  <div className="faculty-stack">
                    {faculty.map((f) => {
                      const currentHours = facultyLoads.get(f.id) || 0;
                      const maxHours = f.max_daily_sessions * DEFAULT_DAYS.length;
                      const percent = Math.min(100, Math.round((currentHours / maxHours) * 100));

                      return (
                        <article className="faculty-card" key={f.id}>
                          <div
                            className={`faculty-avatar ${f.tone}`}
                            onClick={() => {
                              setFilterMode("faculty");
                              setFilterValue(f.id);
                            }}
                            style={{ cursor: "pointer" }}
                            title="Filter timetable by this teacher"
                          >
                            {f.initials}
                          </div>
                          <div className="faculty-copy">
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <div>
                                <strong>{f.name}</strong>
                                <small>{f.subject}</small>
                              </div>
                              <button
                                className="action-btn"
                                style={{ width: "22px", height: "22px" }}
                                onClick={() => {
                                  setEditingFaculty(f);
                                  setFacultyModalOpen(true);
                                }}
                                title="Edit teacher name or subjects"
                              >
                                <Pencil size={11} />
                              </button>
                            </div>

                            <p>
                              <Clock3 size={13} />
                              {f.preferred_slots.length > 0
                                ? f.preferred_slots.join(", ")
                                : "Any slot"}
                            </p>

                            <div className="load-line">
                              <span>Load</span>
                              <div>
                                <i style={{ width: `${percent}%` }} />
                              </div>
                              <b>{currentHours}/{maxHours}h</b>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  <button className="text-button" onClick={() => setView("faculty")}>
                    Manage all teachers <ArrowUpRight size={15} />
                  </button>

                  <div className="algorithm-note">
                    <div className="algorithm-icon">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <strong>Genetic Algorithm Progress</strong>
                      <p>
                        Current fitness: {result.run.convergence[result.run.convergence.length - 1] || 0.94}
                      </p>
                      <div className="convergence-mini-chart">
                        {result.run.convergence.slice(-15).map((fit, idx) => (
                          <div
                            key={idx}
                            className="convergence-bar"
                            style={{ height: `${Math.round(fit * 100)}%` }}
                            title={`Generation ${idx + 1}: ${fit}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </aside>
              </div>
            </>
          )}

          {/* VIEW: COURSES */}
          {view === "courses" && (
            <CourseView
              courses={courses}
              faculty={faculty}
              onAdd={() => {
                setEditingCourse(null);
                setCourseModalOpen(true);
              }}
              onEdit={(c) => {
                setEditingCourse(c);
                setCourseModalOpen(true);
              }}
              onDelete={(id) => {
                if (confirm(`Delete subject ${id}?`)) {
                  setCourses(courses.filter((c) => c.id !== id));
                  setNotice(`Subject ${id} deleted.`);
                }
              }}
              onImport={() => setImportModalOpen(true)}
            />
          )}

          {/* VIEW: FACULTY */}
          {view === "faculty" && (
            <FacultyView
              faculty={faculty}
              facultyLoads={facultyLoads}
              onAdd={() => {
                setEditingFaculty(null);
                setFacultyModalOpen(true);
              }}
              onEdit={(f) => {
                setEditingFaculty(f);
                setFacultyModalOpen(true);
              }}
              onDelete={(id) => {
                if (confirm(`Remove teacher ${id}?`)) {
                  setFaculty(faculty.filter((f) => f.id !== id));
                  setNotice(`Teacher ${id} removed.`);
                }
              }}
            />
          )}

          {/* VIEW: ROOMS */}
          {view === "rooms" && (
            <RoomView
              rooms={rooms}
              roomUtilisations={roomUtilisations}
              onAdd={() => {
                setEditingRoom(null);
                setRoomModalOpen(true);
              }}
              onEdit={(r) => {
                setEditingRoom(r);
                setRoomModalOpen(true);
              }}
              onDelete={(id) => {
                if (confirm(`Delete classroom ${id}?`)) {
                  setRooms(rooms.filter((r) => r.id !== id));
                  setNotice(`Room ${id} deleted.`);
                }
              }}
            />
          )}

          {/* VIEW: CONSTRAINTS & ENGINE */}
          {view === "constraints" && (
            <ConstraintView
              constraints={constraints}
              setConstraints={setConstraints}
              config={config}
              setConfig={setConfig}
              engine={engine}
              setEngine={setEngine}
              connection={connection}
              onRun={generateTimetable}
            />
          )}
        </div>
      </section>

      {/* GENERATING DRAWER */}
      {isGenerating && (
        <div className="run-drawer" role="status" aria-live="polite">
          <div className="run-top">
            <div>
              <span className="live-dot" />
              {engine === "browser" ? "Browser Genetic Algorithm" : "FastAPI Hybrid Solver"}
            </div>
            <strong>{progress}%</strong>
          </div>
          <div className="progress-track">
            <i style={{ width: `${progress}%` }} />
          </div>
          <div className="run-stages">
            <span className={progress >= 18 ? "done" : "active"}>
              <Check size={13} /> Validate
            </span>
            <span className={progress >= 45 ? "done" : progress >= 18 ? "active" : ""}>
              <Check size={13} /> Seed
            </span>
            <span className={progress >= 78 ? "done" : progress >= 45 ? "active" : ""}>
              <Check size={13} /> Evolve (GA)
            </span>
            <span className={progress >= 96 ? "done" : progress >= 78 ? "active" : ""}>
              <Check size={13} /> Tabu Refine
            </span>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT COURSE */}
      {isCourseModalOpen && (
        <CourseModal
          course={editingCourse}
          facultyList={faculty}
          uniqueGroups={uniqueGroups}
          onClose={() => setCourseModalOpen(false)}
          onSave={(savedCourse) => {
            if (editingCourse) {
              setCourses(courses.map((c) => (c.id === editingCourse.id ? savedCourse : c)));
              setNotice(`Updated subject ${savedCourse.name}`);
            } else {
              setCourses([...courses, savedCourse]);
              setNotice(`Added new subject ${savedCourse.name}`);
            }
            setCourseModalOpen(false);
          }}
        />
      )}

      {/* MODAL: ADD / EDIT FACULTY */}
      {isFacultyModalOpen && (
        <FacultyModal
          facultyMember={editingFaculty}
          slots={DEFAULT_SLOTS}
          onClose={() => setFacultyModalOpen(false)}
          onSave={(savedFaculty) => {
            if (editingFaculty) {
              setFaculty(faculty.map((f) => (f.id === editingFaculty.id ? savedFaculty : f)));
              setNotice(`Updated teacher ${savedFaculty.name}`);
            } else {
              setFaculty([...faculty, savedFaculty]);
              setNotice(`Added new teacher ${savedFaculty.name}`);
            }
            setFacultyModalOpen(false);
          }}
        />
      )}

      {/* MODAL: ADD / EDIT ROOM */}
      {isRoomModalOpen && (
        <RoomModal
          room={editingRoom}
          onClose={() => setRoomModalOpen(false)}
          onSave={(savedRoom) => {
            if (editingRoom) {
              setRooms(rooms.map((r) => (r.id === editingRoom.id ? savedRoom : r)));
              setNotice(`Updated classroom ${savedRoom.name}`);
            } else {
              setRooms([...rooms, savedRoom]);
              setNotice(`Added new classroom ${savedRoom.name}`);
            }
            setRoomModalOpen(false);
          }}
        />
      )}

      {/* MODAL: SESSION INSPECTOR & IN-PLACE CUSTOMIZER */}
      {isSessionModalOpen && selectedSession && (
        <SessionDetailModal
          session={selectedSession}
          allSessions={result.sessions}
          days={DEFAULT_DAYS}
          slots={DEFAULT_SLOTS}
          rooms={rooms}
          facultyList={faculty}
          onClose={() => setSessionModalOpen(false)}
          onToggleLock={() => handleToggleLockSession(selectedSession)}
          onSaveDetails={handleUpdateSessionDetails}
          onDelete={() => handleDeleteSession(selectedSession.session_id)}
        />
      )}

      {/* MODAL: CUSTOM TIMETABLE & TEMPLATE WIZARD */}
      {isWizardModalOpen && (
        <TimetableWizardModal
          currentInstName={institutionName}
          currentTermName={termName}
          onClose={() => setWizardModalOpen(false)}
          onApplyTemplate={handleApplyTemplate}
          onCreateCustom={(customData) => {
            setInstitutionName(customData.institution);
            setTermName(customData.term);
            setCourses(customData.courses);
            setFaculty(customData.faculty);
            setRooms(customData.rooms);
            setLockedSessions({});

            const scheduler = new ClientScheduler(
              customData.institution,
              customData.term,
              DEFAULT_DAYS,
              DEFAULT_SLOTS,
              customData.rooms,
              customData.faculty,
              customData.courses,
              constraints,
              config,
            );
            setResult(scheduler.run());
            setWizardModalOpen(false);
            setNotice(`Created custom timetable '${customData.institution}' with ${customData.courses.length} subjects!`);
          }}
        />
      )}

      {/* MODAL: FEASIBILITY DIAGNOSTICS */}
      {isDiagnosticsModalOpen && diagnosticsResult && (
        <DiagnosticsModal
          result={diagnosticsResult}
          coursesCount={courses.length}
          roomsCount={rooms.length}
          facultyCount={faculty.length}
          onClose={() => setDiagnosticsModalOpen(false)}
          onFixConstraints={() => {
            setDiagnosticsModalOpen(false);
            setView("constraints");
          }}
        />
      )}

      {/* MODAL: CSV IMPORT */}
      {isImportModalOpen && (
        <ImportCsvModal
          csvText={csvInput}
          onChangeText={setCsvInput}
          onClose={() => setImportModalOpen(false)}
          onImport={handleImportCSV}
        />
      )}

      {/* MODAL: SETTINGS & TUNING */}
      {isSettingsModalOpen && (
        <SettingsModal
          config={config}
          setConfig={setConfig}
          engine={engine}
          setEngine={setEngine}
          connection={connection}
          onClose={() => setSettingsModalOpen(false)}
          onResetDefaults={() => {
            handleApplyTemplate(PRESET_TEMPLATES[0]);
            setSettingsModalOpen(false);
          }}
        />
      )}
    </main>
  );
}

// ---------------------------------------------------------
// SUBCOMPONENTS & VIEWS
// ---------------------------------------------------------

function Metric({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: string;
}) {
  return (
    <article className="metric-card">
      <div className={`metric-icon ${tone}`}>{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
  );
}

function SessionCard({
  session,
  onClick,
}: {
  session: ScheduledSession;
  onClick: () => void;
}) {
  return (
    <article
      className={`session-card ${session.color}`}
      onClick={onClick}
      title="Click to edit subject, teacher, class or lock slot"
    >
      <div className="session-title">
        <strong>{session.course_id}</strong>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {session.duration_slots > 1 && <FlaskConical size={14} />}
          {session.is_locked && (
            <span className="locked-indicator" title="Locked session">
              <Lock size={10} /> Locked
            </span>
          )}
        </div>
      </div>
      <p>{session.course_name}</p>
      <small>
        <UserRound size={12} />
        {session.faculty_name}
      </small>
      <div className="session-meta">
        <span>{session.room_name}</span>
        <b>{session.group_id}</b>
      </div>
    </article>
  );
}

function CourseView({
  courses,
  faculty,
  onAdd,
  onEdit,
  onDelete,
  onImport,
}: {
  courses: Course[];
  faculty: Faculty[];
  onAdd: () => void;
  onEdit: (c: Course) => void;
  onDelete: (id: string) => void;
  onImport: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const facultyMap = useMemo(() => new Map(faculty.map((f) => [f.id, f.name])), [faculty]);

  const filtered = courses.filter((c) =>
    `${c.id} ${c.name} ${c.group_id} ${facultyMap.get(c.faculty_id)}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase()),
  );

  return (
    <section className="management-card">
      <div className="management-toolbar">
        <div className="search-field">
          <Search size={17} />
          <input
            placeholder="Search subjects by code, name, class, teacher…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="secondary-button" onClick={onImport}>
          <FileUp size={16} /> Import CSV
        </button>
        <button className="primary-button" onClick={onAdd}>
          <Plus size={16} /> Add subject
        </button>
      </div>

      <div className="data-table">
        <div className="table-row table-header">
          <span>Subject Code & Title</span>
          <span>Class / Section</span>
          <span>Weekly Periods</span>
          <span>Assigned Teacher</span>
          <span>Type & Actions</span>
        </div>

        {filtered.map((course) => (
          <div className="table-row" key={course.id}>
            <span>
              <b>{course.id}</b>
              <small>{course.name}</small>
            </span>
            <span>{course.group_id}</span>
            <span>
              {course.weekly_sessions} session{course.weekly_sessions > 1 ? "s" : ""} ×{" "}
              {course.duration_slots}h ({course.capacity} students)
            </span>
            <span>{facultyMap.get(course.faculty_id) || course.faculty_id}</span>
            <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <i className={`tag ${course.room_type === "lab" ? "sage" : "blue"}`}>
                {course.room_type === "lab" ? "Lab / Practical" : "Theory Class"}
              </i>
              <div className="row-actions">
                <button
                  className="action-btn"
                  onClick={() => onEdit(course)}
                  title="Edit subject"
                >
                  <Pencil size={13} />
                </button>
                <button
                  className="action-btn delete"
                  onClick={() => onDelete(course.id)}
                  title="Delete subject"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function FacultyView({
  faculty,
  facultyLoads,
  onAdd,
  onEdit,
  onDelete,
}: {
  faculty: Faculty[];
  facultyLoads: Map<string, number>;
  onAdd: () => void;
  onEdit: (f: Faculty) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
        <button className="primary-button" onClick={onAdd}>
          <Plus size={16} /> Add teacher / faculty
        </button>
      </div>

      <div className="profile-grid">
        {faculty.map((f) => {
          const currentLoad = facultyLoads.get(f.id) || 0;
          const maxLoad = f.max_daily_sessions * DEFAULT_DAYS.length;
          const percent = Math.min(100, Math.round((currentLoad / maxLoad) * 100));

          return (
            <article className="profile-card" key={f.id}>
              <div className="profile-card-top">
                <div className={`faculty-avatar large ${f.tone}`}>{f.initials}</div>
                <div>
                  <h3>{f.name}</h3>
                  <p>{f.subject}</p>
                </div>
                <div className="row-actions" style={{ marginLeft: "auto" }}>
                  <button className="action-btn" onClick={() => onEdit(f)} title="Edit teacher">
                    <Pencil size={13} />
                  </button>
                  <button
                    className="action-btn delete"
                    onClick={() => onDelete(f.id)}
                    title="Delete teacher"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <div className="preference-box">
                <Clock3 size={16} />
                <div>
                  <span>Preferred teaching window</span>
                  <strong>
                    {f.preferred_slots.length > 0
                      ? f.preferred_slots.join(", ")
                      : "Any open time slot"}
                  </strong>
                </div>
              </div>

              <div className="profile-load">
                <span>
                  Weekly load: <b>{currentLoad} / {maxLoad} hours</b>
                </span>
                <div>
                  <i style={{ width: `${percent}%` }} />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function RoomView({
  rooms,
  roomUtilisations,
  onAdd,
  onEdit,
  onDelete,
}: {
  rooms: Room[];
  roomUtilisations: Map<string, number>;
  onAdd: () => void;
  onEdit: (r: Room) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
        <button className="primary-button" onClick={onAdd}>
          <Plus size={16} /> Add classroom / lab
        </button>
      </div>

      <div className="room-grid">
        {rooms.map((room) => {
          const utilisation = roomUtilisations.get(room.id) || 0;

          return (
            <article className="room-card" key={room.id}>
              <div className="room-card-head">
                <div>
                  <Building2 size={20} />
                  <h3>{room.name}</h3>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>{utilisation}% used</span>
                  <div className="row-actions">
                    <button className="action-btn" onClick={() => onEdit(room)} title="Edit room">
                      <Pencil size={13} />
                    </button>
                    <button
                      className="action-btn delete"
                      onClick={() => onDelete(room.id)}
                      title="Delete room"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>

              <p>{room.building}</p>

              <div className="room-stats">
                <span>
                  <b>{room.capacity}</b> seats
                </span>
                <span>
                  <b>{room.room_type === "lab" ? "Laboratory" : "Classroom"}</b>
                </span>
              </div>

              <div className="profile-load">
                <div>
                  <i style={{ width: `${utilisation}%` }} />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function ConstraintView({
  constraints,
  setConstraints,
  config,
  setConfig,
  engine,
  setEngine,
  connection,
  onRun,
}: {
  constraints: ConstraintSetting[];
  setConstraints: React.Dispatch<React.SetStateAction<ConstraintSetting[]>>;
  config: OptimizerConfig;
  setConfig: React.Dispatch<React.SetStateAction<OptimizerConfig>>;
  engine: "browser" | "api";
  setEngine: (e: "browser" | "api") => void;
  connection: "checking" | "live" | "offline";
  onRun: () => void;
}) {
  return (
    <div className="constraint-layout">
      <section className="constraint-list">
        <div style={{ marginBottom: "8px" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "20px", margin: "0 0 6px" }}>
            Constraint Rules & Scoring Weights
          </h2>
          <p style={{ margin: 0, fontSize: "12px", color: "var(--ink-soft)" }}>
            Hard constraints must never be breached. Soft constraint weights control penalty trade-offs in the genetic fitness function.
          </p>
        </div>

        {constraints.map((item) => (
          <article className="constraint-card" key={item.id}>
            <div className={`constraint-symbol ${item.hard ? "hard" : "soft"}`}>
              {item.hard ? <ShieldCheck size={19} /> : <Target size={19} />}
            </div>

            <div className="constraint-copy">
              <div>
                <h3>{item.name}</h3>
                <span className={item.hard ? "hard-tag" : "soft-tag"}>
                  {item.hard ? "Hard constraint" : `Weight ${item.weight}`}
                </span>
              </div>
              <p>{item.detail}</p>

              {!item.hard && item.enabled && (
                <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "10px", color: "var(--ink-soft)" }}>Priority Weight:</span>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={item.weight}
                    onChange={(e) => {
                      const newWeight = parseInt(e.target.value);
                      setConstraints((prev) =>
                        prev.map((c) => (c.id === item.id ? { ...c, weight: newWeight } : c)),
                      );
                    }}
                    style={{ flex: 1, maxWidth: "160px" }}
                  />
                  <b style={{ fontSize: "11px" }}>{item.weight}</b>
                </div>
              )}
            </div>

            <button
              className={`toggle ${item.enabled ? "on" : ""} ${item.hard ? "locked" : ""}`}
              onClick={() => {
                if (!item.hard) {
                  setConstraints((prev) =>
                    prev.map((c) => (c.id === item.id ? { ...c, enabled: !c.enabled } : c)),
                  );
                }
              }}
              aria-label={`Toggle ${item.name}`}
            >
              <i />
            </button>
          </article>
        ))}

        {/* Solver Engine Selector */}
        <div style={{ border: "1px solid var(--line-warm)", borderRadius: "12px", padding: "16px", background: "white", marginTop: "12px" }}>
          <h3 style={{ margin: "0 0 10px", fontSize: "14px" }}>Optimisation Engine</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <label
              style={{
                border: `2px solid ${engine === "browser" ? "var(--cobalt)" : "#d9d6cf"}`,
                borderRadius: "8px",
                padding: "12px",
                cursor: "pointer",
                background: engine === "browser" ? "#edf4ff" : "white",
              }}
            >
              <input
                type="radio"
                name="engine"
                checked={engine === "browser"}
                onChange={() => setEngine("browser")}
                style={{ marginRight: "8px" }}
              />
              <strong>In-Browser Genetic Engine</strong>
              <p style={{ margin: "4px 0 0", fontSize: "11px", color: "var(--ink-soft)" }}>
                Runs high-speed TypeScript GA directly in memory. Works offline with 0 setup.
              </p>
            </label>

            <label
              style={{
                border: `2px solid ${engine === "api" ? "var(--cobalt)" : "#d9d6cf"}`,
                borderRadius: "8px",
                padding: "12px",
                cursor: "pointer",
                background: engine === "api" ? "#edf4ff" : "white",
              }}
            >
              <input
                type="radio"
                name="engine"
                checked={engine === "api"}
                onChange={() => setEngine("api")}
                style={{ marginRight: "8px" }}
              />
              <strong>FastAPI Python Optimizer</strong>
              <p style={{ margin: "4px 0 0", fontSize: "11px", color: "var(--ink-soft)" }}>
                Connects to Uvicorn / Docker backend on port 8000. Status:{" "}
                <b style={{ color: connection === "live" ? "#3e8555" : "#e35c4d" }}>
                  {connection === "live" ? "Online" : "Offline"}
                </b>
              </p>
            </label>
          </div>
        </div>
      </section>

      <aside className="method-card">
        <span className="eyebrow">Hybrid Method</span>
        <h2>How ChronoSync Solves It</h2>
        <ol>
          <li>
            <b>01</b>
            <div>
              <strong>Constrained Seeding</strong>
              <p>Locked sessions and difficult multi-slot labs are seeded first.</p>
            </div>
          </li>
          <li>
            <b>02</b>
            <div>
              <strong>Genetic Exploration</strong>
              <p>Tournament selection, student-group crossover and adaptive mutation.</p>
            </div>
          </li>
          <li>
            <b>03</b>
            <div>
              <strong>Feasibility Repair</strong>
              <p>Invalid offspring are repaired dynamically instead of discarded.</p>
            </div>
          </li>
          <li>
            <b>04</b>
            <div>
              <strong>Tabu Refinement</strong>
              <p>Local neighborhood moves optimize gaps, balance and teacher preferences.</p>
            </div>
          </li>
        </ol>

        <div style={{ marginTop: "24px" }}>
          <button className="primary-button" style={{ width: "100%" }} onClick={onRun}>
            <WandSparkles size={17} /> Run Optimiser Now
          </button>
        </div>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------
// MODALS
// ---------------------------------------------------------

function CourseModal({
  course,
  facultyList,
  uniqueGroups,
  onClose,
  onSave,
}: {
  course: Course | null;
  facultyList: Faculty[];
  uniqueGroups: string[];
  onClose: () => void;
  onSave: (c: Course) => void;
}) {
  const [code, setCode] = useState(course?.id || "");
  const [name, setName] = useState(course?.name || "");
  const [facultyId, setFacultyId] = useState(course?.faculty_id || facultyList[0]?.id || "");
  const [groupId, setGroupId] = useState(course?.group_id || uniqueGroups[0] || "Class 10-A");
  const [roomType, setRoomType] = useState<"lecture" | "lab">(course?.room_type || "lecture");
  const [capacity, setCapacity] = useState(course?.capacity || 45);
  const [weeklySessions, setWeeklySessions] = useState(course?.weekly_sessions || 3);
  const [durationSlots, setDurationSlots] = useState(course?.duration_slots || 1);
  const [color, setColor] = useState<Course["color"]>(course?.color || "blue");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      alert("Please enter subject code and title.");
      return;
    }
    onSave({
      id: code.trim().toUpperCase(),
      name: name.trim(),
      faculty_id: facultyId,
      group_id: groupId.trim(),
      room_type: roomType,
      capacity: Number(capacity) || 45,
      weekly_sessions: Number(weeklySessions) || 1,
      duration_slots: Number(durationSlots) || 1,
      color,
    });
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-box">
        <div className="modal-header">
          <h3>{course ? "Edit Subject" : "Add New Subject"}</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Subject Code</label>
                <input
                  className="form-input"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. MATH-101 or ENG"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Class / Section</label>
                <input
                  className="form-input"
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  placeholder="e.g. Class 10-A, CSE-1, Batch B"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Subject / Course Name</label>
              <input
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Mathematics, Physics, Microeconomics"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Assigned Teacher / Faculty</label>
              <select
                className="form-select"
                value={facultyId}
                onChange={(e) => setFacultyId(e.target.value)}
              >
                {facultyList.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.subject})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row three">
              <div className="form-group">
                <label className="form-label">Room Type</label>
                <select
                  className="form-select"
                  value={roomType}
                  onChange={(e) => setRoomType(e.target.value as any)}
                >
                  <option value="lecture">Classroom</option>
                  <option value="lab">Laboratory / Practical</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Periods / Week</label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  className="form-input"
                  value={weeklySessions}
                  onChange={(e) => setWeeklySessions(parseInt(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Duration</label>
                <select
                  className="form-select"
                  value={durationSlots}
                  onChange={(e) => setDurationSlots(parseInt(e.target.value))}
                >
                  <option value="1">1 period (1h)</option>
                  <option value="2">2 periods (2h Lab)</option>
                  <option value="3">3 periods (3h)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Student Capacity</label>
              <input
                type="number"
                min="10"
                max="200"
                className="form-input"
                value={capacity}
                onChange={(e) => setCapacity(parseInt(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Card Color</label>
              <div className="color-picker">
                {(["blue", "amber", "sage", "violet", "sand", "rose"] as const).map((col) => (
                  <div
                    key={col}
                    className={`color-option color-${col} ${color === col ? "selected" : ""}`}
                    onClick={() => setColor(col)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-button">
              {course ? "Save changes" : "Add subject"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FacultyModal({
  facultyMember,
  slots,
  onClose,
  onSave,
}: {
  facultyMember: Faculty | null;
  slots: { id: string; label: string }[];
  onClose: () => void;
  onSave: (f: Faculty) => void;
}) {
  const [name, setName] = useState(facultyMember?.name || "");
  const [initials, setInitials] = useState(facultyMember?.initials || "");
  const [subject, setSubject] = useState(facultyMember?.subject || "");
  const [maxDaily, setMaxDaily] = useState(facultyMember?.max_daily_sessions || 4);
  const [preferredSlots, setPreferredSlots] = useState<string[]>(facultyMember?.preferred_slots || []);
  const [tone, setTone] = useState<Faculty["tone"]>(facultyMember?.tone || "blue");

  function toggleSlot(slotId: string) {
    if (preferredSlots.includes(slotId)) {
      setPreferredSlots(preferredSlots.filter((id) => id !== slotId));
    } else {
      setPreferredSlots([...preferredSlots, slotId]);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      id: facultyMember?.id || `f-${Date.now().toString().slice(-4)}`,
      name: name.trim(),
      initials: initials.trim() || name.slice(0, 2).toUpperCase(),
      subject: subject.trim() || "General",
      preferred_slots: preferredSlots,
      unavailable_slots: facultyMember?.unavailable_slots || [],
      max_daily_sessions: Number(maxDaily) || 4,
      tone,
    });
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-box">
        <div className="modal-header">
          <h3>{facultyMember ? "Edit Teacher Profile" : "Add Teacher / Faculty"}</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Teacher's Full Name</label>
                <input
                  className="form-input"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!initials) {
                      const parts = e.target.value.split(" ");
                      setInitials(parts.map((p) => p[0]).join("").toUpperCase().slice(0, 3));
                    }
                  }}
                  placeholder="e.g. Mr. John Doe or Dr. Sarah Connor"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Initials</label>
                <input
                  className="form-input"
                  value={initials}
                  onChange={(e) => setInitials(e.target.value.toUpperCase())}
                  placeholder="e.g. JD"
                  maxLength={4}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Subject / Department</label>
                <input
                  className="form-input"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Mathematics, Physics, English"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Max Classes / Day</label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  className="form-input"
                  value={maxDaily}
                  onChange={(e) => setMaxDaily(parseInt(e.target.value))}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Preferred Teaching Slots (Click to toggle)</label>
              <div className="slot-pills">
                {slots.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`slot-pill ${preferredSlots.includes(s.id) ? "active" : ""}`}
                    onClick={() => toggleSlot(s.id)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Avatar Color Tone</label>
              <div className="color-picker">
                {(["blue", "amber", "sage", "rose", "violet"] as const).map((t) => (
                  <div
                    key={t}
                    className={`color-option color-${t} ${tone === t ? "selected" : ""}`}
                    onClick={() => setTone(t)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-button">
              {facultyMember ? "Save changes" : "Add teacher"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RoomModal({
  room,
  onClose,
  onSave,
}: {
  room: Room | null;
  onClose: () => void;
  onSave: (r: Room) => void;
}) {
  const [name, setName] = useState(room?.name || "");
  const [building, setBuilding] = useState(room?.building || "Main Wing");
  const [capacity, setCapacity] = useState(room?.capacity || 50);
  const [roomType, setRoomType] = useState<"lecture" | "lab">(room?.room_type || "lecture");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      id: room?.id || name.trim().replace(/\s+/g, "-"),
      name: name.trim(),
      building: building.trim(),
      capacity: Number(capacity) || 50,
      room_type: roomType,
    });
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-box">
        <div className="modal-header">
          <h3>{room ? "Edit Classroom" : "Add New Classroom"}</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Room Name / Number</label>
                <input
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Room 101, Science Lab 2"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Building / Block</label>
                <input
                  className="form-input"
                  value={building}
                  onChange={(e) => setBuilding(e.target.value)}
                  placeholder="e.g. Academic Block, Science Wing"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Student Capacity</label>
                <input
                  type="number"
                  min="10"
                  max="300"
                  className="form-input"
                  value={capacity}
                  onChange={(e) => setCapacity(parseInt(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Classroom Type</label>
                <select
                  className="form-select"
                  value={roomType}
                  onChange={(e) => setRoomType(e.target.value as any)}
                >
                  <option value="lecture">Standard Classroom / Lecture Hall</option>
                  <option value="lab">Computer / Science Laboratory</option>
                </select>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-button">
              {room ? "Save changes" : "Add classroom"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// IN-PLACE SESSION MODAL: Allows editing subject name, teacher name, class, or moving session!
function SessionDetailModal({
  session,
  allSessions,
  days,
  slots,
  rooms,
  facultyList,
  onClose,
  onToggleLock,
  onSaveDetails,
  onDelete,
}: {
  session: ScheduledSession;
  allSessions: ScheduledSession[];
  days: string[];
  slots: { id: string; label: string }[];
  rooms: Room[];
  facultyList: Faculty[];
  onClose: () => void;
  onToggleLock: () => void;
  onSaveDetails: (
    sessionId: string,
    updatedCourseName: string,
    updatedFacultyName: string,
    updatedGroupId: string,
    newDay: string,
    newSlotId: string,
    newRoomId: string,
  ) => void;
  onDelete: () => void;
}) {
  const [courseName, setCourseName] = useState(session.course_name);
  const [teacherName, setTeacherName] = useState(session.faculty_name);
  const [groupId, setGroupId] = useState(session.group_id);

  const [newDay, setNewDay] = useState(session.day);
  const [newSlotId, setNewSlotId] = useState(session.slot_id);
  const [newRoomId, setNewRoomId] = useState(session.room_id);

  // Live clash detection for proposed reschedule
  const conflictWarning = useMemo(() => {
    if (newDay === session.day && newSlotId === session.slot_id && newRoomId === session.room_id) {
      return null;
    }

    const collisions = allSessions.filter(
      (s) =>
        s.session_id !== session.session_id &&
        s.day === newDay &&
        s.slot_id === newSlotId &&
        (s.room_id === newRoomId ||
          s.faculty_id === session.faculty_id ||
          s.group_id === session.group_id),
    );

    if (collisions.length > 0) {
      const c = collisions[0];
      if (c.room_id === newRoomId) {
        return `Clash! Room ${c.room_name} is already booked by ${c.course_name} at this time.`;
      }
      if (c.faculty_id === session.faculty_id) {
        return `Clash! Teacher ${c.faculty_name} is already teaching ${c.course_name} at this time.`;
      }
      if (c.group_id === session.group_id) {
        return `Clash! Section ${c.group_id} has another class (${c.course_name}) at this time.`;
      }
    }
    return null;
  }, [session, allSessions, newDay, newSlotId, newRoomId]);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    onSaveDetails(
      session.session_id,
      courseName,
      teacherName,
      groupId,
      newDay,
      newSlotId,
      newRoomId,
    );
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-box large">
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h3>Edit Period: {session.course_id}</h3>
            {session.is_locked && (
              <span className="locked-indicator">
                <Lock size={11} /> Locked
              </span>
            )}
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body">
            {/* Quick in-place subject, teacher, section edit */}
            <div style={{ background: "#f8f6f0", padding: "14px", borderRadius: "10px", display: "grid", gap: "10px" }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Subject / Course Name</label>
                  <input
                    className="form-input"
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Class / Section</label>
                  <input
                    className="form-input"
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                    placeholder="e.g. Class 10-A"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Assigned Teacher's Name</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    className="form-input"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    placeholder="Enter teacher name directly"
                    style={{ flex: 1 }}
                    required
                  />
                  <select
                    className="form-select"
                    style={{ maxWidth: "200px" }}
                    value=""
                    onChange={(e) => {
                      if (e.target.value) setTeacherName(e.target.value);
                    }}
                  >
                    <option value="">Or select teacher…</option>
                    {facultyList.map((f) => (
                      <option key={f.id} value={f.name}>
                        {f.name} ({f.subject})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Pin/Lock action */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px",
                border: "1px solid var(--line-warm)",
                borderRadius: "8px",
              }}
            >
              <div>
                <strong>{session.is_locked ? "Pinned / Locked Slot" : "Dynamic Slot"}</strong>
                <p style={{ margin: "2px 0 0", fontSize: "11px", color: "var(--ink-soft)" }}>
                  {session.is_locked
                    ? "This period is anchored and will not move during re-optimisation."
                    : "Allow optimizer to freely relocate this period for optimal fit."}
                </p>
              </div>
              <button
                type="button"
                className={session.is_locked ? "btn-secondary" : "primary-button"}
                onClick={onToggleLock}
                style={{ minHeight: "34px" }}
              >
                {session.is_locked ? <Unlock size={14} /> : <Lock size={14} />}
                {session.is_locked ? "Unlock Slot" : "Lock in place"}
              </button>
            </div>

            {/* Reschedule Controls */}
            <div style={{ border: "1px solid var(--line-warm)", borderRadius: "8px", padding: "12px" }}>
              <span className="form-label">Move to a different Day, Time, or Classroom</span>
              <div className="form-row three" style={{ marginTop: "8px" }}>
                <div>
                  <label style={{ fontSize: "10px", color: "var(--ink-soft)" }}>Day</label>
                  <select
                    className="form-select"
                    value={newDay}
                    onChange={(e) => setNewDay(e.target.value)}
                  >
                    {days.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "10px", color: "var(--ink-soft)" }}>Time Slot</label>
                  <select
                    className="form-select"
                    value={newSlotId}
                    onChange={(e) => setNewSlotId(e.target.value)}
                  >
                    {slots.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "10px", color: "var(--ink-soft)" }}>Classroom / Room</label>
                  <select
                    className="form-select"
                    value={newRoomId}
                    onChange={(e) => setNewRoomId(e.target.value)}
                  >
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {conflictWarning && (
                <div
                  style={{
                    marginTop: "10px",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    background: "#fdf2f2",
                    color: "#d9534f",
                    fontSize: "11px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <AlertTriangle size={15} />
                  <span>{conflictWarning}</span>
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer" style={{ justifyContent: "space-between" }}>
            <button
              type="button"
              className="btn-danger btn-sm"
              onClick={onDelete}
            >
              <Trash2 size={13} /> Remove from timetable
            </button>
            <div style={{ display: "flex", gap: "8px" }}>
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="primary-button" disabled={!!conflictWarning}>
                Save changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// TIMETABLE WIZARD MODAL: Choose pre-made template or build custom timetable from scratch!
function TimetableWizardModal({
  currentInstName,
  currentTermName,
  onClose,
  onApplyTemplate,
  onCreateCustom,
}: {
  currentInstName: string;
  currentTermName: string;
  onClose: () => void;
  onApplyTemplate: (t: TimetableTemplate) => void;
  onCreateCustom: (data: {
    institution: string;
    term: string;
    courses: Course[];
    faculty: Faculty[];
    rooms: Room[];
  }) => void;
}) {
  const [tab, setTab] = useState<"templates" | "wizard">("templates");

  // Wizard state
  const [wizardInst, setWizardInst] = useState(currentInstName || "My Custom Academy");
  const [wizardTerm, setWizardTerm] = useState(currentTermName || "Term 1");
  const [className, setClassName] = useState("Class 10-A");

  // Custom subjects & teachers list for rapid entry
  const [subjectRows, setSubjectRows] = useState<
    Array<{ id: string; subject: string; teacher: string; periods: number; isLab: boolean }>
  >([
    { id: "1", subject: "Mathematics", teacher: "Mr. Sharma", periods: 3, isLab: false },
    { id: "2", subject: "Physics", teacher: "Ms. Verma", periods: 3, isLab: false },
    { id: "3", subject: "Chemistry Lab", teacher: "Dr. Rao", periods: 1, isLab: true },
    { id: "4", subject: "English", teacher: "Mrs. Das", periods: 3, isLab: false },
    { id: "5", subject: "Biology", teacher: "Mr. Khan", periods: 2, isLab: false },
  ]);

  function handleAddSubjectRow() {
    setSubjectRows([
      ...subjectRows,
      {
        id: Date.now().toString(),
        subject: "New Subject",
        teacher: "Teacher Name",
        periods: 2,
        isLab: false,
      },
    ]);
  }

  function handleRemoveSubjectRow(id: string) {
    if (subjectRows.length <= 1) return;
    setSubjectRows(subjectRows.filter((r) => r.id !== id));
  }

  function handleCreateFromWizard() {
    if (!wizardInst.trim() || !className.trim()) {
      alert("Please enter institution name and class name.");
      return;
    }

    // Build unique faculty from the teacher rows
    const facultyMap = new Map<string, Faculty>();
    const colorList: Course["color"][] = ["blue", "amber", "sage", "violet", "sand", "rose"];

    const builtCourses: Course[] = [];

    subjectRows.forEach((row, idx) => {
      const cleanTeacher = row.teacher.trim() || `Teacher ${idx + 1}`;
      let fId = cleanTeacher.toLowerCase().replace(/\s+/g, "-");

      if (!facultyMap.has(fId)) {
        const initials = cleanTeacher
          .split(" ")
          .map((w) => w[0])
          .join("")
          .toUpperCase()
          .slice(0, 3);

        facultyMap.set(fId, {
          id: fId,
          name: cleanTeacher,
          initials: initials || "T",
          subject: row.subject,
          preferred_slots: [],
          unavailable_slots: [],
          max_daily_sessions: 4,
          tone: (["blue", "amber", "sage", "rose", "violet"] as const)[idx % 5],
        });
      }

      const cleanCode = row.subject.slice(0, 4).toUpperCase() + `-${idx + 1}`;
      builtCourses.push({
        id: cleanCode,
        name: row.subject.trim() || "Subject",
        faculty_id: fId,
        group_id: className.trim(),
        room_type: row.isLab ? "lab" : "lecture",
        capacity: 45,
        weekly_sessions: row.periods || 2,
        duration_slots: row.isLab ? 2 : 1,
        color: colorList[idx % colorList.length],
      });
    });

    const builtRooms: Room[] = [
      { id: "R-1", name: `${className} Classroom`, capacity: 50, room_type: "lecture", building: "Main Block" },
      { id: "LAB-1", name: "Main Science / Computer Lab", capacity: 50, room_type: "lab", building: "Science Block" },
      { id: "HALL-1", name: "Lecture Hall 2", capacity: 50, room_type: "lecture", building: "Main Block" },
    ];

    onCreateCustom({
      institution: wizardInst.trim(),
      term: wizardTerm.trim(),
      faculty: Array.from(facultyMap.values()),
      courses: builtCourses,
      rooms: builtRooms,
    });
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-box large">
        <div className="modal-header">
          <h3>Custom Timetable & Templates</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Tab switch */}
        <div style={{ display: "flex", gap: "8px", padding: "12px 22px 0", borderBottom: "1px solid var(--line-warm)" }}>
          <button
            className={`view-mode-tab ${tab === "templates" ? "active" : ""}`}
            onClick={() => setTab("templates")}
          >
            Pre-made Academic Templates
          </button>
          <button
            className={`view-mode-tab ${tab === "wizard" ? "active" : ""}`}
            onClick={() => setTab("wizard")}
          >
            ⚡ Quick Setup Wizard (Build from Scratch)
          </button>
        </div>

        <div className="modal-body">
          {tab === "templates" && (
            <div>
              <p style={{ margin: "0 0 14px", fontSize: "12px", color: "var(--ink-soft)" }}>
                Select a ready-to-use template below. It will configure teachers, subjects, classrooms, and generate a clash-free schedule immediately.
              </p>

              <div className="template-grid">
                {PRESET_TEMPLATES.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className="template-card"
                    onClick={() => onApplyTemplate(tmpl)}
                  >
                    <h4>{tmpl.name}</h4>
                    <p style={{ fontWeight: 600, color: "var(--cobalt)", marginBottom: "4px" }}>
                      {tmpl.institution} · {tmpl.term}
                    </p>
                    <p>{tmpl.description}</p>
                    <div style={{ marginTop: "10px", display: "flex", gap: "6px" }}>
                      <span className="quick-chip">{tmpl.courses.length} subjects</span>
                      <span className="quick-chip">{tmpl.faculty.length} teachers</span>
                      <span className="quick-chip">{tmpl.rooms.length} rooms</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "wizard" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="form-row three">
                <div className="form-group">
                  <label className="form-label">School / College Name</label>
                  <input
                    className="form-input"
                    value={wizardInst}
                    onChange={(e) => setWizardInst(e.target.value)}
                    placeholder="e.g. Springfield High"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Term / Year</label>
                  <input
                    className="form-input"
                    value={wizardTerm}
                    onChange={(e) => setWizardTerm(e.target.value)}
                    placeholder="e.g. Session 2026-27"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Class / Section</label>
                  <input
                    className="form-input"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder="e.g. Class 10-A, Grade 9, Section B"
                    required
                  />
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span className="form-label">Subjects & Teachers for {className}</span>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={handleAddSubjectRow}
                  >
                    <Plus size={13} /> Add another subject
                  </button>
                </div>

                <table className="wizard-table">
                  <thead>
                    <tr>
                      <th>Subject Name</th>
                      <th>Teacher / Faculty Name</th>
                      <th>Weekly Periods</th>
                      <th>Class Type</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectRows.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <input
                            className="form-input"
                            style={{ height: "32px", fontSize: "12px" }}
                            value={row.subject}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSubjectRows((prev) =>
                                prev.map((r) => (r.id === row.id ? { ...r, subject: val } : r)),
                              );
                            }}
                            placeholder="e.g. Mathematics"
                          />
                        </td>
                        <td>
                          <input
                            className="form-input"
                            style={{ height: "32px", fontSize: "12px" }}
                            value={row.teacher}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSubjectRows((prev) =>
                                prev.map((r) => (r.id === row.id ? { ...r, teacher: val } : r)),
                              );
                            }}
                            placeholder="e.g. Mr. Sharma"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            max="6"
                            className="form-input"
                            style={{ height: "32px", width: "60px", fontSize: "12px" }}
                            value={row.periods}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 1;
                              setSubjectRows((prev) =>
                                prev.map((r) => (r.id === row.id ? { ...r, periods: val } : r)),
                              );
                            }}
                          />
                        </td>
                        <td>
                          <select
                            className="form-select"
                            style={{ height: "32px", fontSize: "11px" }}
                            value={row.isLab ? "lab" : "lecture"}
                            onChange={(e) => {
                              const isLab = e.target.value === "lab";
                              setSubjectRows((prev) =>
                                prev.map((r) => (r.id === row.id ? { ...r, isLab } : r)),
                              );
                            }}
                          >
                            <option value="lecture">Classroom</option>
                            <option value="lab">Lab (2 hours)</option>
                          </select>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="action-btn delete"
                            style={{ width: "24px", height: "24px" }}
                            onClick={() => handleRemoveSubjectRow(row.id)}
                            title="Remove"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          {tab === "wizard" && (
            <button
              type="button"
              className="primary-button"
              onClick={handleCreateFromWizard}
            >
              <WandSparkles size={16} /> Create & Generate Timetable
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DiagnosticsModal({
  result,
  coursesCount,
  roomsCount,
  facultyCount,
  onClose,
  onFixConstraints,
}: {
  result: ValidationResult;
  coursesCount: number;
  roomsCount: number;
  facultyCount: number;
  onClose: () => void;
  onFixConstraints: () => void;
}) {
  return (
    <div className="modal-backdrop">
      <div className="modal-box">
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ShieldCheck size={20} color={result.feasible ? "#3e8555" : "#e35c4d"} />
            <h3>Feasibility Diagnostics</h3>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div style={{ padding: "10px", background: "#f8f6f0", borderRadius: "8px" }}>
              <span className="form-label">Period Demand</span>
              <strong style={{ display: "block", fontSize: "18px", marginTop: "4px" }}>
                {result.required_slots} hours
              </strong>
              <small style={{ color: "var(--ink-soft)" }}>Across {coursesCount} subjects</small>
            </div>
            <div style={{ padding: "10px", background: "#f8f6f0", borderRadius: "8px" }}>
              <span className="form-label">Room Supply Capacity</span>
              <strong style={{ display: "block", fontSize: "18px", marginTop: "4px" }}>
                {result.available_slots} slots
              </strong>
              <small style={{ color: "var(--ink-soft)" }}>Across {roomsCount} classrooms & labs</small>
            </div>
          </div>

          <div style={{ marginTop: "8px" }}>
            {result.feasible ? (
              <div className="diag-issue-card success">
                <CheckCircle2 size={18} />
                <div>
                  <strong>Feasibility Checks Passed!</strong>
                  <p style={{ margin: "2px 0 0" }}>
                    There are sufficient room slots, room type matches, and teacher availability to generate a clash-free schedule.
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <span className="form-label" style={{ color: "#d9534f" }}>
                  Issues Detected ({result.issues.length}):
                </span>
                {result.issues.map((issue, idx) => (
                  <div key={idx} className="diag-issue-card error">
                    <AlertTriangle size={18} />
                    <span>{issue}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Dismiss
          </button>
          {!result.feasible && (
            <button className="primary-button" onClick={onFixConstraints}>
              Adjust rules & rooms
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ImportCsvModal({
  csvText,
  onChangeText,
  onClose,
  onImport,
}: {
  csvText: string;
  onChangeText: (s: string) => void;
  onClose: () => void;
  onImport: () => void;
}) {
  const sampleCsv = `code,name,faculty_id,group_id,room_type,capacity,weekly_sessions,duration_slots,color
MATH,Mathematics,f1,Class 10-A,lecture,40,3,1,blue
PHY,Physics Lab,f2,Class 10-A,lab,40,1,2,sage
ENG,English,f3,Class 10-A,lecture,40,3,1,amber`;

  function fillSample() {
    onChangeText(sampleCsv);
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-box large">
        <div className="modal-header">
          <h3>Import Subjects from CSV</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ margin: 0, fontSize: "12px", color: "var(--ink-soft)" }}>
            Paste comma-separated subject data below. Columns: <code>code, name, faculty_id, group_id, room_type, capacity, weekly_sessions, duration_slots, color</code>.
          </p>

          <textarea
            className="form-textarea"
            style={{ fontFamily: "monospace", fontSize: "11px", height: "180px" }}
            placeholder={sampleCsv}
            value={csvText}
            onChange={(e) => onChangeText(e.target.value)}
          />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={fillSample}
            >
              Fill Sample Template
            </button>
            <span style={{ fontSize: "11px", color: "var(--ink-soft)" }}>
              {csvText.trim().split("\n").length - 1 > 0
                ? `${csvText.trim().split("\n").length - 1} row(s) to import`
                : ""}
            </span>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" onClick={onImport} disabled={!csvText.trim()}>
            Import Subjects
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsModal({
  config,
  setConfig,
  engine,
  setEngine,
  connection,
  onClose,
  onResetDefaults,
}: {
  config: OptimizerConfig;
  setConfig: React.Dispatch<React.SetStateAction<OptimizerConfig>>;
  engine: "browser" | "api";
  setEngine: (e: "browser" | "api") => void;
  connection: "checking" | "live" | "offline";
  onClose: () => void;
  onResetDefaults: () => void;
}) {
  return (
    <div className="modal-backdrop">
      <div className="modal-box">
        <div className="modal-header">
          <h3>Algorithm Settings & Hyperparameters</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Population Size ({config.population_size})</label>
            <input
              type="range"
              min="16"
              max="150"
              step="4"
              value={config.population_size}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, population_size: parseInt(e.target.value) }))
              }
            />
            <small style={{ color: "var(--ink-soft)" }}>
              Number of candidate timetables evaluated in parallel.
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">Generations ({config.generations})</label>
            <input
              type="range"
              min="10"
              max="200"
              step="5"
              value={config.generations}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, generations: parseInt(e.target.value) }))
              }
            />
            <small style={{ color: "var(--ink-soft)" }}>
              Evolutionary iterations to optimize clashes and soft preferences.
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">Tabu Search Local Moves ({config.tabu_iterations})</label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={config.tabu_iterations}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, tabu_iterations: parseInt(e.target.value) }))
              }
            />
            <small style={{ color: "var(--ink-soft)" }}>
              Neighborhood moves applied to refine the best timetable.
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">Execution Engine</label>
            <select
              className="form-select"
              value={engine}
              onChange={(e) => setEngine(e.target.value as any)}
            >
              <option value="browser">In-Browser Engine (Client TypeScript)</option>
              <option value="api">FastAPI Backend (Python - {connection})</option>
            </select>
          </div>

          <div style={{ paddingTop: "8px", borderTop: "1px solid var(--line-warm)" }}>
            <button className="btn-danger btn-sm" onClick={onResetDefaults}>
              <RotateCcw size={13} /> Reset All Data & Rules to Factory Default
            </button>
          </div>
        </div>

        <div className="modal-footer">
          <button className="primary-button" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
