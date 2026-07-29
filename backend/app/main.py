from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .models import ScheduleRequest, ScheduleResponse, ValidationResponse
from .optimizer import HybridScheduler, validate_capacity
from .sample_data import sample_request

app = FastAPI(
    title="ChronoSync API",
    version="1.0.0",
    description="Constraint-aware university timetable optimisation API.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:4173"],
    allow_origin_regex=r"https://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/v1/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "chronosync-api"}


@app.get("/api/v1/sample", response_model=ScheduleRequest)
def sample() -> ScheduleRequest:
    return sample_request()


@app.post("/api/v1/schedules/validate", response_model=ValidationResponse)
def validate_schedule(request: ScheduleRequest) -> ValidationResponse:
    feasible, issues, required, available = validate_capacity(request)
    return ValidationResponse(
        feasible_on_basic_capacity=feasible,
        issues=issues,
        required_session_slots=required,
        available_room_slots=available,
    )


@app.post("/api/v1/schedules/generate", response_model=ScheduleResponse)
def generate_schedule(request: ScheduleRequest) -> ScheduleResponse:
    return HybridScheduler(request).run()
