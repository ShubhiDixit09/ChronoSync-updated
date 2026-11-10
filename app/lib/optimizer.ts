import {
  Course,
  Faculty,
  Room,
  TimeSlot,
  OptimizerConfig,
  ConstraintSetting,
  ScheduledSession,
  ScheduleResponse,
  ValidationResult,
} from "./types";

export type Placement = [number, number, number]; // [day_index, slot_index, room_index]
export type Chromosome = Array<Placement | null>;

export interface InternalSession {
  id: string;
  courseIndex: number;
  sessionNumber: number;
  isLocked?: boolean;
  lockedPlacement?: Placement;
}

export class ClientScheduler {
  private days: string[];
  private slots: TimeSlot[];
  private rooms: Room[];
  private facultyById: Map<string, Faculty>;
  private courses: Course[];
  private config: OptimizerConfig;
  private constraints: Map<string, ConstraintSetting>;
  private sessions: InternalSession[] = [];
  private possiblePlacements: Placement[][] = [];
  private rng: () => number;

  constructor(
    institution: string,
    term: string,
    days: string[],
    slots: TimeSlot[],
    rooms: Room[],
    faculty: Faculty[],
    courses: Course[],
    constraints: ConstraintSetting[],
    config: OptimizerConfig,
    lockedSessionsMap?: Map<string, { day: string; slot_id: string; room_id: string }>,
  ) {
    this.days = days;
    this.slots = slots;
    this.rooms = rooms;
    this.facultyById = new Map(faculty.map((f) => [f.id, f]));
    this.courses = courses;
    this.config = config;
    this.constraints = new Map(constraints.map((c) => [c.id, c]));

    // Seeded pseudo-random number generator (Mulberry32)
    let s = config.seed >>> 0;
    this.rng = () => {
      s |= 0;
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    // Expand courses into individual sessions
    courses.forEach((course, courseIndex) => {
      for (let sessionNum = 1; sessionNum <= course.weekly_sessions; sessionNum++) {
        const sessionId = `${course.id}-${sessionNum}`;
        let lockedPlacement: Placement | undefined = undefined;
        let isLocked = false;

        if (lockedSessionsMap && lockedSessionsMap.has(sessionId)) {
          const lockedInfo = lockedSessionsMap.get(sessionId)!;
          const dayIdx = this.days.indexOf(lockedInfo.day);
          const slotIdx = this.slots.findIndex((slot) => slot.id === lockedInfo.slot_id);
          const roomIdx = this.rooms.findIndex((room) => room.id === lockedInfo.room_id);
          if (dayIdx >= 0 && slotIdx >= 0 && roomIdx >= 0) {
            lockedPlacement = [dayIdx, slotIdx, roomIdx];
            isLocked = true;
          }
        }

        this.sessions.push({
          id: sessionId,
          courseIndex,
          sessionNumber: sessionNum,
          isLocked,
          lockedPlacement,
        });
      }
    });

    // Compute static valid placements for each session
    this.possiblePlacements = this.sessions.map((session, index) => {
      if (session.isLocked && session.lockedPlacement) {
        return [session.lockedPlacement];
      }
      return this.computeStaticPlacements(index);
    });
  }

  private course(sessionIndex: number): Course {
    return this.courses[this.sessions[sessionIndex].courseIndex];
  }

  private computeStaticPlacements(sessionIndex: number): Placement[] {
    const course = this.course(sessionIndex);
    const faculty = this.facultyById.get(course.faculty_id);
    const placements: Placement[] = [];

    for (let dayIdx = 0; dayIdx < this.days.length; dayIdx++) {
      const day = this.days[dayIdx];
      for (let slotIdx = 0; slotIdx < this.slots.length; slotIdx++) {
        if (slotIdx + course.duration_slots > this.slots.length) {
          continue; // Cannot overflow slots in a day
        }
        const slot = this.slots[slotIdx];
        if (faculty && faculty.unavailable_slots.includes(`${day}|${slot.id}`)) {
          continue;
        }

        for (let roomIdx = 0; roomIdx < this.rooms.length; roomIdx++) {
          const room = this.rooms[roomIdx];
          if (room.room_type !== course.room_type || room.capacity < course.capacity) {
            continue;
          }
          placements.push([dayIdx, slotIdx, roomIdx]);
        }
      }
    }
    return placements;
  }

  private occupiedKeys(sessionIndex: number, placement: Placement): string[] {
    const course = this.course(sessionIndex);
    const [day, startSlot, roomIdx] = placement;
    const room = this.rooms[roomIdx];
    const keys: string[] = [];

    for (let offset = 0; offset < course.duration_slots; offset++) {
      const currentSlot = startSlot + offset;
      keys.push(`room:${day}:${currentSlot}:${room.id}`);
      keys.push(`faculty:${day}:${currentSlot}:${course.faculty_id}`);
      keys.push(`group:${day}:${currentSlot}:${course.group_id}`);
    }
    return keys;
  }

  private canPlace(
    sessionIndex: number,
    placement: Placement,
    chromosome: Chromosome,
    ignoreIndex: number | null = null,
  ): boolean {
    const course = this.course(sessionIndex);
    const [day, startSlot, roomIdx] = placement;

    // Check bounds
    if (startSlot + course.duration_slots > this.slots.length) return false;
    const room = this.rooms[roomIdx];
    if (room.room_type !== course.room_type || room.capacity < course.capacity) return false;

    const myKeys = new Set(this.occupiedKeys(sessionIndex, placement));

    for (let otherIdx = 0; otherIdx < chromosome.length; otherIdx++) {
      if (otherIdx === sessionIndex || otherIdx === ignoreIndex) continue;
      const otherPlacement = chromosome[otherIdx];
      if (!otherPlacement) continue;

      const otherKeys = this.occupiedKeys(otherIdx, otherPlacement);
      for (const k of otherKeys) {
        if (myKeys.has(k)) {
          return false;
        }
      }
    }
    return true;
  }

  private placementSoftCost(sessionIndex: number, placement: Placement, chromosome: Chromosome): number {
    const course = this.course(sessionIndex);
    const faculty = this.facultyById.get(course.faculty_id);
    const [day, slotIdx, roomIdx] = placement;
    const slotId = this.slots[slotIdx].id;

    let cost = 0;

    // 1. Faculty preferred slots
    const prefConstraint = this.constraints.get("faculty-preferences");
    if (prefConstraint && prefConstraint.enabled && faculty && faculty.preferred_slots.length > 0) {
      if (!faculty.preferred_slots.includes(slotId)) {
        cost += (prefConstraint.weight / 100) * 3.0;
      }
    }

    // 2. Multiple sessions of same course on same day & section load
    const balanceConstraint = this.constraints.get("balance-week");
    const stabilityConstraint = this.constraints.get("room-stability");

    let sameGroupDayCount = 0;
    let sameCourseDayCount = 0;
    let roomChanges = 0;

    for (let otherIdx = 0; otherIdx < chromosome.length; otherIdx++) {
      if (otherIdx === sessionIndex) continue;
      const other = chromosome[otherIdx];
      if (!other) continue;

      const otherCourse = this.course(otherIdx);
      if (other[0] === day && otherCourse.group_id === course.group_id) {
        sameGroupDayCount++;
      }
      if (other[0] === day && otherCourse.id === course.id) {
        sameCourseDayCount++;
      }
      if (otherCourse.group_id === course.group_id && other[2] !== roomIdx) {
        roomChanges++;
      }
    }

    if (sameCourseDayCount > 0) {
      cost += sameCourseDayCount * 4.0;
    }
    if (balanceConstraint && balanceConstraint.enabled) {
      cost += Math.max(0, sameGroupDayCount - 3) * (balanceConstraint.weight / 100) * 1.5;
    }
    if (stabilityConstraint && stabilityConstraint.enabled) {
      cost += roomChanges * (stabilityConstraint.weight / 100) * 0.05;
    }

    return cost;
  }

  public repair(chromosome: Chromosome): Chromosome {
    const repaired = [...chromosome];
    const conflicts = new Set<number>();
    const occupied = new Map<string, number>();

    // Detect hard overlaps
    for (let i = 0; i < repaired.length; i++) {
      const p = repaired[i];
      if (!p) {
        conflicts.add(i);
        continue;
      }
      const keys = this.occupiedKeys(i, p);
      for (const k of keys) {
        if (occupied.has(k)) {
          // If one is locked and the other isn't, remove the unlocked one
          const prev = occupied.get(k)!;
          if (this.sessions[prev].isLocked && !this.sessions[i].isLocked) {
            conflicts.add(i);
          } else if (this.sessions[i].isLocked && !this.sessions[prev].isLocked) {
            conflicts.add(prev);
            occupied.set(k, i);
          } else {
            conflicts.add(i);
          }
        } else {
          occupied.set(k, i);
        }
      }
    }

    // Set conflicted unlocked genes to null
    for (const c of conflicts) {
      if (!this.sessions[c].isLocked) {
        repaired[c] = null;
      }
    }

    // Sort conflicted sessions by difficulty (fewest possible placements first)
    const sortedConflicts = Array.from(conflicts)
      .filter((idx) => !this.sessions[idx].isLocked)
      .sort((a, b) => this.possiblePlacements[a].length - this.possiblePlacements[b].length);

    // Relocate into feasible spots
    for (const idx of sortedConflicts) {
      const choices = [...this.possiblePlacements[idx]];
      this.shuffle(choices);

      const feasible = choices.filter((p) => this.canPlace(idx, p, repaired, idx));
      if (feasible.length > 0) {
        // Pick best feasible
        const sample = feasible.slice(0, Math.min(30, feasible.length));
        sample.sort(
          (a, b) =>
            this.placementSoftCost(idx, a, repaired) - this.placementSoftCost(idx, b, repaired),
        );
        repaired[idx] = sample[0];
      }
    }

    return repaired;
  }

  private seedCandidate(): Chromosome {
    const chromosome: Chromosome = new Array(this.sessions.length).fill(null);

    // Place locked sessions first
    this.sessions.forEach((s, idx) => {
      if (s.isLocked && s.lockedPlacement) {
        chromosome[idx] = s.lockedPlacement;
      }
    });

    // Sort unlocked sessions by constrainedness: fewest placements, longest duration, largest capacity
    const unlockedOrder = this.sessions
      .map((_, idx) => idx)
      .filter((idx) => !this.sessions[idx].isLocked)
      .sort((a, b) => {
        const diffPossible = this.possiblePlacements[a].length - this.possiblePlacements[b].length;
        if (diffPossible !== 0) return diffPossible;
        const durDiff = this.course(b).duration_slots - this.course(a).duration_slots;
        if (durDiff !== 0) return durDiff;
        return this.course(b).capacity - this.course(a).capacity;
      });

    for (const idx of unlockedOrder) {
      const choices = [...this.possiblePlacements[idx]];
      this.shuffle(choices);

      const feasible = choices.filter((p) => this.canPlace(idx, p, chromosome));
      if (feasible.length > 0) {
        const sample = feasible.slice(0, Math.min(24, feasible.length));
        sample.sort(
          (a, b) =>
            this.placementSoftCost(idx, a, chromosome) +
            this.rng() * 1.5 -
            (this.placementSoftCost(idx, b, chromosome) + this.rng() * 1.5),
        );
        chromosome[idx] = sample[0];
      } else if (choices.length > 0) {
        // Soft fallback, will be cleaned up by repair
        chromosome[idx] = choices[Math.floor(this.rng() * choices.length)];
      }
    }

    return this.repair(chromosome);
  }

  public score(chromosome: Chromosome): [number, number] {
    let hard = 0;
    let soft = 0;

    const occupiedBuckets = new Map<string, number>();
    const facultyDayHours = new Map<string, number>(); // facultyId:dayIdx -> hours
    const courseDayCount = new Map<string, number>(); // courseId:dayIdx -> count
    const groupDaySlots = new Map<string, Set<number>>(); // groupId:dayIdx -> set of slots

    let facultyPreferredCount = 0;
    let facultyTotalChecked = 0;

    const prefConstraint = this.constraints.get("faculty-preferences");
    const gapConstraint = this.constraints.get("student-gaps");
    const balanceConstraint = this.constraints.get("balance-week");

    for (let i = 0; i < chromosome.length; i++) {
      const p = chromosome[i];
      if (!p) {
        hard += 1;
        continue;
      }

      const course = this.course(i);
      const faculty = this.facultyById.get(course.faculty_id);
      const [dayIdx, startSlot, roomIdx] = p;

      // Track faculty daily hours
      const fDayKey = `${course.faculty_id}:${dayIdx}`;
      facultyDayHours.set(fDayKey, (facultyDayHours.get(fDayKey) || 0) + course.duration_slots);

      // Track course on same day
      const cDayKey = `${course.id}:${dayIdx}`;
      courseDayCount.set(cDayKey, (courseDayCount.get(cDayKey) || 0) + 1);

      // Track student group slots for gaps
      const gDayKey = `${course.group_id}:${dayIdx}`;
      if (!groupDaySlots.has(gDayKey)) groupDaySlots.set(gDayKey, new Set());
      for (let offset = 0; offset < course.duration_slots; offset++) {
        groupDaySlots.get(gDayKey)!.add(startSlot + offset);
      }

      // Track collisions
      const keys = this.occupiedKeys(i, p);
      for (const k of keys) {
        const cnt = (occupiedBuckets.get(k) || 0) + 1;
        occupiedBuckets.set(k, cnt);
      }

      // Preferred slots
      if (faculty && faculty.preferred_slots.length > 0) {
        facultyTotalChecked++;
        if (faculty.preferred_slots.includes(this.slots[startSlot].id)) {
          facultyPreferredCount++;
        }
      }
    }

    // Overlaps count as hard violations
    for (const cnt of occupiedBuckets.values()) {
      if (cnt > 1) {
        hard += cnt - 1;
      }
    }

    // Faculty daily session limit
    for (const [key, hours] of facultyDayHours.entries()) {
      const [fId] = key.split(":");
      const f = this.facultyById.get(fId);
      const maxSessions = f?.max_daily_sessions ?? 4;
      if (hours > maxSessions) {
        hard += hours - maxSessions;
      }
    }

    // Soft penalty: preference misses
    if (prefConstraint && prefConstraint.enabled && facultyTotalChecked > 0) {
      const misses = facultyTotalChecked - facultyPreferredCount;
      soft += misses * (prefConstraint.weight / 100) * 3.0;
    }

    // Soft penalty: course bunching on same day
    for (const cnt of courseDayCount.values()) {
      if (cnt > 1) {
        soft += (cnt - 1) * 4.0;
      }
    }

    // Soft penalty: student day gaps
    if (gapConstraint && gapConstraint.enabled) {
      for (const slotSet of groupDaySlots.values()) {
        if (slotSet.size > 1) {
          const arr = Array.from(slotSet);
          const span = Math.max(...arr) - Math.min(...arr) + 1;
          const gaps = span - slotSet.size;
          if (gaps > 0) {
            soft += gaps * (gapConstraint.weight / 100) * 1.5;
          }
        }
      }
    }

    // Soft penalty: group weekly balance
    if (balanceConstraint && balanceConstraint.enabled) {
      const uniqueGroups = new Set(this.courses.map((c) => c.group_id));
      for (const g of uniqueGroups) {
        const dayCounts = this.days.map((_, dayIdx) => {
          return groupDaySlots.get(`${g}:${dayIdx}`)?.size || 0;
        });
        const maxLoad = Math.max(...dayCounts);
        const minLoad = Math.min(...dayCounts);
        soft += (maxLoad - minLoad) * (balanceConstraint.weight / 100) * 0.8;
      }
    }

    return [hard, Number(soft.toFixed(2))];
  }

  private tournament(population: Chromosome[]): Chromosome {
    const size = Math.min(this.config.tournament_size, population.length);
    let best = population[Math.floor(this.rng() * population.length)];
    let bestScore = this.score(best);

    for (let i = 1; i < size; i++) {
      const contender = population[Math.floor(this.rng() * population.length)];
      const contenderScore = this.score(contender);
      if (this.isBetter(contenderScore, bestScore)) {
        best = contender;
        bestScore = contenderScore;
      }
    }
    return best;
  }

  private isBetter(a: [number, number], b: [number, number]): boolean {
    if (a[0] !== b[0]) return a[0] < b[0];
    return a[1] < b[1];
  }

  private crossover(left: Chromosome, right: Chromosome): Chromosome {
    const uniqueGroups = Array.from(new Set(this.courses.map((c) => c.group_id)));
    const groupSource = new Map<string, number>();
    uniqueGroups.forEach((g) => {
      groupSource.set(g, this.rng() < 0.5 ? 0 : 1);
    });

    const child: Chromosome = [];
    for (let i = 0; i < this.sessions.length; i++) {
      if (this.sessions[i].isLocked && this.sessions[i].lockedPlacement) {
        child.push(this.sessions[i].lockedPlacement!);
        continue;
      }
      const course = this.course(i);
      const pickLeft = groupSource.get(course.group_id) === 0;
      child.push(pickLeft ? left[i] : right[i]);
    }
    return this.repair(child);
  }

  private mutate(chromosome: Chromosome, rate: number = 0.2): Chromosome {
    const mutated = [...chromosome];
    for (let i = 0; i < mutated.length; i++) {
      if (this.sessions[i].isLocked) continue;
      if (this.rng() >= rate || this.possiblePlacements[i].length === 0) continue;

      const choices = [...this.possiblePlacements[i]];
      this.shuffle(choices);

      for (let cIdx = 0; cIdx < Math.min(30, choices.length); cIdx++) {
        const cand = choices[cIdx];
        if (this.canPlace(i, cand, mutated, i)) {
          mutated[i] = cand;
          break;
        }
      }
    }
    return this.repair(mutated);
  }

  private tabuSearch(initial: Chromosome): Chromosome {
    let current = [...initial];
    let best = [...initial];
    let bestScore = this.score(best);

    const tabu = new Map<string, number>();
    const maxMoves = Math.min(50, this.sessions.length * 4);

    for (let iter = 0; iter < this.config.tabu_iterations; iter++) {
      const candidates: Array<{
        score: [number, number];
        index: number;
        placement: Placement;
        neighbor: Chromosome;
      }> = [];

      for (let attempt = 0; attempt < maxMoves; attempt++) {
        const idx = Math.floor(this.rng() * this.sessions.length);
        if (this.sessions[idx].isLocked || this.possiblePlacements[idx].length === 0) continue;

        const p = this.possiblePlacements[idx][
          Math.floor(this.rng() * this.possiblePlacements[idx].length)
        ];
        const neighbor = [...current];
        neighbor[idx] = p;
        const repaired = this.repair(neighbor);
        const sc = this.score(repaired);
        const moveKey = `${idx}:${p.join(",")}`;

        const isTabu = (tabu.get(moveKey) || -1) > iter;
        // Aspiration criteria: allowed if better than best overall
        if (isTabu && !this.isBetter(sc, bestScore)) {
          continue;
        }

        candidates.push({ score: sc, index: idx, placement: p, neighbor: repaired });
      }

      if (candidates.length === 0) break;

      candidates.sort((a, b) => (this.isBetter(a.score, b.score) ? -1 : 1));
      const chosen = candidates[0];

      current = chosen.neighbor;
      tabu.set(`${chosen.index}:${chosen.placement.join(",")}`, iter + 7);

      if (this.isBetter(chosen.score, bestScore)) {
        best = chosen.neighbor;
        bestScore = chosen.score;
      }
    }

    return best;
  }

  private shuffle<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  public run(): ScheduleResponse {
    const startTime = performance.now();
    let population: Chromosome[] = [];

    // Seed population
    for (let i = 0; i < this.config.population_size; i++) {
      population.push(this.seedCandidate());
    }

    const convergence: number[] = [];
    let previousBest: [number, number] | null = null;
    let stagnantCount = 0;

    for (let gen = 0; gen < this.config.generations; gen++) {
      population.sort((a, b) => (this.isBetter(this.score(a), this.score(b)) ? -1 : 1));
      const currentBest = this.score(population[0]);

      // Fitness calculation for graph: 1 / (1 + hard*1000 + soft)
      const fitness = Number((1 / (1 + currentBest[0] * 1000 + currentBest[1])).toFixed(4));
      convergence.push(fitness);

      if (previousBest && previousBest[0] === currentBest[0] && previousBest[1] === currentBest[1]) {
        stagnantCount++;
      } else {
        stagnantCount = 0;
      }
      previousBest = currentBest;

      // Elitism
      const nextPop: Chromosome[] = population.slice(0, this.config.elite_size);

      // Adaptive mutation rate
      const progress = gen / Math.max(1, this.config.generations - 1);
      let mutRate = this.config.mutation_rate * (1.15 - 0.65 * progress);
      if (stagnantCount >= 6) {
        mutRate = Math.min(0.6, mutRate * 2.2);
      }

      while (nextPop.length < this.config.population_size) {
        const parentA = this.tournament(population);
        const parentB = this.tournament(population);
        const child = this.crossover(parentA, parentB);
        nextPop.push(this.mutate(child, mutRate));
      }

      population = nextPop;

      // Early stop if optimal
      if (currentBest[0] === 0 && currentBest[1] === 0) {
        break;
      }
    }

    population.sort((a, b) => (this.isBetter(this.score(a), this.score(b)) ? -1 : 1));
    let best = population[0];

    // Local refinement with Tabu Search
    if (this.config.tabu_iterations > 0) {
      best = this.tabuSearch(best);
    }

    const [hardConflicts, softPenalty] = this.score(best);

    // Build scheduled session objects
    const scheduled: ScheduledSession[] = [];
    let facultyPreferredMatches = 0;
    let facultyPreferredTotal = 0;

    for (let i = 0; i < best.length; i++) {
      const placement = best[i];
      if (!placement) continue;

      const course = this.course(i);
      const faculty = this.facultyById.get(course.faculty_id);
      const [dayIdx, slotIdx, roomIdx] = placement;
      const slot = this.slots[slotIdx];
      const room = this.rooms[roomIdx];

      if (faculty && faculty.preferred_slots.length > 0) {
        facultyPreferredTotal++;
        if (faculty.preferred_slots.includes(slot.id)) {
          facultyPreferredMatches++;
        }
      }

      scheduled.push({
        session_id: this.sessions[i].id,
        course_id: course.id,
        course_name: course.name,
        faculty_id: course.faculty_id,
        faculty_name: faculty?.name || course.faculty_id,
        group_id: course.group_id,
        day: this.days[dayIdx],
        slot_id: slot.id,
        slot_label: slot.label,
        room_id: room.id,
        room_name: room.name,
        duration_slots: course.duration_slots,
        color: course.color,
        is_locked: this.sessions[i].isLocked,
      });
    }

    const totalPossibleRoomSlots = this.rooms.length * this.days.length * this.slots.length;
    const occupiedRoomSlots = scheduled.reduce((acc, s) => acc + s.duration_slots, 0);
    const roomUtilisation =
      totalPossibleRoomSlots > 0 ? (occupiedRoomSlots / totalPossibleRoomSlots) * 100 : 0;

    const preferenceFit =
      facultyPreferredTotal > 0 ? (facultyPreferredMatches / facultyPreferredTotal) * 100 : 100;

    const unassigned = this.sessions.length - scheduled.length;
    const warnings: string[] = [];
    if (unassigned > 0) {
      warnings.push(`${unassigned} session(s) could not be assigned without hard conflicts.`);
    }

    const endTime = performance.now();

    return {
      institution: "Northbridge Institute of Technology",
      term: "Odd 2026",
      status: hardConflicts === 0 && unassigned === 0 ? "feasible" : "needs_review",
      sessions: scheduled.sort((a, b) => {
        const dayA = this.days.indexOf(a.day);
        const dayB = this.days.indexOf(b.day);
        if (dayA !== dayB) return dayA - dayB;
        const slotA = this.slots.findIndex((s) => s.id === a.slot_id);
        const slotB = this.slots.findIndex((s) => s.id === b.slot_id);
        if (slotA !== slotB) return slotA - slotB;
        return a.group_id.localeCompare(b.group_id);
      }),
      metrics: {
        hard_conflicts: hardConflicts,
        soft_penalty: softPenalty,
        preference_fit: Number(preferenceFit.toFixed(1)),
        room_utilisation: Number(roomUtilisation.toFixed(1)),
        scheduled_sessions: scheduled.length,
        unassigned_sessions: unassigned,
      },
      run: {
        algorithm: "Constraint-aware Genetic Algorithm + Repair + Tabu Search",
        generations: convergence.length,
        tabu_iterations: this.config.tabu_iterations,
        seed: this.config.seed,
        convergence,
        execution_ms: Math.round(endTime - startTime),
        engine: "browser",
      },
      warnings,
    };
  }
}

export function validateCapacity(
  days: string[],
  slots: TimeSlot[],
  rooms: Room[],
  faculty: Faculty[],
  courses: Course[],
): ValidationResult {
  const issues: string[] = [];
  const requiredSlots = courses.reduce((acc, c) => acc + c.weekly_sessions * c.duration_slots, 0);
  const availableSlots = rooms.length * days.length * slots.length;

  if (requiredSlots > availableSlots) {
    issues.push(
      `Insufficient space: ${requiredSlots} session slots requested, but total available capacity is ${availableSlots} slots.`,
    );
  }

  // Check room type and capacity compatibility
  courses.forEach((course) => {
    const matchingRooms = rooms.filter(
      (r) => r.room_type === course.room_type && r.capacity >= course.capacity,
    );
    if (matchingRooms.length === 0) {
      issues.push(
        `Course ${course.id} (${course.name}) requires a '${course.room_type}' room for ≥ ${course.capacity} students, but no matching room exists.`,
      );
    }
  });

  // Check student group capacity
  const groupDemand = new Map<string, number>();
  courses.forEach((course) => {
    groupDemand.set(
      course.group_id,
      (groupDemand.get(course.group_id) || 0) + course.weekly_sessions * course.duration_slots,
    );
  });

  const slotsPerWeek = days.length * slots.length;
  groupDemand.forEach((demand, group) => {
    if (demand > slotsPerWeek) {
      issues.push(
        `Section ${group} requires ${demand} hours/week, but the schedule only has ${slotsPerWeek} time slots available.`,
      );
    }
  });

  // Check faculty load
  const facultyDemand = new Map<string, number>();
  courses.forEach((course) => {
    facultyDemand.set(
      course.faculty_id,
      (facultyDemand.get(course.faculty_id) || 0) + course.weekly_sessions * course.duration_slots,
    );
  });

  const facultyMap = new Map(faculty.map((f) => [f.id, f]));
  facultyDemand.forEach((demand, facultyId) => {
    const f = facultyMap.get(facultyId);
    if (!f) {
      issues.push(`Course references unknown faculty ID: ${facultyId}.`);
    } else {
      const maxPossible = f.max_daily_sessions * days.length;
      if (demand > maxPossible) {
        issues.push(
          `Faculty ${f.name} assigned ${demand} weekly hours, exceeding their maximum weekly limit of ${maxPossible} hours.`,
        );
      }
    }
  });

  return {
    feasible: issues.length === 0,
    issues,
    required_slots: requiredSlots,
    available_slots: availableSlots,
  };
}
