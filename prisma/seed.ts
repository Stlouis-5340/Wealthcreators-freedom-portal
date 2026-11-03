import { prisma } from "../lib/db";
import { hashPassword } from "../lib/passwords";
import { replaceMemberPlan } from "../lib/plan-store";
import { demoActivity } from "../lib/sample-activity";
import { assignmentSeeds, guideSeed, memberSeeds } from "../lib/sample-plans";

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
    },
    update: {
      email: guide.email,
      passwordHash: hashPassword(guide.password),
      name: guide.name,
      role: guide.role,
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
      },
      update: {
        email: member.email,
        name: member.name,
        role: member.role,
        lastActive: member.lastActive,
        coachingNote: member.coachingNote,
        rosterSort: member.rosterSort,
        ...(member.id === "alex" ? { passwordHash: hashPassword(member.password) } : {}),
      },
    });
    await replaceMemberPlan(member.id, member.plan);
  }

  const assignments = assignmentSeeds();
  await prisma.guideAssignment.deleteMany({ where: { guideId: guide.id } });
  await prisma.guideAssignment.createMany({ data: assignments });

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
