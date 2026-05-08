export type ExecCommandSource =
  | "agent"
  | "user_shell"
  | "unified_exec_interaction"
  | "unknown";

export type ParsedCommand =
  | { kind: "read"; path?: string }
  | { kind: "list_files"; path?: string }
  | { kind: "search"; query?: string }
  | { kind: "unknown"; raw?: unknown };

export type CommandOutput = {
  exitCode: number;
  aggregatedOutput: string;
  formattedOutput: string;
};

export type ExecCall = {
  callId: string;
  command: string[];
  parsed: ParsedCommand[];
  output?: CommandOutput;
  source: ExecCommandSource;
  startTimeMs?: number;
  durationMs?: number;
  interactionInput?: string;
};

function isExploringParsedCommand(parsed: ParsedCommand): boolean {
  return parsed.kind === "read" || parsed.kind === "list_files" || parsed.kind === "search";
}

export class ExecCell {
  public calls: ExecCall[];
  private readonly animations: boolean;

  constructor(call: ExecCall, animationsEnabled: boolean) {
    this.calls = [call];
    this.animations = animationsEnabled;
  }

  public withAddedCall(
    callId: string,
    command: string[],
    parsed: ParsedCommand[],
    source: ExecCommandSource,
    interactionInput?: string,
    nowMs: number = Date.now(),
  ): ExecCell | null {
    const call: ExecCall = {
      callId,
      command,
      parsed,
      output: undefined,
      source,
      startTimeMs: nowMs,
      durationMs: undefined,
      interactionInput,
    };

    if (this.isExploringCell() && ExecCell.isExploringCall(call)) {
      return this.withCalls([...this.calls, call]);
    }

    return null;
  }

  private withCalls(calls: ExecCall[]): ExecCell {
    const cell = new ExecCell(calls[0], this.animations);
    cell.calls = calls;
    return cell;
  }

  public completeCall(callId: string, output: CommandOutput, durationMs: number): boolean {
    for (let i = this.calls.length - 1; i >= 0; i -= 1) {
      const call = this.calls[i];
      if (call.callId !== callId) continue;

      this.calls[i] = {
        ...call,
        output,
        durationMs,
        startTimeMs: undefined,
      };
      return true;
    }
    return false;
  }

  public shouldFlush(): boolean {
    return !this.isExploringCell() && this.calls.every((call) => call.output !== undefined);
  }

  public markFailed(nowMs: number = Date.now()): void {
    for (let i = 0; i < this.calls.length; i += 1) {
      const call = this.calls[i];
      if (call.output !== undefined) continue;

      const elapsed =
        typeof call.startTimeMs === "number" ? Math.max(0, nowMs - call.startTimeMs) : 0;
      this.calls[i] = {
        ...call,
        startTimeMs: undefined,
        durationMs: elapsed,
        output: {
          exitCode: 1,
          formattedOutput: "",
          aggregatedOutput: "",
        },
      };
    }
  }

  public isExploringCell(): boolean {
    return this.calls.length > 0 && this.calls.every(ExecCell.isExploringCall);
  }

  public isActive(): boolean {
    return this.calls.some((call) => call.output === undefined);
  }

  public activeStartTimeMs(): number | undefined {
    const call = this.calls.find((entry) => entry.output === undefined);
    return call?.startTimeMs;
  }

  public animationsEnabled(): boolean {
    return this.animations;
  }

  public iterCalls(): Iterable<ExecCall> {
    return this.calls;
  }

  public appendOutput(callId: string, chunk: string): boolean {
    if (!chunk) {
      return false;
    }

    for (let i = this.calls.length - 1; i >= 0; i -= 1) {
      const call = this.calls[i];
      if (call.callId !== callId) continue;

      const output: CommandOutput = call.output ?? {
        exitCode: 0,
        aggregatedOutput: "",
        formattedOutput: "",
      };

      this.calls[i] = {
        ...call,
        output: {
          ...output,
          aggregatedOutput: `${output.aggregatedOutput}${chunk}`,
        },
      };
      return true;
    }

    return false;
  }

  public static isExploringCall(call: ExecCall): boolean {
    if (call.source === "user_shell") return false;
    if (call.parsed.length === 0) return false;
    return call.parsed.every(isExploringParsedCommand);
  }
}

export function isUserShellCommand(call: ExecCall): boolean {
  return call.source === "user_shell";
}

export function isUnifiedExecInteraction(call: ExecCall): boolean {
  return call.source === "unified_exec_interaction";
}
