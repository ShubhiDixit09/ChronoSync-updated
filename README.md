# ChronoSync

<!-- LIVE DEPLOYMENT LINK -->

[**Open live ChronoSync**](https://chronosync-shubhidixit09.vercel.app/)

**Deployment:** Vercel · Next.js interface and deployed FastAPI timetable optimizer. The sample-dataset Generate timetable workflow has been tested end-to-end.
<!-- END LIVE DEPLOYMENT LINK -->

ChronoSync is an institution-independent university timetable generation and
optimisation platform. It converts courses, faculty availability, rooms,
student groups, institutional rules and human preferences into a clash-free,
scored and explainable weekly schedule.

The prototype is based on the Smart India Hackathon academic scheduling problem
but is deliberately not hard-coded to one state, university or department.

## What is working

- **Dual-Engine Hybrid Genetic Algorithm**:
  - **In-Browser TypeScript Engine**: Solves the scheduling problem directly in the browser with 0 external setup needed.
  - **FastAPI Python Backend**: Scalable Python backend with typed validation, locked session support, and interactive OpenAPI docs.
  - Seeding with most-constrained-first heuristics (rare rooms, long labs).
  - Elitism and tournament selection.
  - Student-group-aware crossover and adaptive mutation.
  - Feasibility repair operator that relocates invalid offspring into feasible slots.
  - Tabu Search local refinement.
  - Lexicographic hard and soft constraint scoring.
- **Interactive Academic Data Management**:
  - Full CRUD modals for **Courses**, **Faculty Members**, and **Rooms**.
  - Custom colors, room types (lecture/lab), capacities, and preferred teaching slots.
  - Automatic `localStorage` persistence and one-click demo data reset.
- **Multi-Perspective Timetable Views**:
  - **Section / Student Group View**: Filter by whole cohort or specific section (CSE-A, CSE-B).
  - **Faculty View**: View any teacher's weekly schedule with workload tracking.
  - **Room View**: Monitor hall/lab room occupancy.
- **Interactive Session Management**:
  - Click any timetable session to inspect details.
  - **Session Locking**: Pin approved sessions so re-generation never moves them.
  - **Manual Rescheduling**: Move sessions to new days/slots/rooms with instant clash detection.
- **Diagnostics & Data Interchange**:
  - **Pre-flight Feasibility Diagnostics**: Check capacity vs. demand before running the solver.
  - **Exporting**: Export to CSV (Excel), JSON, and Print / PDF view.
  - **Importing**: Import courses from CSV with built-in template assistance.

## One-command start

Prerequisite: Docker Desktop.

```bash
docker compose up --build
```

Open:

- App: `http://localhost:3000`
- API docs: `http://localhost:8000/docs`
- API health: `http://localhost:8000/api/v1/health`

Click **Generate timetable**. When the API is running, the UI sends the sample
dataset to the Python optimiser and renders the returned schedule. If the API
is absent, the interface remains usable in clearly labelled demo mode.

## Run without Docker

Frontend:

```bash
npm install
npm run dev
```

Backend, from a second terminal:

```bash
cd backend
python -m venv .venv
```

Windows:

```powershell
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

macOS/Linux:

```bash
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## End-to-end workflow

1. The admin enters or imports courses, rooms, faculty and student groups.
2. The API validates references and checks obvious capacity infeasibility.
3. Course requirements are expanded into individual session genes.
4. Rare rooms, long labs and constrained sessions are seeded first.
5. A Genetic Algorithm explores different complete timetables.
6. The repair operator relocates invalid offspring into feasible placements.
7. Tabu Search improves the best candidate through local moves.
8. The API returns scheduled sessions, conflicts, preferences and convergence.
9. The frontend renders section, faculty and room views for human review.
10. In the production roadmap, approved sessions can be locked and only the
    affected neighbourhood re-optimised after a change.

## Constraint model

Hard constraints must be zero:

- no faculty, room or student-group overlap;
- room type and capacity must match;
- faculty unavailability is respected;
- multi-slot labs remain contiguous;
- maximum daily faculty load is respected.

Soft constraints improve quality:

- preferred faculty hours;
- fewer student gaps;
- no same-course bunching on one day;
- balanced student-group load across the week;
- more stable room assignments.

Candidates are ranked lexicographically:

```text
(hard violations, weighted soft penalty)
```

Therefore, zero hard violations always beats a prettier schedule with one
clash. See [docs/ALGORITHM.md](docs/ALGORITHM.md) for the implementation model.

## Repository structure

```text
chronosync/
├── app/                       # Next.js/Vinext frontend
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI routes
│   │   ├── models.py          # Request/response contracts
│   │   ├── optimizer.py       # GA + repair + Tabu Search
│   │   └── sample_data.py     # Reproducible demo institution
│   └── tests/
├── docs/                      # Architecture, algorithm and API notes
├── references/
│   ├── README.md              # Source-to-feature research map
│   └── papers/                # Supplied SIH brief and papers
├── Dockerfile                 # Frontend container
├── docker-compose.yml         # Full-stack local deployment
└── .openai/hosting.json       # Frontend hosting identity
```

## API

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/v1/health` | Service readiness |
| `GET` | `/api/v1/sample` | Complete demo request |
| `POST` | `/api/v1/schedules/validate` | Basic feasibility diagnostics |
| `POST` | `/api/v1/schedules/generate` | Run hybrid optimisation |

## Tests

```bash
cd backend
pytest -q
```

The tests verify zero hard conflicts, no double-booked room/faculty/group
resources, health routing and end-to-end schedule generation.

## Hosting later

- Frontend: deploy the root app to any compatible Node/edge host.
- Backend: deploy `backend/Dockerfile` to Render, Railway, Fly.io, Cloud Run,
  Azure Container Apps or another container host.
- Set `NEXT_PUBLIC_API_URL` to the public backend URL ending in `/api/v1`.
- For a multi-user production release, add PostgreSQL, Redis/job workers,
  authentication, versioning and notifications. These are intentionally not
  faked in the prototype.

## Research grounding

The exact source PDFs supplied for the project are preserved under
[`references/papers`](references/papers), with a concise implementation map in
[`references/README.md`](references/README.md).

## License

The software is MIT licensed. Research documents retain their original
copyrights and licences.
