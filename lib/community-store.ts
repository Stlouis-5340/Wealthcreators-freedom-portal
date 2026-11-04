import { activeGuideAccess } from "@/lib/grants";
import {
  challengeById,
  challengeCatalog,
  cleanGroupName,
  encodeEvidence,
  initialEvidence,
  measureProgress,
  parseEvidence,
  parseMemberIds,
  presentEnrollmentForGuide,
  streakSince,
  windowEnd,
  type ChallengeStatus,
  type GuideEnrollmentCard,
  type ProgressFacts,
} from "@/lib/challenges";
import { prisma } from "@/lib/db";
import { emptyLife, type LifeDraft, type LifeView } from "@/lib/life";
import { resolveGoals, totalsFromLines } from "@/lib/metrics";
import { storedPlanForMember } from "@/lib/plan-store";
import {
  achievementCatalog,
  presentAchievement,
  presentAchievementForGuide,
  unlockedKeys,
  type AchievementCard,
  type AchievementFacts,
} from "@/lib/recognition";
import {
  ALEX_CHALLENGE_ID,
  ALEX_ENROLLMENT_ID,
  ALEX_GROUP_ID,
  ALEX_GROUP_NAME,
  alexLifeSeed,
  demoAchievementVisibility,
} from "@/lib/sample-community";
import { addCalendarDays, chicagoDateISO } from "@/lib/week";

export interface GroupView {
  id: string;
  name: string;
  members: { id: string; name: string; self: boolean }[];
}

export interface MemberEnrollmentView {
  id: string;
  challengeId: string;
  title: string;
  summary: string;
  durationDays: number;
  status: ChallengeStatus;
  progress: number;
  endsOn: string;
  checklist: { key: string; label: string; body: string; done: boolean }[] | null;
  memberNote: string;
  group: GroupView | null;
}

export interface MemberChallengePage {
  catalog: {
    id: string;
    title: string;
    summary: string;
    durationDays: number;
    status: ChallengeStatus | null;
  }[];
  enrollments: MemberEnrollmentView[];
}

export interface RecognitionPage {
  unlocked: AchievementCard[];
  ahead: { key: string; title: string; detail: string }[];
}

interface Signals {
  facts: ProgressFacts;
  achievements: AchievementFacts;
}

export async function ensureChallengeCatalog(): Promise<void> {
  for (const item of challengeCatalog) {
    await prisma.challenge.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        title: item.title,
        summary: item.summary,
        durationDays: item.durationDays,
        verifier: item.verifier,
        sort: item.sort,
      },
      update: {
        title: item.title,
        summary: item.summary,
        durationDays: item.durationDays,
        verifier: item.verifier,
        sort: item.sort,
      },
    });
  }
}

export async function loadMemberChallengePage(memberId: string): Promise<MemberChallengePage> {
  await ensureChallengeCatalog();
  const signals = await signalsFor(memberId);
  const rows = await prisma.challengeEnrollment.findMany({
    where: { memberId },
    orderBy: { startedAt: "asc" },
  });
  const refreshed = [];
  for (const row of rows) {
    refreshed.push(await persistProgress(row, signals.facts));
  }
  const groups = await groupsForMember(memberId);
  const names = await memberNames(groups.flatMap((group) => parseMemberIds(group.memberIds)));
  const enrollments = refreshed.flatMap((row) => {
    const view = toMemberEnrollment(row, signals.facts, groups, names, memberId);
    return view ? [view] : [];
  });
  const statusByChallenge = new Map(enrollments.map((item) => [item.challengeId, item.status]));
  return {
    catalog: challengeCatalog.map((item) => ({
      id: item.id,
      title: item.title,
      summary: item.summary,
      durationDays: item.durationDays,
      status: statusByChallenge.get(item.id) ?? null,
    })),
    enrollments,
  };
}

export async function enrollMember(
  memberId: string,
  challengeId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const definition = challengeById(challengeId);
  if (!definition) return { ok: false, message: "That challenge is not in the catalog." };
  await ensureChallengeCatalog();
  const existing = await prisma.challengeEnrollment.findUnique({
    where: { challengeId_memberId: { challengeId, memberId } },
  });
  if (existing && existing.status !== "abandoned") {
    return { ok: false, message: "You are already in this challenge." };
  }
  if (definition.verifier === "lessons") {
    await prisma.lessonCompletion.deleteMany({
      where: { memberId, lessonKey: { in: definition.checklist.map((item) => item.key) } },
    });
  }
  const signals = await signalsFor(memberId);
  const evidence = initialEvidence(definition.verifier, signals.facts);
  const startedAt = new Date();
  const snapshot = measureProgress({
    definition,
    status: "active",
    startedAt,
    evidence,
    facts: signals.facts,
  });
  const data = {
    status: snapshot.status,
    progress: snapshot.progress,
    evidence: encodeEvidence(evidence),
    startedAt,
    endsAt: windowEnd(startedAt, definition.durationDays),
  };
  if (existing) {
    await prisma.challengeEnrollment.update({ where: { id: existing.id }, data });
  } else {
    await prisma.challengeEnrollment.create({ data: { challengeId, memberId, ...data } });
  }
  return { ok: true };
}

export async function abandonEnrollment(
  memberId: string,
  enrollmentId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const row = await ownedEnrollment(memberId, enrollmentId);
  if (!row) return { ok: false, message: "That enrollment is not yours." };
  if (row.status === "abandoned") return { ok: true };
  await prisma.challengeEnrollment.update({
    where: { id: row.id },
    data: { status: "abandoned" },
  });
  return { ok: true };
}

export async function setChecklistItem(
  memberId: string,
  enrollmentId: string,
  key: string,
  done: boolean,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const row = await ownedEnrollment(memberId, enrollmentId);
  if (!row) return { ok: false, message: "That enrollment is not yours." };
  const definition = challengeById(row.challengeId);
  if (!definition || definition.checklist.length === 0) {
    return { ok: false, message: "This challenge is measured from the plan, not a checklist." };
  }
  if (row.status === "abandoned") return { ok: false, message: "This challenge was set aside." };
  const item = definition.checklist.find((entry) => entry.key === key);
  if (!item) return { ok: false, message: "That item is not on this challenge." };
  if (definition.verifier === "lessons") {
    if (done) {
      await prisma.lessonCompletion.upsert({
        where: { memberId_lessonKey: { memberId, lessonKey: key } },
        create: { memberId, lessonKey: key },
        update: {},
      });
    } else {
      await prisma.lessonCompletion.deleteMany({ where: { memberId, lessonKey: key } });
    }
  } else {
    const evidence = parseEvidence(row.evidence);
    if (done) evidence.checks[key] = true;
    else delete evidence.checks[key];
    await prisma.challengeEnrollment.update({
      where: { id: row.id },
      data: { evidence: encodeEvidence(evidence) },
    });
  }
  const signals = await signalsFor(memberId);
  const fresh = await prisma.challengeEnrollment.findUnique({ where: { id: row.id } });
  if (fresh) await persistProgress(fresh, signals.facts);
  return { ok: true };
}

export async function createGroup(
  memberId: string,
  challengeId: string,
  name: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const cleaned = cleanGroupName(name);
  if (!cleaned) return { ok: false, message: "Use a short name, without a bank or a dollar amount." };
  const enrollment = await prisma.challengeEnrollment.findUnique({
    where: { challengeId_memberId: { challengeId, memberId } },
  });
  if (!enrollment || enrollment.status === "abandoned") {
    return { ok: false, message: "Enroll in the challenge before starting a circle." };
  }
  const groups = await prisma.accountabilityGroup.findMany({ where: { challengeId } });
  if (groups.some((group) => parseMemberIds(group.memberIds).includes(memberId))) {
    return { ok: false, message: "You are already in a circle for this challenge." };
  }
  await prisma.accountabilityGroup.create({
    data: {
      challengeId,
      name: cleaned,
      memberIds: JSON.stringify([memberId]),
      createdById: memberId,
    },
  });
  return { ok: true };
}

export async function addGroupMember(
  memberId: string,
  groupId: string,
  email: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const group = await prisma.accountabilityGroup.findUnique({ where: { id: groupId } });
  if (!group) return { ok: false, message: "That circle was not found." };
  const ids = parseMemberIds(group.memberIds);
  if (!ids.includes(memberId)) return { ok: false, message: "You are not in that circle." };
  if (ids.length >= 6) return { ok: false, message: "This circle is full at 6 people." };
  const normalized = email.trim().toLowerCase();
  const person = normalized
    ? await prisma.user.findUnique({ where: { email: normalized }, select: { id: true, role: true } })
    : null;
  const enrolled =
    person && person.role === "member"
      ? await prisma.challengeEnrollment.findUnique({
          where: { challengeId_memberId: { challengeId: group.challengeId, memberId: person.id } },
        })
      : null;
  if (!person || person.role !== "member" || !enrolled || enrolled.status === "abandoned") {
    return { ok: false, message: "They need to be enrolled in this challenge before they can join." };
  }
  if (ids.includes(person.id)) return { ok: false, message: "They are already in this circle." };
  await prisma.accountabilityGroup.update({
    where: { id: group.id },
    data: { memberIds: JSON.stringify([...ids, person.id]) },
  });
  return { ok: true };
}

export async function leaveGroup(
  memberId: string,
  groupId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const group = await prisma.accountabilityGroup.findUnique({ where: { id: groupId } });
  if (!group) return { ok: false, message: "That circle was not found." };
  const ids = parseMemberIds(group.memberIds).filter((id) => id !== memberId);
  if (ids.length === parseMemberIds(group.memberIds).length) {
    return { ok: false, message: "You are not in that circle." };
  }
  if (ids.length === 0) {
    await prisma.accountabilityGroup.delete({ where: { id: group.id } });
    return { ok: true };
  }
  await prisma.accountabilityGroup.update({
    where: { id: group.id },
    data: {
      memberIds: JSON.stringify(ids),
      createdById: ids.includes(group.createdById) ? group.createdById : ids[0],
    },
  });
  return { ok: true };
}

export async function loadMemberRecognition(memberId: string): Promise<RecognitionPage> {
  await syncAchievements(memberId);
  const rows = await prisma.achievement.findMany({
    where: { memberId },
    orderBy: { unlockedAt: "asc" },
  });
  const unlocked = rows.flatMap((row) => {
    const card = presentAchievement({
      key: row.key,
      visibility: row.visibility,
      unlockedAt: row.unlockedAt.toISOString(),
    });
    return card ? [card] : [];
  });
  const have = new Set(unlocked.map((card) => card.key));
  return {
    unlocked,
    ahead: achievementCatalog
      .filter((item) => !have.has(item.key))
      .map((item) => ({ key: item.key, title: item.title, detail: item.detail })),
  };
}

export async function setAchievementVisibility(
  memberId: string,
  key: string,
  visibility: "private" | "guide",
): Promise<{ ok: true } | { ok: false; message: string }> {
  const row = await prisma.achievement.findUnique({ where: { memberId_key: { memberId, key } } });
  if (!row) return { ok: false, message: "That recognition is not unlocked yet." };
  await prisma.achievement.update({ where: { id: row.id }, data: { visibility } });
  return { ok: true };
}

export async function loadMemberLife(memberId: string): Promise<LifeView> {
  const row = await prisma.lifeMetrics.findUnique({ where: { memberId } });
  if (!row) return emptyLife;
  return {
    timeFreedomHours: row.timeFreedomHours,
    familyPriority: row.familyPriority,
    healthStreakDays: row.healthStreakDays,
    experiencesPlanned: row.experiencesPlanned,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function saveMemberLife(memberId: string, draft: LifeDraft): Promise<void> {
  await prisma.lifeMetrics.upsert({
    where: { memberId },
    create: { memberId, ...draft },
    update: draft,
  });
}

export async function loadGuideChallenges(guideId: string, memberId: string): Promise<GuideEnrollmentCard[] | null> {
  const access = await activeGuideAccess(guideId, memberId);
  if (!access) return null;
  await ensureChallengeCatalog();
  const signals = await signalsFor(memberId);
  const rows = await prisma.challengeEnrollment.findMany({ where: { memberId } });
  const groups = await groupsForMember(memberId);
  const cards: GuideEnrollmentCard[] = [];
  for (const row of rows) {
    const fresh = await persistProgress(row, signals.facts);
    const group = groups.find((item) => item.challengeId === fresh.challengeId);
    const card = presentEnrollmentForGuide(
      {
        id: fresh.id,
        challengeId: fresh.challengeId,
        status: fresh.status,
        progress: fresh.progress,
        endsAt: fresh.endsAt,
        evidence: fresh.evidence,
      },
      group ? { name: group.name, size: parseMemberIds(group.memberIds).length } : null,
      access,
    );
    if (card) cards.push(card);
  }
  return cards;
}

export async function loadGuideRecognition(guideId: string, memberId: string): Promise<AchievementCard[] | null> {
  const access = await activeGuideAccess(guideId, memberId);
  if (!access) return null;
  await syncAchievements(memberId);
  const rows = await prisma.achievement.findMany({
    where: { memberId, visibility: "guide" },
    orderBy: { unlockedAt: "asc" },
  });
  return rows.flatMap((row) => {
    const card = presentAchievementForGuide(
      { key: row.key, visibility: row.visibility, unlockedAt: row.unlockedAt.toISOString() },
      access,
    );
    return card ? [card] : [];
  });
}

export async function resetCommunityForMembers(memberIds: string[]): Promise<void> {
  await ensureChallengeCatalog();
  if (memberIds.length === 0) return;
  await prisma.challengeEnrollment.deleteMany({ where: { memberId: { in: memberIds } } });
  await prisma.lessonCompletion.deleteMany({ where: { memberId: { in: memberIds } } });
  await prisma.achievement.deleteMany({ where: { memberId: { in: memberIds } } });
  await prisma.lifeMetrics.deleteMany({ where: { memberId: { in: memberIds } } });
  const groups = await prisma.accountabilityGroup.findMany();
  const drop = groups
    .filter(
      (group) =>
        memberIds.includes(group.createdById) ||
        parseMemberIds(group.memberIds).some((id) => memberIds.includes(id)),
    )
    .map((group) => group.id);
  if (drop.length > 0) {
    await prisma.accountabilityGroup.deleteMany({ where: { id: { in: drop } } });
  }
  if (memberIds.includes("alex")) await seedAlexCommunity();
}

async function seedAlexCommunity(): Promise<void> {
  const memberId = "alex";
  const definition = challengeById(ALEX_CHALLENGE_ID);
  if (!definition) return;
  const startedAt = new Date(`${addCalendarDays(chicagoDateISO(new Date()), -10)}T18:00:00.000Z`);
  const evidence = initialEvidence(definition.verifier, { freedomScore: null, totalLiabilities: 0 });
  await prisma.challengeEnrollment.create({
    data: {
      id: ALEX_ENROLLMENT_ID,
      challengeId: definition.id,
      memberId,
      status: "active",
      progress: 0,
      evidence: encodeEvidence(evidence),
      startedAt,
      endsAt: windowEnd(startedAt, definition.durationDays),
    },
  });
  await prisma.accountabilityGroup.create({
    data: {
      id: ALEX_GROUP_ID,
      challengeId: definition.id,
      name: ALEX_GROUP_NAME,
      memberIds: JSON.stringify([memberId]),
      createdById: memberId,
    },
  });
  const life = alexLifeSeed();
  await prisma.lifeMetrics.create({ data: { memberId, ...life } });
  const signals = await signalsFor(memberId);
  const row = await prisma.challengeEnrollment.findUnique({ where: { id: ALEX_ENROLLMENT_ID } });
  if (row) await persistProgress(row, signals.facts);
  await syncAchievements(memberId);
  const keys = unlockedKeys(signals.achievements);
  for (const key of keys) {
    await prisma.achievement.updateMany({
      where: { memberId, key },
      data: { visibility: demoAchievementVisibility(key) },
    });
  }
}

async function syncAchievements(memberId: string): Promise<void> {
  const signals = await signalsFor(memberId);
  for (const key of unlockedKeys(signals.achievements)) {
    await prisma.achievement.upsert({
      where: { memberId_key: { memberId, key } },
      create: { memberId, key, visibility: "private" },
      update: {},
    });
  }
}

async function signalsFor(memberId: string, now = new Date()): Promise<Signals> {
  const plan = await storedPlanForMember(memberId);
  const metrics = plan ? totalsFromLines(plan) : null;
  const goalCompleted = Boolean(
    plan && metrics && resolveGoals(plan.goals, metrics).some((goal) => goal.progress >= 100),
  );
  const [checkIns, lessons, reports] = await Promise.all([
    prisma.weeklyCheckIn.findMany({ where: { memberId }, select: { weekKey: true } }),
    prisma.lessonCompletion.findMany({ where: { memberId }, select: { lessonKey: true } }),
    prisma.monthlyReport.count({ where: { memberId } }),
  ]);
  const checkInWeeks = checkIns.map((row) => row.weekKey);
  const facts: ProgressFacts = {
    freedomScore: metrics?.freedomScore ?? null,
    totalLiabilities: metrics?.totalLiabilities ?? 0,
    checkInWeeks,
    completedLessonKeys: lessons.map((row) => row.lessonKey),
    now,
  };
  return {
    facts,
    achievements: {
      hasReport: reports > 0,
      monthlyPassive: metrics?.monthlyPassive ?? 0,
      freedomScore: facts.freedomScore,
      goalCompleted,
      consecutiveCheckIns: streakSince(checkInWeeks, "0000-01-01", now),
      lessonCompleted: facts.completedLessonKeys.length > 0,
    },
  };
}

async function persistProgress(
  row: {
    id: string;
    challengeId: string;
    memberId: string;
    status: string;
    progress: number;
    evidence: string;
    startedAt: Date;
    endsAt: Date;
  },
  facts: ProgressFacts,
) {
  const definition = challengeById(row.challengeId);
  const status = isStatus(row.status) ? row.status : "active";
  if (!definition) return { ...row, status };
  const snapshot = measureProgress({
    definition,
    status,
    startedAt: row.startedAt,
    evidence: parseEvidence(row.evidence),
    facts,
  });
  if (snapshot.progress !== Math.round(row.progress) || snapshot.status !== status) {
    await prisma.challengeEnrollment.update({
      where: { id: row.id },
      data: { progress: snapshot.progress, status: snapshot.status },
    });
  }
  return { ...row, progress: snapshot.progress, status: snapshot.status };
}

function toMemberEnrollment(
  row: {
    id: string;
    challengeId: string;
    status: ChallengeStatus;
    progress: number;
    evidence: string;
    startedAt: Date;
    endsAt: Date;
  },
  facts: ProgressFacts,
  groups: { id: string; challengeId: string; name: string; memberIds: string }[],
  names: Map<string, string>,
  memberId: string,
): MemberEnrollmentView | null {
  const definition = challengeById(row.challengeId);
  if (!definition || !isStatus(row.status)) return null;
  const snapshot = measureProgress({
    definition,
    status: row.status,
    startedAt: row.startedAt,
    evidence: parseEvidence(row.evidence),
    facts,
  });
  const group = groups.find((item) => item.challengeId === row.challengeId);
  return {
    id: row.id,
    challengeId: definition.id,
    title: definition.title,
    summary: definition.summary,
    durationDays: definition.durationDays,
    status: snapshot.status,
    progress: snapshot.progress,
    endsOn: chicagoDateISO(row.endsAt),
    checklist: snapshot.checklist,
    memberNote: snapshot.memberNote,
    group: group
      ? {
          id: group.id,
          name: group.name,
          members: parseMemberIds(group.memberIds).map((id) => ({
            id,
            name: names.get(id) ?? "Member",
            self: id === memberId,
          })),
        }
      : null,
  };
}

async function groupsForMember(memberId: string) {
  const groups = await prisma.accountabilityGroup.findMany();
  return groups.filter((group) => parseMemberIds(group.memberIds).includes(memberId));
}

async function memberNames(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const people = await prisma.user.findMany({
    where: { id: { in: ids }, role: "member" },
    select: { id: true, name: true },
  });
  return new Map(people.map((person) => [person.id, person.name]));
}

async function ownedEnrollment(memberId: string, enrollmentId: string) {
  const row = await prisma.challengeEnrollment.findUnique({ where: { id: enrollmentId } });
  if (!row || row.memberId !== memberId) return null;
  return row;
}

function isStatus(value: string): value is ChallengeStatus {
  return value === "active" || value === "completed" || value === "abandoned";
}
