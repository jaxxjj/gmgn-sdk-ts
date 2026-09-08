export type ErrorKind =
  | "configuration"
  | "authentication"
  | "http"
  | "api"
  | "protocol"
  | "network"
  | "timeout"
  | "aborted"
  | "execution_disabled";

export interface ErrorDetails {
  status?: number;
  apiCode?: number;
  retryAfterMs?: number;
  outcomeUnknown?: boolean;
}

/** Safe to log: never contains credentials, response bodies or upstream messages. */
export class GmgnError extends Error {
  readonly kind: ErrorKind;
  readonly status?: number;
  readonly apiCode?: number;
  readonly retryAfterMs?: number;
  readonly outcomeUnknown: boolean;

  constructor(kind: ErrorKind, details: ErrorDetails = {}) {
    super(`GMGN ${kind} error${details.status ? ` (HTTP ${details.status})` : ""}`);
    this.name = "GmgnError";
    this.kind = kind;
    this.status = details.status;
    this.apiCode = details.apiCode;
    this.retryAfterMs = details.retryAfterMs;
    this.outcomeUnknown = details.outcomeUnknown ?? false;
  }
}
