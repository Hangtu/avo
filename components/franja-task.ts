import type { TaskBlock } from "@/lib/domain/schedule";

/** The compact task shape shared by the hand, the countdown and the day review. */
export interface FranjaTask {
  id: string;
  occurrenceId: string;
  title: string;
  durationMin: number;
  category: string;
  shortStepTitle?: string;
  shortStepMin?: number;
  shortStepDone: boolean;
  remainingMin: number;
  remainingRc: number;
  block: TaskBlock;
  isMissed: boolean;
}
