import { prisma } from "../lib/db";
import { hashPassword } from "../lib/passwords";
import { replaceMemberPlan } from "../lib/plan-store";
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
