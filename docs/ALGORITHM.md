# Hybrid scheduling algorithm

## 1. Representation

A chromosome is a list of placements, one for every required teaching
session. A gene contains a day, start slot and room. Course metadata supplies
its faculty, student group, duration, capacity and room type.

## 2. Feasibility before optimisation

The validation endpoint checks:

- total requested slots against total room-slots;
- whether each course has at least one suitable room;
- whether a student group requires more slots than exist in its week;
- foreign-key consistency through Pydantic validation.

These checks explain obvious impossibility before the search starts.

## 3. Constraint-aware seeding

Purely random populations waste generations repairing avoidable collisions.
ChronoSync sorts sessions by:

1. number of statically valid placements;
2. duration, placing long labs first;
3. cohort size.

It then assigns a feasible low-penalty placement with a small random term. This
produces different but strong seeds.

## 4. Fitness

The optimiser returns:

```text
score(T) = (hard_violations(T), soft_penalty(T))
```

Python tuple ordering gives lexicographic ranking. This prevents any number of
soft preferences from compensating for a hard clash.

The prototype hard checks cover:

- unassigned or invalid placements;
- room, faculty and student-group overlaps;
- room type/capacity;
- faculty unavailability;
- maximum daily faculty sessions;
- contiguous multi-slot events.

The soft score covers:

- faculty-preference misses;
- multiple sessions of one course on the same day;
- gaps in student-group schedules;
- imbalanced student-group days;
- a light penalty for unstable room use.

## 5. Genetic exploration

- Tournament selection chooses parents without requiring score normalisation.
- Elitism preserves the strongest candidates.
- Group-aware crossover takes a whole student group's placement pattern from
  one parent, reducing destructive random cuts.
- Adaptive mutation starts exploratory, cools during the run and rises again
  after stagnation.
- Fitness values are cached by chromosome tuple.

## 6. Repair

After crossover or mutation, every conflicting gene is removed. The repair
operator processes the hardest sessions first and chooses the lowest-penalty
currently feasible placement. If none exists, the gene remains explicitly
unassigned instead of hiding a clash.

## 7. Tabu refinement

The best GA chromosome enters a local search. Each neighbourhood samples a
single-session move, repairs the neighbour and selects the best allowed move.
A short tabu tenure prevents immediate cycles. The aspiration condition allows
a tabu move when it beats the best global solution.

## 8. Complexity

Let:

- \(P\) = population size,
- \(G\) = generations,
- \(S\) = required sessions,
- \(R\) = candidate placements considered during repair.

The practical dominant cost is approximately:

\[
O(G \cdot P \cdot S \cdot R)
\]

Caching, incremental scoring and parallel population evaluation are the next
optimisations for large datasets. The current implementation favours readable,
interview-explainable code for a working prototype.

## 9. Why hybrid?

The GA explores distant regions of a huge search space. Repair protects
feasibility. Tabu Search improves the last local details. Human constraint
weights and future locked sessions keep the system operationally controllable.
