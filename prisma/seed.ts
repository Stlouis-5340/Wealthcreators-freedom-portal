import { fullGuideAccess, serializeGuideAccess } from "../lib/access";
import { demoAccounts } from "../lib/demo-accounts";
import { prisma } from "../lib/db";
import { hashPassword } from "../lib/passwords";
import { replaceMemberPlan } from "../lib/plan-store";
import { encodeReportJson } from "../lib/report";
import { demoActivity } from "../lib/sample-activity";
import { alexPriorReport } from "../lib/sample-reports";
import { seedAlexCoach } from "../lib/coach-store";
import { chicagoMonthKey } from "../lib/month";
import { seedEducationAndHub } from "../lib/learn-seed";
import { resetMemberScenarios } from "../lib/scenario-store";
import { assignmentSeeds, guideSeed, memberSeeds } from "../lib/sample-plans";

const clearedSecurity = {
  isActive: true,
  mfaEnabled: false,
  mfaSecretEnc: "",
  mfaPendingSecretEnc: "",
  mfaRecoveryHashes: "[]",
};

async function main() {
  const guide = guideSeed();
  await prisma.user.upsert({
    where: { id: guide.id },
    create: {
      id: guide.id,
      email: guide.email,
      passwordHash: hashPassword(guide.password),
      name: guide.name,
      role: guide.role,
      lastActive: "2026-10-27",
      coachingNote: "",
      rosterSort: 0,
      ...clearedSecurity,
    },
    update: {
      email: guide.email,
      passwordHash: hashPassword(guide.password),
      name: guide.name,
      role: guide.role,
      ...clearedSecurity,
    },
  });

  for (const member of memberSeeds()) {
    await prisma.user.upsert({
      where: { id: member.id },
      create: {
        id: member.id,
        email: member.email,
        passwordHash: hashPassword(member.password),
        name: member.name,
        role: member.role,
        lastActive: member.lastActive,
        coachingNote: member.coachingNote,
        rosterSort: member.rosterSort,
        ...clearedSecurity,
      },
      update: {
        email: member.email,
        name: member.name,
        role: member.role,
        lastActive: member.lastActive,
        coachingNote: member.coachingNote,
        rosterSort: member.rosterSort,
        ...clearedSecurity,
        ...(member.id === "alex" ? { passwordHash: hashPassword(member.password) } : {}),
      },
    });
    await replaceMemberPlan(member.id, member.plan);
  }

  const assignments = assignmentSeeds();
  await prisma.guideAssignment.deleteMany({ where: { guideId: guide.id } });
  await prisma.guideAssignment.createMany({ data: assignments });
  await prisma.guideAccessGrant.deleteMany({ where: { guideId: guide.id } });
  await prisma.guideAccessGrant.createMany({
    data: assignments.map((assignment) => ({
      guideId: assignment.guideId,
      memberId: assignment.memberId,
      scopes: serializeGuideAccess(fullGuideAccess),
    })),
  });

  const admin = demoAccounts.find((account) => account.role === "admin");
  if (!admin) throw new Error("Admin demo account is missing.");
  await prisma.user.upsert({
    where: { id: admin.id },
    create: {
      id: admin.id,
      email: admin.email,
      passwordHash: hashPassword(admin.password),
      name: admin.name,
      role: admin.role,
      lastActive: "2026-11-03",
      coachingNote: "",
      rosterSort: 0,
      ...clearedSecurity,
    },
    update: {
      email: admin.email,
      passwordHash: hashPassword(admin.password),
      name: admin.name,
      role: admin.role,
      ...clearedSecurity,
    },
  });
  await prisma.auditLog.deleteMany();

  const memberIds = memberSeeds().map((member) => member.id);
  const activity = demoActivity();
  await prisma.weeklyCheckIn.deleteMany({ where: { memberId: { in: memberIds } } });
  await prisma.coachingNote.deleteMany({ where: { memberId: { in: memberIds } } });
  await prisma.coachingTask.deleteMany({ where: { memberId: { in: memberIds } } });
  if (activity.checkIns.length > 0) {
    await prisma.weeklyCheckIn.createMany({
      data: activity.checkIns.map((checkIn) => ({
        id: checkIn.id,
        memberId: checkIn.memberId,
        weekKey: checkIn.weekKey,
        win: checkIn.win,
        challenge: checkIn.challenge,
        actionStatus: checkIn.actionStatus,
        commitment: checkIn.commitment,
        needsSupport: checkIn.needsSupport,
        supportNote: checkIn.supportNote,
        summary: checkIn.summary,
        freedomScore: checkIn.freedomScore,
        monthlyFreedomGap: checkIn.monthlyFreedomGap,
        qualityScore: checkIn.qualityScore,
        submittedAt: new Date(checkIn.submittedAt),
        updatedAt: new Date(checkIn.updatedAt),
      })),
    });
  }
  if (activity.notes.length > 0) {
    await prisma.coachingNote.createMany({
      data: activity.notes.map((note) => ({
        id: note.id,
        memberId: note.memberId,
        guideId: note.guideId,
        body: note.body,
        createdAt: new Date(note.createdAt),
      })),
    });
  }
  if (activity.tasks.length > 0) {
    await prisma.coachingTask.createMany({
      data: activity.tasks.map((task) => ({
        id: task.id,
        memberId: task.memberId,
        guideId: task.guideId,
        title: task.title,
        dueDate: task.dueDate,
        status: task.status,
        createdAt: new Date(task.createdAt),
        updatedAt: new Date(task.updatedAt),
      })),
    });
  }

  const prior = alexPriorReport();
  const encoded = encodeReportJson(prior);
  await prisma.monthlyReport.deleteMany({ where: { memberId: { in: memberIds } } });
  await prisma.monthlyReport.create({
    data: {
      id: `alex-${prior.monthKey}`,
      memberId: "alex",
      monthKey: prior.monthKey,
      freedomScore: prior.freedomScore,
      gap: prior.gap,
      quality: prior.quality,
      passive: prior.passive,
      expenses: prior.expenses,
      netWorth: prior.netWorth,
      yieldOnAssets: prior.yieldOnAssets,
      goalsSummary: encoded.goalsSummary,
      milestones: encoded.milestones,
      actions: encoded.actions,
      generatedAt: new Date(prior.generatedAt),
    },
  });

  await resetMemberScenarios(memberIds);
  await seedEducationAndHub(memberIds);
  await seedAlexCoach(chicagoMonthKey());
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
