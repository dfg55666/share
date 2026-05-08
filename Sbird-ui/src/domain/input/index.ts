export type PendingInputEntry =
  | { kind: "steer"; text: string }
  | { kind: "queued"; text: string };

export type { ThreadSendMode } from '../../api/contracts'

export type WorkbenchSendMode = 'queue' | 'steer'
