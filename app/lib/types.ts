export type TimeSlot = {
  id: string;
  label: string;
};

export type Room = {
  id: string;
  name: string;
  capacity: number;
  room_type: "lecture" | "lab";
  building: string;
};

export type Faculty = {
  id: string;
  name: string;
  initials: string;
  subject: string;
  preferred_slots: string[];
  unavailable_slots: string[];
  max_daily_sessions: number;
  tone: "blue" | "amber" | "rose" | "sage" | "violet";
};

export type Course = {
  id: string;
  name: string;
  faculty_id: string;
  group_id: string;
  room_type: "lecture" | "lab";
  capacity: number;
  weekly_sessions: number;
  duration_slots: number;
  color: "blue" | "amber" | "sage" | "violet" | "sand" | "rose";
};

export type OptimizerConfig = {
  population_size: number;
  generations: number;
  mutation_rate: number;
  elite_size: number;
  tournament_size: number;
  tabu_iterations: number;
  seed: number;
};

export type ConstraintSetting = {
  id: string;
  name: string;
  detail: string;
  hard: boolean;
  enabled: boolean;
  weight: number;
};

export type ScheduledSession = {
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
  is_locked?: boolean;
};

export type ScheduleMetrics = {
  hard_conflicts: number;
  soft_penalty: number;
  preference_fit: number;
  room_utilisation: number;
  scheduled_sessions: number;
  unassigned_sessions: number;
};

export type RunMeta = {
  algorithm: string;
  generations: number;
  tabu_iterations: number;
  seed: number;
  convergence: number[];
  execution_ms: number;
  engine: "browser" | "api";
};

export type ScheduleResponse = {
  institution: string;
  term: string;
  status: "feasible" | "needs_review" | "infeasible";
  sessions: ScheduledSession[];
  metrics: ScheduleMetrics;
  run: RunMeta;
  warnings: string[];
};

export type ValidationResult = {
  feasible: boolean;
  issues: string[];
  required_slots: number;
  available_slots: number;
};
