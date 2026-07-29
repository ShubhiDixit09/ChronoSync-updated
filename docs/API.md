# API guide

Base URL in local development: `http://localhost:8000/api/v1`

## Generate a schedule

First retrieve the complete demo payload:

```bash
curl http://localhost:8000/api/v1/sample -o sample.json
```

Then optimise it:

```bash
curl -X POST http://localhost:8000/api/v1/schedules/generate \
  -H "Content-Type: application/json" \
  --data @sample.json
```

The response contains:

- `sessions`: final day, slot and room assignments;
- `metrics`: hard conflicts, soft penalty, preference fit and utilisation;
- `run`: algorithm name, generations, Tabu iterations and convergence;
- `warnings`: explicit unassigned-session diagnostics.

## Validate before generation

```bash
curl -X POST http://localhost:8000/api/v1/schedules/validate \
  -H "Content-Type: application/json" \
  --data @sample.json
```

Validation is deliberately fast and conservative. A clean result means no
obvious capacity impossibility; the optimiser still performs the complete
resource and overlap search.

## Request model

```json
{
  "institution": "Northbridge Institute of Technology",
  "term": "Odd Semester 2026",
  "days": ["Monday", "Tuesday"],
  "slots": [{"id": "08:00", "label": "08:00 - 09:00"}],
  "rooms": [{"id": "C-203", "name": "C-203", "capacity": 72, "room_type": "lecture"}],
  "faculty": [{"id": "f1", "name": "Dr. A. Sharma", "preferred_slots": ["08:00"]}],
  "courses": [{
    "id": "CS201",
    "name": "Data Structures",
    "faculty_id": "f1",
    "group_id": "CSE-A",
    "capacity": 60,
    "weekly_sessions": 3
  }],
  "config": {"population_size": 48, "generations": 55, "seed": 42}
}
```

Open `/docs` for the generated Swagger UI and exact schemas.
