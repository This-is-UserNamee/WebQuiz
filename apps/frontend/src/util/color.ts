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
  | "error"
  | "1st"
  | "2nd"
  | "3rd"
  | "shadow"
  | "dissable"
  | "graprimary"
  | "graprimarydark";

export const ct2css = (color: ColorType) => {
  return `var(--bc-${color})`;
};
