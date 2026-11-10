from __future__ import annotations

from pydantic import BaseModel, Field, model_validator


class TimeSlot(BaseModel):
    id: str
    label: str


class Room(BaseModel):
    id: str
    name: str
    capacity: int = Field(gt=0)
    room_type: str = "lecture"
    building: str = "Main"


class Faculty(BaseModel):
    id: str
    name: str
    preferred_slots: list[str] = Field(default_factory=list)
    unavailable_slots: list[str] = Field(default_factory=list)
    max_daily_sessions: int = Field(default=4, ge=1)


class Course(BaseModel):
    id: str
    name: str
    faculty_id: str
    group_id: str
    room_type: str = "lecture"
    capacity: int = Field(gt=0)
    weekly_sessions: int = Field(default=2, ge=1)
    duration_slots: int = Field(default=1, ge=1, le=3)
    color: str = "blue"


class OptimizerConfig(BaseModel):
    population_size: int = Field(default=48, ge=12, le=300)
    generations: int = Field(default=55, ge=5, le=500)
    mutation_rate: float = Field(default=0.18, ge=0.01, le=0.8)
    elite_size: int = Field(default=4, ge=1, le=20)
    tournament_size: int = Field(default=4, ge=2, le=20)
    tabu_iterations: int = Field(default=35, ge=0, le=500)
    seed: int = 42


class LockedSession(BaseModel):
    session_id: str
    day: str
    slot_id: str
    room_id: str


class ScheduleRequest(BaseModel):
    institution: str = "Demo University"
    term: str = "Odd 2026"
    days: list[str]
    slots: list[TimeSlot]
    rooms: list[Room]
    faculty: list[Faculty]
    courses: list[Course]
    locked_sessions: list[LockedSession] = Field(default_factory=list)
    config: OptimizerConfig = Field(default_factory=OptimizerConfig)

    @model_validator(mode="after")
    def validate_references(self) -> "ScheduleRequest":
        faculty_ids = {item.id for item in self.faculty}
        if missing := {course.faculty_id for course in self.courses} - faculty_ids:
            raise ValueError(f"Unknown faculty references: {sorted(missing)}")
        if len(set(self.days)) != len(self.days):
            raise ValueError("Day names must be unique")
        slot_ids = [slot.id for slot in self.slots]
        if len(set(slot_ids)) != len(slot_ids):
            raise ValueError("Slot ids must be unique")
        if not self.rooms or not self.courses or not self.days or not self.slots:
            raise ValueError("Days, slots, rooms and courses cannot be empty")
        return self


class ScheduledSession(BaseModel):
    session_id: str
    course_id: str
    course_name: str
    faculty_id: str
    faculty_name: str
    group_id: str
    day: str
    slot_id: str
    slot_label: str
    room_id: str
    room_name: str
    duration_slots: int
    color: str
    is_locked: bool = False


class ScheduleMetrics(BaseModel):
    hard_conflicts: int
    soft_penalty: float
    preference_fit: float
    room_utilisation: float
    scheduled_sessions: int
    unassigned_sessions: int


class RunMeta(BaseModel):
    algorithm: str
    generations: int
    tabu_iterations: int
    seed: int
    convergence: list[float]


class ScheduleResponse(BaseModel):
    institution: str
    term: str
    status: str
    sessions: list[ScheduledSession]
    metrics: ScheduleMetrics
    run: RunMeta
    warnings: list[str] = Field(default_factory=list)


class ValidationResponse(BaseModel):
    feasible_on_basic_capacity: bool
    issues: list[str]
    required_session_slots: int
    available_room_slots: int
