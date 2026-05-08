import type { EngineRunSnapshot } from '../../../api/contracts';
import type { TimelineMutableState } from '../../../domain/timeline';
import {
  projectAgentGroupTimelineMessages,
  type WorkbenchTimelineMessage,
} from './agent-group-projection';

type ProjectionParams = {
  fallbackTimeline?: TimelineMutableState;
  selectedRun?: EngineRunSnapshot;
  timelineByThreadId?: Record<string, TimelineMutableState>;
};

export type { WorkbenchTimelineMessage };

export function projectTimelineMessages({
  fallbackTimeline,
  selectedRun,
  timelineByThreadId,
}: ProjectionParams): WorkbenchTimelineMessage[] {
  return projectAgentGroupTimelineMessages({
    selectedRun,
    timelineByThreadId,
    fallbackTimeline,
  });
}
