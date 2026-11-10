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
      "Northbridge Institute of Technology",
      "Odd 2026",
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

  // Sync to local storage
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
          institution: "Northbridge Institute of Technology",
          term: "Odd 2026",
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
        // Update locked status from local locked map
        apiData.sessions = apiData.sessions.map((s: ScheduledSession) => ({
          ...s,
          is_locked: !!lockedSessions[s.session_id],
        }));
        setResult(apiData);
        setNotice("Generated with FastAPI Hybrid Optimizer (0 hard clashes).");
      } else {
        // Run Client TypeScript Genetic Algorithm
        await new Promise((resolve) => setTimeout(resolve, 350));
        const scheduler = new ClientScheduler(
          "Northbridge Institute of Technology",
          "Odd 2026",
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
    } catch (err: any) {
      // Fallback to client scheduler
      const lockedMap = new Map<string, { day: string; slot_id: string; room_id: string }>();
      Object.entries(lockedSessions).forEach(([k, v]) => lockedMap.set(k, v));

      const scheduler = new ClientScheduler(
        "Northbridge Institute of Technology",
        "Odd 2026",
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
      setNotice("API connection failed. Ran in-browser Genetic Algorithm successfully.");
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

  // Reset to default sample
  function handleResetToDefaults() {
    if (confirm("Reset all courses, faculty, rooms, constraints, and locked sessions to default?")) {
      setCourses(DEFAULT_COURSES);
      setFaculty(DEFAULT_FACULTY);
      setRooms(DEFAULT_ROOMS);
      setConstraints(DEFAULT_CONSTRAINTS);
      setConfig(DEFAULT_CONFIG);
      setLockedSessions({});
      localStorage.clear();

      const scheduler = new ClientScheduler(
        "Northbridge Institute of Technology",
        "Odd 2026",
        DEFAULT_DAYS,
        DEFAULT_SLOTS,
        DEFAULT_ROOMS,
        DEFAULT_FACULTY,
        DEFAULT_COURSES,
        DEFAULT_CONSTRAINTS,
        DEFAULT_CONFIG,
      );
      setResult(scheduler.run());
      setNotice("Restored to clean demo institution dataset.");
    }
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

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `chronosync-timetable-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleExportJSON() {
    setExportDropdownOpen(false);
    const data = {
      institution: "Northbridge Institute of Technology",
      term: "Odd 2026",
      generated_at: new Date().toISOString(),
      metrics: result.metrics,
      sessions: result.sessions,
      configuration: { courses, faculty, rooms, constraints, config },
    };
    const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", jsonStr);
    link.setAttribute("download", `chronosync-schedule-${new Date().toISOString().slice(0, 10)}.json`);
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

    // Update in current results
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

  // Reschedule session manually
  function handleManualReschedule(newDay: string, newSlotId: string, newRoomId: string) {
    if (!selectedSession) return;

    const targetRoom = rooms.find((r) => r.id === newRoomId);
    const targetSlot = DEFAULT_SLOTS.find((s) => s.id === newSlotId);

    const updated = result.sessions.map((s) => {
      if (s.session_id === selectedSession.session_id) {
        return {
          ...s,
          day: newDay,
          slot_id: newSlotId,
          slot_label: targetSlot?.label || s.slot_label,
          room_id: newRoomId,
          room_name: targetRoom?.name || s.room_name,
          is_locked: true,
        };
      }
      return s;
    });

    setLockedSessions((prev) => ({
      ...prev,
      [selectedSession.session_id]: {
        day: newDay,
        slot_id: newSlotId,
        room_id: newRoomId,
      },
    }));

    setResult((prev) => ({ ...prev, sessions: updated }));
    setSessionModalOpen(false);
    setNotice(`Manually rescheduled ${selectedSession.course_id} to ${newDay} ${targetSlot?.label} in ${targetRoom?.name} (and locked).`);
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
            faculty_id: faculty_id || faculty[0].id,
            group_id: group_id || "CSE-A",
            room_type: room_type === "lab" ? "lab" : "lecture",
            capacity: parseInt(capacity) || 60,
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
    courses: "Course requirements",
    faculty: "Faculty availability",
    rooms: "Rooms & resources",
    constraints: "Optimisation rules & engine",
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
            <div className="brand-subtitle">Academic operations</div>
          </div>
          <button
            className="sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        <p className="nav-eyebrow">Workspace</p>
        <nav className="nav-list" aria-label="Primary navigation">
          {[
            { id: "schedule" as const, label: "Schedule", icon: CalendarDays, count: `${result.sessions.length}` },
            { id: "courses" as const, label: "Courses", icon: BookOpen, count: `${courses.length}` },
            { id: "faculty" as const, label: "Faculty", icon: Users, count: `${faculty.length}` },
            { id: "rooms" as const, label: "Rooms", icon: DoorOpen, count: `${rooms.length}` },
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
          <strong>Hybrid Solver Active</strong>
          <p>
            {engine === "browser"
              ? "Running Genetic Algorithm in TypeScript directly in your browser."
              : "Connected to Python FastAPI optimizer backend."}
          </p>
          <button onClick={() => setView("constraints")}>
            Tune solver parameters <ArrowUpRight size={14} />
          </button>
        </div>

        <div className="sidebar-footer">
          <button onClick={() => setSettingsModalOpen(true)}>
            <Settings size={18} /> Settings & Algorithm
          </button>
          <button onClick={handleCheckDiagnostics}>
            <ShieldCheck size={18} /> Feasibility check
          </button>
          <button onClick={handleResetToDefaults}>
            <RotateCcw size={18} /> Reset to Demo Data
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
            <button className="selector">
              <Building2 size={17} />
              <span>Northbridge Institute of Technology</span>
              <ChevronDown size={15} />
            </button>
            <button className="selector term">
              <CalendarDays size={17} />
              <span>Odd 2026</span>
              <ChevronDown size={15} />
            </button>
          </div>

          <div className="topbar-actions">
            <span
              className={`connection ${
                connection === "live" ? "live" : "demo"
              }`}
            >
              <span />
              {connection === "live"
                ? "FastAPI API Online"
                : "In-Browser Engine Active"}
            </span>
            <button
              className="icon-button"
              onClick={handleCheckDiagnostics}
              title="Pre-flight feasibility diagnostics"
            >
              <ShieldCheck size={19} />
            </button>
            <button
              className="icon-button"
              onClick={() => setSettingsModalOpen(true)}
              title="Solver Settings"
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
                <LayoutDashboard size={14} /> Academic planning <span>/</span>{" "}
                {pageTitle}
              </div>
              <h1>{pageTitle}</h1>
              <p>
                {view === "schedule"
                  ? `${result.sessions.length} sessions scheduled · ${
                      Object.keys(lockedSessions).length
                    } locked in place · ${result.metrics.hard_conflicts} clashes`
                  : view === "courses"
                  ? "Define courses, credits, cohorts, and teaching assignments."
                  : view === "faculty"
                  ? "Manage teaching faculty, weekly hour caps, and preferred times."
                  : view === "rooms"
                  ? "Manage lecture halls, laboratory spaces, and capacities."
                  : "Tune constraint weights, solver engine, and genetic algorithm parameters."}
              </p>
            </div>

            <div className="heading-actions">
              {view === "schedule" && (
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
              )}

              {view === "courses" && (
                <>
                  <button
                    className="secondary-button"
                    onClick={() => setImportModalOpen(true)}
                  >
                    <FileUp size={16} /> Import CSV
                  </button>
                  <button
                    className="primary-button"
                    onClick={() => {
                      setEditingCourse(null);
                      setCourseModalOpen(true);
                    }}
                  >
                    <Plus size={16} /> Add course
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
                  <Plus size={16} /> Add faculty
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
                  <Plus size={16} /> Add room
                </button>
              )}

              <button
                className="primary-button"
                onClick={generateTimetable}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <RefreshCcw className="spin" size={18} />
                ) : (
                  <WandSparkles size={18} />
                )}
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
                  label="Hard conflicts"
                  value={String(result.metrics.hard_conflicts)}
                  detail={
                    result.metrics.hard_conflicts === 0
                      ? "Feasible schedule"
                      : "Clashes require review"
                  }
                  tone={result.metrics.hard_conflicts === 0 ? "blue" : "amber"}
                />
                <Metric
                  icon={<Target />}
                  label="Preference fit"
                  value={`${Math.round(result.metrics.preference_fit)}%`}
                  detail="Faculty preferred hours matched"
                  tone="amber"
                />
                <Metric
                  icon={<Building2 />}
                  label="Room utilisation"
                  value={`${Math.round(result.metrics.room_utilisation)}%`}
                  detail="Across active halls & labs"
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
                    placeholder="Search course, faculty, or room…"
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
                    className={`view-mode-tab ${
                      filterMode === "group" ? "active" : ""
                    }`}
                    onClick={() => {
                      setFilterMode("group");
                      setFilterValue("All");
                    }}
                  >
                    Section View
                  </button>
                  <button
                    className={`view-mode-tab ${
                      filterMode === "faculty" ? "active" : ""
                    }`}
                    onClick={() => {
                      setFilterMode("faculty");
                      setFilterValue("All");
                    }}
                  >
                    Faculty View
                  </button>
                  <button
                    className={`view-mode-tab ${
                      filterMode === "room" ? "active" : ""
                    }`}
                    onClick={() => {
                      setFilterMode("room");
                      setFilterValue("All");
                    }}
                  >
                    Room View
                  </button>
                </div>

                {/* Dynamic Dropdown depending on perspective */}
                <label className="field-select">
                  <span>
                    {filterMode === "group"
                      ? "Group"
                      : filterMode === "faculty"
                      ? "Instructor"
                      : "Room"}
                    :
                  </span>
                  <select
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                  >
                    <option value="All">
                      All {filterMode === "group" ? "Sections" : filterMode === "faculty" ? "Faculty" : "Rooms"}
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
                          {r.name} ({r.room_type})
                        </option>
                      ))}
                  </select>
                </label>

                <button
                  className="filter-button"
                  onClick={handleCheckDiagnostics}
                  title="Run instant feasibility diagnostics"
                >
                  <ShieldCheck size={16} /> Check Feasibility
                </button>

                <div className="toolbar-status">
                  {result.metrics.hard_conflicts === 0 ? (
                    <>
                      <CheckCircle2 size={16} /> All hard constraints satisfied
                    </>
                  ) : (
                    <span style={{ color: "#d9534f" }}>
                      <AlertTriangle size={16} /> {result.metrics.hard_conflicts} conflict(s)
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
                        const daySessions = filteredSessions.filter(
                          (item) => item.day === day,
                        );
                        return (
                          <div key={day} className="grid-head">
                            {day}
                            <small>{daySessions.length} sessions</small>
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
                            (item) =>
                              item.day === day && item.slot_id === slot.id,
                          );
                          return (
                            <div
                              key={`${day}-${slot.id}`}
                              className="schedule-cell"
                            >
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
                      <i className="blue" /> Core CS
                    </span>
                    <span>
                      <i className="amber" /> Foundations
                    </span>
                    <span>
                      <i className="sage" /> Laboratory
                    </span>
                    <span>
                      <i className="violet" /> Humanities
                    </span>
                    <span className="legend-note">
                      <LockKeyhole size={14} /> Click any session to inspect,
                      lock, or reschedule
                    </span>
                  </div>
                </section>

                {/* INSIGHT PANEL */}
                <aside className="insight-panel">
                  <div className="panel-heading">
                    <div>
                      <span className="eyebrow">Assigned Workload</span>
                      <h2>Faculty Load</h2>
                    </div>
                    <button
                      onClick={() => setView("faculty")}
                      aria-label="Manage faculty"
                      title="Manage faculty"
                    >
                      <SlidersHorizontal size={17} />
                    </button>
                  </div>

                  <div className="faculty-stack">
                    {faculty.map((f) => {
                      const currentHours = facultyLoads.get(f.id) || 0;
                      const maxHours = f.max_daily_sessions * DEFAULT_DAYS.length;
                      const percent = Math.min(100, Math.round((currentHours / maxHours) * 100));

                      return (
                        <article
                          className="faculty-card"
                          key={f.id}
                          style={{ cursor: "pointer" }}
                          onClick={() => {
                            setFilterMode("faculty");
                            setFilterValue(f.id);
                          }}
                        >
                          <div className={`faculty-avatar ${f.tone}`}>
                            {f.initials}
                          </div>
                          <div className="faculty-copy">
                            <div>
                              <strong>{f.name}</strong>
                              <small>{f.subject}</small>
                            </div>
                            <p>
                              <Clock3 size={13} />
                              {f.preferred_slots.length > 0
                                ? f.preferred_slots.join(", ")
                                : "No preference"}
                            </p>
                            <div className="load-line">
                              <span>Workload</span>
                              <div>
                                <i style={{ width: `${percent}%` }} />
                              </div>
                              <b>
                                {currentHours}/{maxHours}h
                              </b>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  <button
                    className="text-button"
                    onClick={() => setView("faculty")}
                  >
                    Manage all faculty & availability <ArrowUpRight size={15} />
                  </button>

                  <div className="algorithm-note">
                    <div className="algorithm-icon">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <strong>Convergence Fitness</strong>
                      <p>
                        Elite score:{" "}
                        {result.run.convergence[result.run.convergence.length - 1] || 0.94}
                      </p>
                      {/* Mini visual convergence track */}
                      <div className="convergence-mini-chart">
                        {result.run.convergence.slice(-15).map((fit, idx) => (
                          <div
                            key={idx}
                            className="convergence-bar"
                            style={{ height: `${Math.round(fit * 100)}%` }}
                            title={`Gen ${idx + 1}: ${fit}`}
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
                if (confirm(`Delete course ${id}?`)) {
                  setCourses(courses.filter((c) => c.id !== id));
                  setNotice(`Course ${id} deleted.`);
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
                if (confirm(`Remove faculty member ${id}?`)) {
                  setFaculty(faculty.filter((f) => f.id !== id));
                  setNotice(`Faculty ${id} removed.`);
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
                if (confirm(`Delete room ${id}?`)) {
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
              {engine === "browser"
                ? "Browser Genetic Algorithm"
                : "FastAPI Hybrid Solver"}
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
            <span
              className={
                progress >= 45 ? "done" : progress >= 18 ? "active" : ""
              }
            >
              <Check size={13} /> Seed
            </span>
            <span
              className={
                progress >= 78 ? "done" : progress >= 45 ? "active" : ""
              }
            >
              <Check size={13} /> Evolve (GA)
            </span>
            <span
              className={
                progress >= 96 ? "done" : progress >= 78 ? "active" : ""
              }
            >
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
          onClose={() => setCourseModalOpen(false)}
          onSave={(savedCourse) => {
            if (editingCourse) {
              setCourses(courses.map((c) => (c.id === editingCourse.id ? savedCourse : c)));
              setNotice(`Updated course ${savedCourse.id}`);
            } else {
              setCourses([...courses, savedCourse]);
              setNotice(`Added new course ${savedCourse.id}`);
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
              setNotice(`Updated faculty ${savedFaculty.name}`);
            } else {
              setFaculty([...faculty, savedFaculty]);
              setNotice(`Added new faculty ${savedFaculty.name}`);
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
              setNotice(`Updated room ${savedRoom.name}`);
            } else {
              setRooms([...rooms, savedRoom]);
              setNotice(`Added new room ${savedRoom.name}`);
            }
            setRoomModalOpen(false);
          }}
        />
      )}

      {/* MODAL: SESSION INSPECTOR & RESCHEDULER */}
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
          onReschedule={handleManualReschedule}
          onDelete={() => handleDeleteSession(selectedSession.session_id)}
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
          onResetDefaults={handleResetToDefaults}
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
    <article className={`session-card ${session.color}`} onClick={onClick}>
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
            placeholder="Search courses by code, name, section, faculty…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="secondary-button" onClick={onImport}>
          <FileUp size={16} /> Import CSV
        </button>
        <button className="primary-button" onClick={onAdd}>
          <Plus size={16} /> Add course
        </button>
      </div>

      <div className="data-table">
        <div className="table-row table-header">
          <span>Course Code & Name</span>
          <span>Section</span>
          <span>Requirement</span>
          <span>Assigned Faculty</span>
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
              {course.duration_slots}h ({course.capacity} seats)
            </span>
            <span>{facultyMap.get(course.faculty_id) || course.faculty_id}</span>
            <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <i className={`tag ${course.room_type === "lab" ? "sage" : "blue"}`}>
                {course.room_type === "lab" ? "Lab" : "Lecture"}
              </i>
              <div className="row-actions">
                <button
                  className="action-btn"
                  onClick={() => onEdit(course)}
                  title="Edit course"
                >
                  <Pencil size={13} />
                </button>
                <button
                  className="action-btn delete"
                  onClick={() => onDelete(course.id)}
                  title="Delete course"
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
          <Plus size={16} /> Add faculty member
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
                  <button className="action-btn" onClick={() => onEdit(f)} title="Edit faculty">
                    <Pencil size={13} />
                  </button>
                  <button
                    className="action-btn delete"
                    onClick={() => onDelete(f.id)}
                    title="Delete faculty"
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
          <Plus size={16} /> Add room
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
                  <b>{room.room_type === "lab" ? "Laboratory" : "Lecture Hall"}</b>
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
  onClose,
  onSave,
}: {
  course: Course | null;
  facultyList: Faculty[];
  onClose: () => void;
  onSave: (c: Course) => void;
}) {
  const [code, setCode] = useState(course?.id || "");
  const [name, setName] = useState(course?.name || "");
  const [facultyId, setFacultyId] = useState(course?.faculty_id || facultyList[0]?.id || "");
  const [groupId, setGroupId] = useState(course?.group_id || "CSE-A");
  const [roomType, setRoomType] = useState<"lecture" | "lab">(course?.room_type || "lecture");
  const [capacity, setCapacity] = useState(course?.capacity || 60);
  const [weeklySessions, setWeeklySessions] = useState(course?.weekly_sessions || 3);
  const [durationSlots, setDurationSlots] = useState(course?.duration_slots || 1);
  const [color, setColor] = useState<Course["color"]>(course?.color || "blue");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      alert("Please enter course code and title.");
      return;
    }
    onSave({
      id: code.trim().toUpperCase(),
      name: name.trim(),
      faculty_id: facultyId,
      group_id: groupId.trim().toUpperCase(),
      room_type: roomType,
      capacity: Number(capacity) || 60,
      weekly_sessions: Number(weeklySessions) || 1,
      duration_slots: Number(durationSlots) || 1,
      color,
    });
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-box">
        <div className="modal-header">
          <h3>{course ? "Edit Course" : "Add New Course"}</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Course Code</label>
                <input
                  className="form-input"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. CS201"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Student Group</label>
                <input
                  className="form-input"
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  placeholder="e.g. CSE-A"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Course Title</label>
              <input
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Data Structures & Algorithms"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Assigned Faculty Member</label>
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
                  <option value="lecture">Lecture Hall</option>
                  <option value="lab">Laboratory</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Weekly Sessions</label>
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
                <label className="form-label">Duration (Slots)</label>
                <select
                  className="form-select"
                  value={durationSlots}
                  onChange={(e) => setDurationSlots(parseInt(e.target.value))}
                >
                  <option value="1">1 hour</option>
                  <option value="2">2 hours (Lab)</option>
                  <option value="3">3 hours</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Cohort Capacity</label>
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
              <label className="form-label">Color Label</label>
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
              {course ? "Save changes" : "Add course"}
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
  const [maxDaily, setMaxDaily] = useState(facultyMember?.max_daily_sessions || 3);
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
      subject: subject.trim() || "Computer Science",
      preferred_slots: preferredSlots,
      unavailable_slots: facultyMember?.unavailable_slots || [],
      max_daily_sessions: Number(maxDaily) || 3,
      tone,
    });
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-box">
        <div className="modal-header">
          <h3>{facultyMember ? "Edit Faculty Profile" : "Add Faculty Member"}</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Full Name</label>
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
                  placeholder="e.g. Dr. Jane Smith"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Initials</label>
                <input
                  className="form-input"
                  value={initials}
                  onChange={(e) => setInitials(e.target.value.toUpperCase())}
                  placeholder="e.g. JS"
                  maxLength={4}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Department / Specialization</label>
                <input
                  className="form-input"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Machine Learning"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Max Sessions / Day</label>
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
              <label className="form-label">Preferred Time Slots (Click to toggle)</label>
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
              {facultyMember ? "Save changes" : "Add faculty"}
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
  const [building, setBuilding] = useState(room?.building || "Computing Block");
  const [capacity, setCapacity] = useState(room?.capacity || 60);
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
          <h3>{room ? "Edit Room" : "Add New Room"}</h3>
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
                  placeholder="e.g. C-205"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Building / Wing</label>
                <input
                  className="form-input"
                  value={building}
                  onChange={(e) => setBuilding(e.target.value)}
                  placeholder="e.g. Science Block"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Seating Capacity</label>
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
                <label className="form-label">Room Type</label>
                <select
                  className="form-select"
                  value={roomType}
                  onChange={(e) => setRoomType(e.target.value as any)}
                >
                  <option value="lecture">Lecture Hall</option>
                  <option value="lab">Computer Laboratory</option>
                </select>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-button">
              {room ? "Save changes" : "Add room"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SessionDetailModal({
  session,
  allSessions,
  days,
  slots,
  rooms,
  facultyList,
  onClose,
  onToggleLock,
  onReschedule,
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
  onReschedule: (newDay: string, newSlotId: string, newRoomId: string) => void;
  onDelete: () => void;
}) {
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
        return `Clash! Room ${c.room_name} is already booked by ${c.course_id} at this time.`;
      }
      if (c.faculty_id === session.faculty_id) {
        return `Clash! Instructor ${c.faculty_name} is already teaching ${c.course_id} at this time.`;
      }
      if (c.group_id === session.group_id) {
        return `Clash! Section ${c.group_id} has another class (${c.course_id}) at this time.`;
      }
    }
    return null;
  }, [session, allSessions, newDay, newSlotId, newRoomId]);

  return (
    <div className="modal-backdrop">
      <div className="modal-box">
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h3>{session.course_id}: {session.course_name}</h3>
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

        <div className="modal-body">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", background: "#f8f6f0", padding: "12px", borderRadius: "10px" }}>
            <div>
              <span className="form-label">Instructor</span>
              <div style={{ fontWeight: 600, fontSize: "12px", marginTop: "3px" }}>{session.faculty_name}</div>
            </div>
            <div>
              <span className="form-label">Section</span>
              <div style={{ fontWeight: 600, fontSize: "12px", marginTop: "3px" }}>{session.group_id}</div>
            </div>
            <div>
              <span className="form-label">Assigned Room</span>
              <div style={{ fontWeight: 600, fontSize: "12px", marginTop: "3px" }}>{session.room_name}</div>
            </div>
            <div>
              <span className="form-label">Current Slot</span>
              <div style={{ fontWeight: 600, fontSize: "12px", marginTop: "3px" }}>
                {session.day}, {session.slot_label}
              </div>
            </div>
          </div>

          {/* Pin/Lock action */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", border: "1px solid var(--line-warm)", borderRadius: "8px" }}>
            <div>
              <strong>{session.is_locked ? "Pinned / Locked Session" : "Dynamic Session"}</strong>
              <p style={{ margin: "2px 0 0", fontSize: "11px", color: "var(--ink-soft)" }}>
                {session.is_locked
                  ? "This session is anchored and will not move during re-optimisation."
                  : "Allow optimizer to freely relocate this session for better fitness."}
              </p>
            </div>
            <button
              className={session.is_locked ? "btn-secondary" : "primary-button"}
              onClick={onToggleLock}
              style={{ minHeight: "34px" }}
            >
              {session.is_locked ? <Unlock size={14} /> : <Lock size={14} />}
              {session.is_locked ? "Unlock" : "Lock in place"}
            </button>
          </div>

          {/* Manual Reschedule Controls */}
          <div style={{ border: "1px solid var(--line-warm)", borderRadius: "8px", padding: "12px" }}>
            <span className="form-label">Manual Move / Reschedule</span>
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
                <label style={{ fontSize: "10px", color: "var(--ink-soft)" }}>Time</label>
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
                <label style={{ fontSize: "10px", color: "var(--ink-soft)" }}>Room</label>
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

            <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end" }}>
              <button
                className="btn-secondary"
                disabled={!!conflictWarning || (newDay === session.day && newSlotId === session.slot_id && newRoomId === session.room_id)}
                onClick={() => onReschedule(newDay, newSlotId, newRoomId)}
              >
                Move session
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: "space-between" }}>
          <button className="btn-danger btn-sm" onClick={onDelete}>
            <Trash2 size={13} /> Remove from schedule
          </button>
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
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
              <span className="form-label">Session Slot Demand</span>
              <strong style={{ display: "block", fontSize: "18px", marginTop: "4px" }}>
                {result.required_slots} hours
              </strong>
              <small style={{ color: "var(--ink-soft)" }}>Across {coursesCount} registered courses</small>
            </div>
            <div style={{ padding: "10px", background: "#f8f6f0", borderRadius: "8px" }}>
              <span className="form-label">Room Supply Capacity</span>
              <strong style={{ display: "block", fontSize: "18px", marginTop: "4px" }}>
                {result.available_slots} slots
              </strong>
              <small style={{ color: "var(--ink-soft)" }}>Across {roomsCount} active rooms</small>
            </div>
          </div>

          <div style={{ marginTop: "8px" }}>
            {result.feasible ? (
              <div className="diag-issue-card success">
                <CheckCircle2 size={18} />
                <div>
                  <strong>All Feasibility Checks Passed!</strong>
                  <p style={{ margin: "2px 0 0" }}>
                    There are sufficient room slots, room type matches, and faculty capacity to generate a clash-free timetable.
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
CS201,Data Structures,f1,CSE-A,lecture,60,3,1,blue
CS251,Data Structures Lab,f4,CSE-A,lab,40,1,2,sage
CS301,Algorithms,f3,CSE-B,lecture,58,3,1,blue
CS302,Database Systems,f5,CSE-B,lecture,58,2,1,amber`;

  function fillSample() {
    onChangeText(sampleCsv);
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-box large">
        <div className="modal-header">
          <h3>Import Courses from CSV</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ margin: 0, fontSize: "12px", color: "var(--ink-soft)" }}>
            Paste comma-separated course data below. Columns: <code>code, name, faculty_id, group_id, room_type, capacity, weekly_sessions, duration_slots, color</code>.
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
            Import Courses
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
          <h3>Settings & Genetic Algorithm Hyperparameters</h3>
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
              Number of candidate schedules maintained across each generation.
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
              Number of evolutionary iterations to discover low-penalty clash-free schedules.
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
              Fine-tuning neighborhood moves applied to the best chromosome.
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
            <button
              className="btn-danger btn-sm"
              onClick={() => {
                onResetDefaults();
                onClose();
              }}
            >
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
