/** In-memory hand-off of dropped files from the home page to a tool (not stored anywhere). */
let pending: File[] = [];

export function setHandoff(files: File[]): void {
  pending = files;
}

export function takeHandoff(): File[] {
  const files = pending;
  pending = [];
  return files;
}
