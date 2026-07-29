from .models import Course, Faculty, OptimizerConfig, Room, ScheduleRequest, TimeSlot


def sample_request() -> ScheduleRequest:
    return ScheduleRequest(
        institution="Northbridge Institute of Technology",
        term="Odd Semester 2026",
        days=["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        slots=[
            TimeSlot(id="08:00", label="08:00 - 09:00"),
            TimeSlot(id="09:00", label="09:00 - 10:00"),
            TimeSlot(id="10:15", label="10:15 - 11:15"),
            TimeSlot(id="11:15", label="11:15 - 12:15"),
            TimeSlot(id="13:00", label="13:00 - 14:00"),
            TimeSlot(id="14:00", label="14:00 - 15:00"),
        ],
        rooms=[
            Room(id="C-203", name="C-203", capacity=72, room_type="lecture", building="Computing"),
            Room(id="C-204", name="C-204", capacity=64, room_type="lecture", building="Computing"),
            Room(id="M-101", name="M-101", capacity=80, room_type="lecture", building="Main"),
            Room(id="CS-L1", name="CS Lab 1", capacity=42, room_type="lab", building="Computing"),
            Room(id="CS-L2", name="CS Lab 2", capacity=42, room_type="lab", building="Computing"),
        ],
        faculty=[
            Faculty(id="f1", name="Dr. A. Sharma", preferred_slots=["08:00", "09:00", "10:15"], max_daily_sessions=3),
            Faculty(id="f2", name="Dr. R. Verma", preferred_slots=["08:00", "09:00", "11:15"], max_daily_sessions=3),
            Faculty(id="f3", name="Dr. P. Nair", preferred_slots=["09:00", "10:15", "13:00"], max_daily_sessions=3),
            Faculty(id="f4", name="Dr. K. Singh", preferred_slots=["10:15", "11:15", "13:00"], max_daily_sessions=3),
            Faculty(id="f5", name="Dr. M. Patel", preferred_slots=["10:15", "13:00", "14:00"], unavailable_slots=["Monday|08:00"], max_daily_sessions=3),
            Faculty(id="f6", name="Dr. S. Iyer", preferred_slots=["08:00", "11:15", "14:00"], max_daily_sessions=3),
        ],
        courses=[
            Course(id="CS201", name="Data Structures", faculty_id="f1", group_id="CSE-A", capacity=60, weekly_sessions=3, color="blue"),
            Course(id="CS202", name="Object Oriented Programming", faculty_id="f2", group_id="CSE-A", capacity=60, weekly_sessions=2, color="amber"),
            Course(id="CS251", name="Data Structures Lab", faculty_id="f4", group_id="CSE-A", capacity=40, weekly_sessions=1, duration_slots=2, room_type="lab", color="sage"),
            Course(id="CS301", name="Algorithms", faculty_id="f3", group_id="CSE-B", capacity=58, weekly_sessions=3, color="blue"),
            Course(id="CS302", name="Database Systems", faculty_id="f5", group_id="CSE-B", capacity=58, weekly_sessions=2, color="amber"),
            Course(id="CS352", name="Database Systems Lab", faculty_id="f5", group_id="CSE-B", capacity=40, weekly_sessions=1, duration_slots=2, room_type="lab", color="sage"),
            Course(id="MA201", name="Probability & Statistics", faculty_id="f6", group_id="CSE-A", capacity=60, weekly_sessions=2, color="sand"),
            Course(id="HS201", name="Technical Communication", faculty_id="f6", group_id="CSE-B", capacity=58, weekly_sessions=2, color="violet"),
        ],
        config=OptimizerConfig(),
    )
