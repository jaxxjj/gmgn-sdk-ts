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
  operation?: string;
  attempt?: number;
  reason?:
    | "invalid_envelope"
    | "response_too_large"
    | "rate_limit_blocked"
    | "invalid_parameters"
    | "request_preparation";
  status?: number;
  apiCode?: number;
  retryAfterMs?: number;
  outcomeUnknown?: boolean;
}

/** Safe to log: never contains credentials, response bodies or upstream messages. */
export class GmgnError extends Error {
  readonly operation?: string;
  readonly attempt?: number;
  readonly reason?: ErrorDetails["reason"];
  readonly kind: ErrorKind;
  readonly status?: number;
  readonly apiCode?: number;
  readonly retryAfterMs?: number;
  readonly outcomeUnknown: boolean;

  constructor(kind: ErrorKind, details: ErrorDetails = {}) {
    super(`GMGN ${kind} error${details.status ? ` (HTTP ${details.status})` : ""}`);
    this.name = "GmgnError";
    this.operation = details.operation;
    this.attempt = details.attempt;
    this.reason = details.reason;
    this.kind = kind;
    this.status = details.status;
    this.apiCode = details.apiCode;
    this.retryAfterMs = details.retryAfterMs;
    this.outcomeUnknown = details.outcomeUnknown ?? false;
  }
}
