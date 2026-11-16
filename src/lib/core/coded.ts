/** An error with a fixed reason code, so the page can show a plain message and count it. */
export class CodedError extends Error {
  constructor(
    public reason: string,
    message: string,
  ) {
    super(message);
  }
}
