import { getProject } from "@theatre/core";

// Si existe src/theatre-state.json (exportado desde el estudio), se usa.
// Si no existe, la intro usa una animación calculada por código (EyeDive).
const files = import.meta.glob("./theatre-state.json", {
  eager: true,
  import: "default",
});
const state = files["./theatre-state.json"];

export const hasState = Boolean(state);
export const EDIT = new URLSearchParams(window.location.search).has("edit");

export const project = getProject("Gato", state ? { state } : undefined);
export const sheet = project.sheet("Intro");
