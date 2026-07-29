from __future__ import annotations

import copy
import math
import random
from collections import Counter, defaultdict
from dataclasses import dataclass
from typing import Iterable

from .models import (
    ScheduleMetrics,
    ScheduleRequest,
    ScheduleResponse,
    ScheduledSession,
    RunMeta,
)

Placement = tuple[int, int, int]
Chromosome = list[Placement | None]


@dataclass(frozen=True)
class Session:
    id: str
    course_index: int


class HybridScheduler:
    """Constraint-aware GA followed by repair and Tabu local search."""

    def __init__(self, request: ScheduleRequest):
        self.request = request
        self.rng = random.Random(request.config.seed)
        self.faculty_by_id = {item.id: item for item in request.faculty}
        self.sessions = [
            Session(id=f"{course.id}-{number + 1}", course_index=index)
            for index, course in enumerate(request.courses)
            for number in range(course.weekly_sessions)
        ]
        self.possible = {
            index: self._static_placements(index) for index in range(len(self.sessions))
        }
        self.cache: dict[tuple[Placement | None, ...], tuple[int, float]] = {}

    def _course(self, session_index: int):
        return self.request.courses[self.sessions[session_index].course_index]

    def _static_placements(self, session_index: int) -> list[Placement]:
        course = self._course(session_index)
        faculty = self.faculty_by_id[course.faculty_id]
        placements: list[Placement] = []
        for day_index, day in enumerate(self.request.days):
            for slot_index, slot in enumerate(self.request.slots):
                if slot_index + course.duration_slots > len(self.request.slots):
                    continue
                if f"{day}|{slot.id}" in faculty.unavailable_slots:
                    continue
                for room_index, room in enumerate(self.request.rooms):
                    if room.capacity < course.capacity or room.room_type != course.room_type:
                        continue
                    placements.append((day_index, slot_index, room_index))
        return placements

    def _occupied_keys(
        self, session_index: int, placement: Placement
    ) -> Iterable[tuple[str, int, int, str]]:
        course = self._course(session_index)
        day, slot, room = placement
        for offset in range(course.duration_slots):
            current = slot + offset
            yield ("room", day, current, self.request.rooms[room].id)
            yield ("faculty", day, current, course.faculty_id)
            yield ("group", day, current, course.group_id)

    def _can_place(
        self,
        session_index: int,
        placement: Placement,
        chromosome: Chromosome,
        ignore_index: int | None = None,
    ) -> bool:
        if placement not in self.possible[session_index]:
            return False
        occupied: set[tuple[str, int, int, str]] = set()
        for other_index, other in enumerate(chromosome):
            if other is None or other_index == ignore_index:
                continue
            occupied.update(self._occupied_keys(other_index, other))
        return not any(key in occupied for key in self._occupied_keys(session_index, placement))

    def _placement_soft_cost(
        self, session_index: int, placement: Placement, chromosome: Chromosome
    ) -> float:
        course = self._course(session_index)
        faculty = self.faculty_by_id[course.faculty_id]
        day, slot, room_index = placement
        slot_id = self.request.slots[slot].id
        cost = 0.0
        if faculty.preferred_slots and slot_id not in faculty.preferred_slots:
            cost += 3.0
        same_group_day = 0
        same_course_day = 0
        room_changes = 0
        for other_index, other in enumerate(chromosome):
            if other is None or other_index == session_index:
                continue
            other_course = self._course(other_index)
            if other[0] == day and other_course.group_id == course.group_id:
                same_group_day += 1
            if other[0] == day and other_course.id == course.id:
                same_course_day += 1
            if other_course.group_id == course.group_id and other[2] != room_index:
                room_changes += 1
        cost += max(0, same_group_day - 3) * 1.5
        cost += same_course_day * 4.0
        cost += room_changes * 0.03
        return cost

    def _seed_candidate(self) -> Chromosome:
        chromosome: Chromosome = [None] * len(self.sessions)
        order = sorted(
            range(len(self.sessions)),
            key=lambda index: (
                len(self.possible[index]),
                -self._course(index).duration_slots,
                -self._course(index).capacity,
            ),
        )
        for index in order:
            choices = self.possible[index][:]
            self.rng.shuffle(choices)
            feasible = [
                placement
                for placement in choices
                if self._can_place(index, placement, chromosome)
            ]
            if feasible:
                sample = feasible[: min(24, len(feasible))]
                chromosome[index] = min(
                    sample,
                    key=lambda placement: self._placement_soft_cost(
                        index, placement, chromosome
                    )
                    + self.rng.random() * 1.5,
                )
            elif choices:
                chromosome[index] = self.rng.choice(choices)
        return self.repair(chromosome)

    def _conflicting_indexes(self, chromosome: Chromosome) -> set[int]:
        conflicts: set[int] = {index for index, value in enumerate(chromosome) if value is None}
        buckets: dict[tuple[str, int, int, str], list[int]] = defaultdict(list)
        for index, placement in enumerate(chromosome):
            if placement is None or placement not in self.possible[index]:
                conflicts.add(index)
                continue
            for key in self._occupied_keys(index, placement):
                buckets[key].append(index)
        for indexes in buckets.values():
            if len(indexes) > 1:
                conflicts.update(indexes[1:])
        return conflicts

    def repair(self, chromosome: Chromosome) -> Chromosome:
        repaired = copy.deepcopy(chromosome)
        conflicts = self._conflicting_indexes(repaired)
        for index in conflicts:
            repaired[index] = None
        for index in sorted(conflicts, key=lambda item: len(self.possible[item])):
            choices = self.possible[index][:]
            self.rng.shuffle(choices)
            feasible = [
                placement
                for placement in choices
                if self._can_place(index, placement, repaired, ignore_index=index)
            ]
            if feasible:
                repaired[index] = min(
                    feasible[: min(35, len(feasible))],
                    key=lambda placement: self._placement_soft_cost(
                        index, placement, repaired
                    ),
                )
        return repaired

    def score(self, chromosome: Chromosome) -> tuple[int, float]:
        key = tuple(chromosome)
        if key in self.cache:
            return self.cache[key]
        hard = 0
        buckets: Counter[tuple[str, int, int, str]] = Counter()
        daily_faculty: Counter[tuple[str, int]] = Counter()
        faculty_preferred = 0
        faculty_total = 0
        group_day_slots: dict[tuple[str, int], set[int]] = defaultdict(set)
        course_days: Counter[tuple[str, int]] = Counter()

        for index, placement in enumerate(chromosome):
            if placement is None or placement not in self.possible[index]:
                hard += 1
                continue
            course = self._course(index)
            faculty = self.faculty_by_id[course.faculty_id]
            day, slot, _ = placement
            daily_faculty[(course.faculty_id, day)] += course.duration_slots
            course_days[(course.id, day)] += 1
            for offset in range(course.duration_slots):
                group_day_slots[(course.group_id, day)].add(slot + offset)
            for occupied in self._occupied_keys(index, placement):
                buckets[occupied] += 1
            if faculty.preferred_slots:
                faculty_total += 1
                if self.request.slots[slot].id in faculty.preferred_slots:
                    faculty_preferred += 1

        hard += sum(max(0, count - 1) for count in buckets.values())
        for (faculty_id, _), count in daily_faculty.items():
            hard += max(0, count - self.faculty_by_id[faculty_id].max_daily_sessions)

        soft = 0.0
        soft += (faculty_total - faculty_preferred) * 3.0
        soft += sum(max(0, count - 1) * 4.0 for count in course_days.values())
        for slots in group_day_slots.values():
            if len(slots) > 1:
                soft += max(0, (max(slots) - min(slots) + 1) - len(slots)) * 1.5

        for group_id in {course.group_id for course in self.request.courses}:
            loads = [
                len(group_day_slots.get((group_id, day), set()))
                for day in range(len(self.request.days))
            ]
            soft += (max(loads) - min(loads)) * 0.8

        result = (hard, round(soft, 3))
        self.cache[key] = result
        return result

    def _tournament(self, population: list[Chromosome]) -> Chromosome:
        size = min(self.request.config.tournament_size, len(population))
        contenders = self.rng.sample(population, size)
        return min(contenders, key=self.score)

    def _crossover(self, left: Chromosome, right: Chromosome) -> Chromosome:
        group_source = {
            group: self.rng.choice((0, 1))
            for group in {course.group_id for course in self.request.courses}
        }
        child: Chromosome = []
        for index in range(len(self.sessions)):
            course = self._course(index)
            child.append((left if group_source[course.group_id] == 0 else right)[index])
        return self.repair(child)

    def _mutate(self, chromosome: Chromosome, rate: float) -> Chromosome:
        mutated = copy.deepcopy(chromosome)
        for index in range(len(mutated)):
            if self.rng.random() >= rate or not self.possible[index]:
                continue
            choices = self.possible[index][:]
            self.rng.shuffle(choices)
            for placement in choices[:40]:
                if self._can_place(index, placement, mutated, ignore_index=index):
                    mutated[index] = placement
                    break
        return self.repair(mutated)

    @staticmethod
    def _display_fitness(score: tuple[int, float]) -> float:
        hard, soft = score
        return round(1 / (1 + hard * 1000 + soft), 4)

    def _tabu_search(self, start: Chromosome) -> Chromosome:
        current = copy.deepcopy(start)
        best = copy.deepcopy(start)
        tabu: dict[tuple[int, Placement], int] = {}
        for iteration in range(self.request.config.tabu_iterations):
            candidates: list[tuple[tuple[int, float], int, Placement, Chromosome]] = []
            for _ in range(min(60, len(self.sessions) * 5)):
                index = self.rng.randrange(len(self.sessions))
                if not self.possible[index]:
                    continue
                placement = self.rng.choice(self.possible[index])
                neighbor = copy.deepcopy(current)
                neighbor[index] = placement
                neighbor = self.repair(neighbor)
                value = self.score(neighbor)
                move = (index, placement)
                if tabu.get(move, -1) > iteration and value >= self.score(best):
                    continue
                candidates.append((value, index, placement, neighbor))
            if not candidates:
                break
            _, index, placement, current = min(candidates, key=lambda item: item[0])
            tabu[(index, placement)] = iteration + 7
            if self.score(current) < self.score(best):
                best = copy.deepcopy(current)
        return best

    def run(self) -> ScheduleResponse:
        config = self.request.config
        population = [self._seed_candidate() for _ in range(config.population_size)]
        convergence: list[float] = []
        stagnant = 0
        previous_best: tuple[int, float] | None = None

        for generation in range(config.generations):
            population.sort(key=self.score)
            current_best = self.score(population[0])
            convergence.append(self._display_fitness(current_best))
            stagnant = stagnant + 1 if current_best == previous_best else 0
            previous_best = current_best
            elite_count = min(config.elite_size, len(population))
            next_population = [copy.deepcopy(item) for item in population[:elite_count]]
            progress = generation / max(1, config.generations - 1)
            mutation_rate = config.mutation_rate * (1.15 - 0.65 * progress)
            if stagnant >= 8:
                mutation_rate = min(0.55, mutation_rate * 2.2)
            while len(next_population) < config.population_size:
                child = self._crossover(
                    self._tournament(population), self._tournament(population)
                )
                next_population.append(self._mutate(child, mutation_rate))
            population = next_population
            if current_best == (0, 0.0):
                break

        best = min(population, key=self.score)
        best = self._tabu_search(best)
        hard, soft = self.score(best)
        faculty_total = 0
        faculty_preferred = 0
        scheduled: list[ScheduledSession] = []
        for index, placement in enumerate(best):
            if placement is None:
                continue
            course = self._course(index)
            faculty = self.faculty_by_id[course.faculty_id]
            day_index, slot_index, room_index = placement
            if faculty.preferred_slots:
                faculty_total += 1
                if self.request.slots[slot_index].id in faculty.preferred_slots:
                    faculty_preferred += 1
            scheduled.append(
                ScheduledSession(
                    session_id=self.sessions[index].id,
                    course_id=course.id,
                    course_name=course.name,
                    faculty_id=course.faculty_id,
                    faculty_name=faculty.name,
                    group_id=course.group_id,
                    day=self.request.days[day_index],
                    slot_id=self.request.slots[slot_index].id,
                    slot_label=self.request.slots[slot_index].label,
                    room_id=self.request.rooms[room_index].id,
                    room_name=self.request.rooms[room_index].name,
                    duration_slots=course.duration_slots,
                    color=course.color,
                )
            )
        occupied_room_slots = sum(item.duration_slots for item in scheduled)
        total_room_slots = (
            len(self.request.rooms) * len(self.request.days) * len(self.request.slots)
        )
        preference_fit = (
            100.0
            if faculty_total == 0
            else 100.0 * faculty_preferred / faculty_total
        )
        unassigned = len(self.sessions) - len(scheduled)
        warnings = []
        if unassigned:
            warnings.append(
                f"{unassigned} session(s) could not be assigned without a hard conflict."
            )
        return ScheduleResponse(
            institution=self.request.institution,
            term=self.request.term,
            status="feasible" if hard == 0 and unassigned == 0 else "needs_review",
            sessions=sorted(
                scheduled,
                key=lambda item: (
                    self.request.days.index(item.day),
                    next(
                        index
                        for index, slot in enumerate(self.request.slots)
                        if slot.id == item.slot_id
                    ),
                    item.group_id,
                ),
            ),
            metrics=ScheduleMetrics(
                hard_conflicts=hard,
                soft_penalty=soft,
                preference_fit=round(preference_fit, 1),
                room_utilisation=round(100 * occupied_room_slots / total_room_slots, 1),
                scheduled_sessions=len(scheduled),
                unassigned_sessions=unassigned,
            ),
            run=RunMeta(
                algorithm="Constraint-aware Genetic Algorithm + Repair + Tabu Search",
                generations=len(convergence),
                tabu_iterations=config.tabu_iterations,
                seed=config.seed,
                convergence=convergence,
            ),
            warnings=warnings,
        )


def validate_capacity(request: ScheduleRequest) -> tuple[bool, list[str], int, int]:
    issues: list[str] = []
    required = sum(
        course.weekly_sessions * course.duration_slots for course in request.courses
    )
    available = len(request.rooms) * len(request.days) * len(request.slots)
    if required > available:
        issues.append(
            f"{required} session-slots are required but only {available} room-slots exist."
        )
    for course in request.courses:
        matching = [
            room
            for room in request.rooms
            if room.room_type == course.room_type and room.capacity >= course.capacity
        ]
        if not matching:
            issues.append(
                f"{course.id} needs a {course.room_type} room for {course.capacity} students; none is available."
            )
    for group in {course.group_id for course in request.courses}:
        group_required = sum(
            course.weekly_sessions * course.duration_slots
            for course in request.courses
            if course.group_id == group
        )
        group_capacity = len(request.days) * len(request.slots)
        if group_required > group_capacity:
            issues.append(
                f"{group} needs {group_required} slots but its week contains only {group_capacity}."
            )
    return not issues, issues, required, available
