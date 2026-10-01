import type { Curriculum } from "./api";

export function nextCurriculumLesson(curriculum?: Curriculum) {
  if (!curriculum?.recommendedLessonId) return null;
  for (const level of curriculum.levels) {
    if (!level.available) continue;
    for (const unit of level.units) {
      const lesson = unit.lessons.find(
        (candidate) =>
          candidate.id === curriculum.recommendedLessonId &&
          candidate.totalCards > 0,
      );
      if (lesson) return { level, unit, lesson };
    }
  }
  return null;
}
