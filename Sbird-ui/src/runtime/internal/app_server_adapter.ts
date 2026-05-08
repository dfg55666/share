import type { EngineRunSnapshot, ThreadSummary } from "../../api/contracts";
import { ApiClient } from "../../api";
import { AppServerSession } from "../AppServerSession";

export type AppServerAdapterConfig = {
  apiPrefix?: string;
};

export function createAppServerSession(config?: AppServerAdapterConfig): AppServerSession {
  return new AppServerSession(new ApiClient(config?.apiPrefix ?? "/api"));
}

export function createDefaultAppServerSession(): AppServerSession {
  return createAppServerSession();
}

function runDisplayName(run: EngineRunSnapshot): string {
  return `${run.runId} · ${run.workflowKey}`;
}

function agentLabel(agentId: string): string {
  const normalized = agentId.trim();
  if (!normalized) return "Agent";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function buildThreadPreview(run: EngineRunSnapshot): string {
  const parts = [run.workflowKey];
  if (run.currentStep) parts.push(`step ${run.currentStep}`);
  if (run.status) parts.push(run.status);
  return parts.join(" · ");
}

function buildThreadSummary(
  run: EngineRunSnapshot,
  agentId: string,
  threadId: string,
  threadName: string | undefined,
  inProgress: boolean,
): ThreadSummary {
  const title = threadName?.trim() ? threadName.trim() : agentLabel(agentId);
  const previewParts = [buildThreadPreview(run)];
  if (inProgress) previewParts.push("running");

  return {
    id: threadId,
    title,
    projectName: run.runId,
    cwd: `${run.runRoot}/workspace`,
    hasWorktree: false,
    createdAtIso: "",
    updatedAtIso: "",
    preview: previewParts.join(" · "),
    unread: false,
    inProgress,
  };
}

export async function listThreadsFromRuns(session: AppServerSession): Promise<{
  threads: ThreadSummary[];
  projectDisplayNameById: Record<string, string>;
}> {
  const runs = await session.listRuns();
  const threads: ThreadSummary[] = [];
  const projectDisplayNameById: Record<string, string> = {};
  const seen = new Set<string>();

  for (const run of runs) {
    projectDisplayNameById[run.runId] = runDisplayName(run);

    const agentSessions = run.agentSessions?.agents ?? {};
    const agentActivity = run.agentActivity ?? {};
    const agentIds = Object.keys(agentSessions).sort((a, b) => a.localeCompare(b));

    const entryAgent = run.agentSessions?.entryAgent?.trim();
    const orderedAgentIds =
      entryAgent && agentIds.includes(entryAgent)
        ? [entryAgent, ...agentIds.filter((id) => id !== entryAgent)]
        : agentIds;

    for (const agentId of orderedAgentIds) {
      const entry = agentSessions[agentId];
      const threadId = entry?.threadId?.trim() ?? "";
      if (!threadId || seen.has(threadId)) continue;
      seen.add(threadId);

      const activity = agentActivity[agentId];
      const statusType = activity?.status?.type?.trim() ?? "";
      const inProgress = statusType === "active";
      threads.push(
        buildThreadSummary(run, agentId, threadId, entry?.threadName, inProgress),
      );
    }
  }

  return { threads, projectDisplayNameById };
}
