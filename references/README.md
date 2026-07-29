# Research references and implementation map

The supplied PDFs are kept verbatim in `papers/`. They motivated the project
but the code is an original implementation, not copied paper pseudocode.

| Source | Main idea used in ChronoSync |
|---|---|
| *The Smart Hybrid Timetable Scheduler* (project/SIH brief, 2025) | General higher-education problem framing, resource utilisation, human preferences and hybrid optimisation |
| Kale, Hodekar, Pawar & More, *Time Table Scheduling Using Genetic Algorithm* (2013) | Chromosome, fitness, selection, crossover and mutation foundation |
| Herath, *Genetic Algorithm for University Course Timetabling Problem* (M.S. thesis, University of Mississippi, 2017) | University course model and explicit hard/soft constraint separation |
| Mahlous & Mahlous, *Student Timetabling Genetic Algorithm Accounting for Student Preferences* (PeerJ Computer Science 9:e1200, 2023), DOI `10.7717/peerj-cs.1200` | Preference-aware scoring, tailored genetic operators, repair and improvement functions |
| Swaminadhan Prabhakaran et al., *Automatic Timetable Generator Using Genetic Algorithm* (ICIC-6 proceedings, 2024) | Automated academic data pipeline and feasibility-oriented GA |
| Sonawane & Ragha, *Hybrid Genetic Algorithm and TABU Search Algorithm to Solve Class Time Table Scheduling Problem* (IJRSCSE 1(4), 2014) | GA global exploration combined with memory-based Tabu local search |
| Mittal, Doshi, Sunasra & Nagpure, *Automatic Timetable Generation Using Genetic Algorithm* (IJARCCE 4(2), 2015), DOI `10.17148/IJARCCE.2015.4254` | Population-based search and practical institutional constraint framing |

## Improvements implemented beyond a basic GA

- feasible, most-constrained-first population seeding;
- event-based genes instead of opaque binary strings;
- lexicographic feasibility-first ranking;
- group-aware crossover;
- adaptive mutation after stagnation;
- repair rather than automatic rejection;
- fitness memoisation;
- GA plus Tabu Search;
- explicit unassigned sessions and human-readable metrics;
- frontend controls suitable for future locking and targeted re-optimisation.

## Paper files

1. `01-smart-hybrid-timetable-scheduler-brief.pdf`
2. `02-kale-et-al-timetable-genetic-algorithm-2013.pdf`
3. `03-herath-university-course-timetabling-thesis-2017.pdf`
4. `04-mahlous-student-preference-genetic-algorithm-2023.pdf`
5. `05-swaminadhan-et-al-automatic-timetable-generator-2024.pdf`
6. `06-sonawane-ragha-hybrid-ga-tabu-search-2014.pdf`
7. `07-mittal-et-al-automatic-timetable-generation-2015.pdf`

Copyright and redistribution terms remain with the respective authors and
publishers.
