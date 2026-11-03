import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { LessonPanel } from "@/components/lesson-panel";
import { openLesson } from "@/lib/education-store";
import { requireMember } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Lesson",
};

export const instant = false;

export default async function Page({ params }: { params: Promise<{ lessonId: string }> }) {
  const member = await requireMember();
  if (!member) redirect("/login");
  const { lessonId } = await params;
  const lesson = await openLesson(member.id, lessonId);
  if (!lesson) notFound();
  return <LessonPanel lesson={lesson} />;
}
