export type ColorType =
  | "primary"
  | "secondary"
  | "card"
  | "section"
  | "main"
  | "text"
  | "subtext"
  | "accent"
  | "bg";

export const ct2css = (color: ColorType) => {
  return `var(--bc-${color})`;
};
