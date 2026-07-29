from fastapi.testclient import TestClient

from app.main import app
from app.optimizer import HybridScheduler
from app.sample_data import sample_request


def test_sample_schedule_is_feasible():
    result = HybridScheduler(sample_request()).run()
    assert result.metrics.hard_conflicts == 0
    assert result.metrics.unassigned_sessions == 0
    assert len(result.sessions) == sum(
        course.weekly_sessions for course in sample_request().courses
    )


def test_no_double_booked_resources():
    result = HybridScheduler(sample_request()).run()
    occupied = set()
    request = sample_request()
    slot_index = {slot.id: index for index, slot in enumerate(request.slots)}
    for session in result.sessions:
        start = slot_index[session.slot_id]
        for offset in range(session.duration_slots):
            for key in (
                ("room", session.day, start + offset, session.room_id),
                ("faculty", session.day, start + offset, session.faculty_id),
                ("group", session.day, start + offset, session.group_id),
            ):
                assert key not in occupied
                occupied.add(key)


def test_api_health_and_generation():
    client = TestClient(app)
    assert client.get("/api/v1/health").json()["status"] == "ok"
    payload = sample_request().model_dump(mode="json")
    response = client.post("/api/v1/schedules/generate", json=payload)
    assert response.status_code == 200
    assert response.json()["status"] == "feasible"
