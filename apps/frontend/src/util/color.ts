export type ColorType =
  | "primary"
  | "secondary"
  | "card"
  | "section"
  | "main"
  | "text"
  | "subtext"
  | "accent"
  | "bg"
  | "error";

export const ct2css = (color: ColorType) => {
  return `var(--bc-${color})`;
};
