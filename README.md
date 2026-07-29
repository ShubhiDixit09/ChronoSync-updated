# ChronoSync

ChronoSync is an institution-independent university timetable generation and
optimisation platform. It converts courses, faculty availability, rooms,
student groups, institutional rules and human preferences into a clash-free,
scored and explainable weekly schedule.

The prototype is based on the Smart India Hackathon academic scheduling problem
but is deliberately not hard-coded to one state, university or department.

## What is working

- Responsive academic-operations frontend with schedule, course, faculty, room
  and constraint workspaces.
- FastAPI backend with typed validation and interactive OpenAPI docs.
- Real hybrid scheduler:
  - most-constrained-first initialisation;
  - tournament selection and elitism;
  - student-group-aware crossover;
  - adaptive mutation;
  - feasibility repair;
  - Tabu Search local refinement;
  - lexicographic hard/soft constraint scoring;
  - fitness caching and seeded reproducibility.
- Live generation progress, API-connected/demo states, filters and metrics.
- Sample university dataset, API tests, Docker setup and source papers.

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
