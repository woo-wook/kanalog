import type { Course } from "./api";
export function recommendLesson(courses: Course[], activeId?: string | null) {
  const ordered = [...courses].sort((a, b) => a.position - b.position);
  const activeCourse = ordered.find((c) =>
    c.lessons.some((l) => l.id === activeId),
  );
  const active = activeCourse?.lessons.find((l) => l.id === activeId);
  if (
    activeCourse &&
    active &&
    active.totalCards > 0 &&
    (!active.completed || active.dueCount > 0)
  )
    return { course: activeCourse, lesson: active };
  for (const course of ordered) {
    const lesson = course.lessons.find(
      (l) => l.totalCards > 0 && !l.optional && !l.completed,
    );
    if (lesson) return { course, lesson };
  }
  for (const course of ordered) {
    const lesson = course.lessons.find(
      (l) => l.totalCards > 0 && (l.dueCount > 0 || !l.completed),
    );
    if (lesson) return { course, lesson };
  }
  return activeCourse && active && active.totalCards > 0
    ? { course: activeCourse, lesson: active }
    : null;
}
