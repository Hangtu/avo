export interface DeckSelection {
  primaryId: string | null;
  secondaryId: string | null;
}

export type DeckRole = "front" | "back" | "hidden";

export const DECK_BACK_SCALE = 0.95;
export const DECK_TURN_DURATION = 0.48;

export function resolveDeckSelection(ids: readonly string[], selection: DeckSelection): DeckSelection {
  const primaryId = ids.find((id) => id === selection.primaryId) ?? ids[0] ?? null;
  const secondaryId =
    ids.find((id) => id !== primaryId && id === selection.secondaryId) ??
    ids.find((id) => id !== primaryId) ??
    null;
  return { primaryId, secondaryId };
}

export function promoteDeckSelection(selection: DeckSelection): DeckSelection {
  if (!selection.secondaryId) return selection;
  return { primaryId: selection.secondaryId, secondaryId: selection.primaryId };
}

function turnAmount(progress: number): number {
  return (1 - Math.cos(Math.PI * Math.max(0, Math.min(1, progress)))) / 2;
}

export function deckTransform(
  role: DeckRole,
  progress: number,
  width: number,
  height: number,
  reveal: number,
): string {
  const amount = turnAmount(progress);
  const depth = role === "front" ? amount : 1 - amount;
  const arc = progress <= 0 || progress >= 1 ? 0 : Math.sin(Math.PI * amount);
  const direction = role === "front" ? 1 : -1;
  const x = direction * arc * Math.min(28, width * 0.06);
  const y = depth * (reveal + height * (1 - DECK_BACK_SCALE)) + arc * (role === "front" ? 12 : -16);
  const scale = 1 - depth * (1 - DECK_BACK_SCALE) - (role === "front" ? arc * 0.015 : 0);
  return `translate3d(${x}px, ${y}px, 0) scale(${scale}) rotateX(${direction * arc * 4}deg) rotateZ(${direction * arc * 2.5}deg)`;
}

export function deckLayer(role: DeckRole, progress: number): number {
  if (role === "hidden") return 0;
  return (role === "front") === progress < 0.5 ? 2 : 1;
}

export function deckContentOpacity(role: DeckRole, progress: number): number {
  if (role === "hidden") return 0;
  const start = role === "front" ? 0.16 : 0.4;
  const end = role === "front" ? 0.46 : 0.72;
  const amount = turnAmount((progress - start) / (end - start));
  return role === "front" ? 1 - amount : amount;
}

export function deckPreviewOpacity(role: DeckRole, progress: number): number {
  if (role === "hidden") return 0;
  return role === "front" ? turnAmount((progress - 0.5) / 0.26) : 1 - turnAmount((progress - 0.08) / 0.24);
}
