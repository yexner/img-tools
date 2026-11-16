/** The password / confirm prompts a run can raise, shown one at a time by `AskDialog`. */
export interface Asking {
  label: string;
  secret: boolean;
  /** A message with Continue / Cancel and no text field. */
  confirm: boolean;
  resolve: (v: string | null) => void;
}

export function createPrompts() {
  let asking = $state<Asking | null>(null);

  // Dialogs are shown one at a time, even when several files ask at once.
  let dialogs: Promise<unknown> = Promise.resolve();
  function queued<T>(show: () => Promise<T>): Promise<T> {
    const next = dialogs.then(show);
    dialogs = next.catch(() => {});
    return next;
  }

  return {
    get asking() {
      return asking;
    },
    ask: (prompt: { label: string; secret?: boolean }) =>
      queued(
        () =>
          new Promise<string | null>((resolve) => {
            asking = {
              label: prompt.label,
              secret: prompt.secret ?? false,
              confirm: false,
              resolve,
            };
          }),
      ),
    confirm: (message: string) =>
      queued(
        () =>
          new Promise<boolean>((resolve) => {
            asking = {
              label: message,
              secret: false,
              confirm: true,
              resolve: (v) => resolve(v !== null),
            };
          }),
      ),
    submit(value: string) {
      asking?.resolve(value);
      asking = null;
    },
    cancel() {
      asking?.resolve(null);
      asking = null;
    },
  };
}
