// Web port of `tuitoweb/src/bottom_pane/mcp_server_elicitation.rs`.
//
// This module keeps the request lifecycle and form/approval resolution model.

import type {
  BottomPaneView,
  CancellationEvent,
  McpServerElicitationFormRequest as BaseElicitationRequest,
} from "./bottom_pane_view";

const APPROVAL_FIELD_ID = "__approval";
const APPROVAL_DEFAULT_CHOICES = [
  { label: "Allow", value: "accept", description: "Run the tool and continue." },
  { label: "Deny", value: "decline", description: "Decline this tool call and continue." },
  { label: "Cancel", value: "cancel", description: "Cancel this tool call." },
] as const;

export type McpServerElicitationFormRequest = BaseElicitationRequest & {
  payload?: unknown;
};

export type ElicitationFieldOption = {
  label: string;
  value: string;
  description?: string | null;
};

export type ElicitationField =
  | {
      id: string;
      label: string;
      prompt: string;
      required: boolean;
      type: "select";
      options: ElicitationFieldOption[];
    }
  | {
      id: string;
      label: string;
      prompt: string;
      required: boolean;
      type: "text";
      secret: boolean;
    };

export type McpServerElicitationResolution = {
  serverName: string;
  requestId: string;
  mode: "form" | "approval";
  values: Record<string, unknown>;
  action?: "accept" | "decline" | "cancel" | "accept_session" | "accept_always";
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function parseSelectOptions(raw: unknown): ElicitationFieldOption[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === "string") {
        return { label: item, value: item };
      }
      const rec = asRecord(item);
      if (!rec) return null;
      const label = asString(rec.label, asString(rec.name, asString(rec.value)));
      if (!label) return null;
      return {
        label,
        value: asString(rec.value, label),
        description: rec.description ? asString(rec.description) : null,
      };
    })
    .filter(Boolean) as ElicitationFieldOption[];
}

function parseExplicitFields(payload: Record<string, unknown>): ElicitationField[] {
  if (!Array.isArray(payload.fields)) return [];

  const out: ElicitationField[] = [];
  for (const field of payload.fields) {
    const rec = asRecord(field);
    if (!rec) continue;

    const id = asString(rec.id);
    const label = asString(rec.label, id);
    const prompt = asString(rec.prompt, label);
    const required = asBoolean(rec.required, false);
    const type = asString(rec.type, "text");
    if (!id) continue;

    if (type === "select") {
      const options = parseSelectOptions(rec.options);
      out.push({ id, label, prompt, required, type: "select", options });
      continue;
    }

    out.push({
      id,
      label,
      prompt,
      required,
      type: "text",
      secret: asBoolean(rec.secret, false),
    });
  }

  return out;
}

function parseSchemaFields(payload: Record<string, unknown>): ElicitationField[] {
  const schema = asRecord(payload.requested_schema ?? payload.requestedSchema ?? payload.schema);
  if (!schema) return [];

  const properties = asRecord(schema.properties);
  const requiredArray = Array.isArray(schema.required)
    ? new Set(schema.required.filter((item): item is string => typeof item === "string"))
    : new Set<string>();
  if (!properties) return [];

  const fields: ElicitationField[] = [];
  for (const [id, rawSchema] of Object.entries(properties)) {
    const propertySchema = asRecord(rawSchema);
    if (!propertySchema) continue;

    const label = asString(propertySchema.title, id);
    const prompt = asString(propertySchema.description, label);
    const required = requiredArray.has(id);
    const enumOptions = parseSelectOptions(propertySchema.enum);

    if (enumOptions.length > 0) {
      fields.push({
        id,
        label,
        prompt,
        required,
        type: "select",
        options: enumOptions,
      });
      continue;
    }

    fields.push({
      id,
      label,
      prompt,
      required,
      type: "text",
      secret: asString(propertySchema.format) === "password",
    });
  }
  return fields;
}

function fallbackApprovalField(): ElicitationField {
  return {
    id: APPROVAL_FIELD_ID,
    label: "Approval",
    prompt: "Approve this MCP request",
    required: true,
    type: "select",
    options: [...APPROVAL_DEFAULT_CHOICES],
  };
}

function parseFields(payload: unknown): ElicitationField[] {
  const rec = asRecord(payload);
  if (!rec) return [fallbackApprovalField()];

  const explicit = parseExplicitFields(rec);
  if (explicit.length > 0) return explicit;

  const fromSchema = parseSchemaFields(rec);
  if (fromSchema.length > 0) return fromSchema;

  return [fallbackApprovalField()];
}

function isMissingRequired(field: ElicitationField, value: unknown): boolean {
  if (!field.required) return false;
  if (field.type === "select") {
    return typeof value !== "string" || value.length === 0;
  }
  return typeof value !== "string" || value.trim().length === 0;
}

function parseApprovalAction(value: unknown): McpServerElicitationResolution["action"] | undefined {
  const str = typeof value === "string" ? value : "";
  if (
    str === "accept" ||
    str === "decline" ||
    str === "cancel" ||
    str === "accept_session" ||
    str === "accept_always"
  ) {
    return str;
  }
  return undefined;
}

export class McpServerElicitationOverlay implements BottomPaneView {
  private readonly request: McpServerElicitationFormRequest;
  private readonly fields: ElicitationField[];
  private readonly answers = new Map<string, unknown>();
  private selectedField = 0;
  private complete = false;
  private resolution: McpServerElicitationResolution | null = null;

  constructor(request: McpServerElicitationFormRequest) {
    this.request = request;
    this.fields = parseFields(request.payload);
    for (const field of this.fields) {
      if (field.type === "select") {
        this.answers.set(field.id, field.options[0]?.value ?? "");
      } else {
        this.answers.set(field.id, "");
      }
    }
  }

  viewId(): string {
    return `McpServerElicitationOverlay:${this.request.requestId}`;
  }

  getRequest(): McpServerElicitationFormRequest {
    return this.request;
  }

  getFields(): ElicitationField[] {
    return this.fields;
  }

  selectedFieldIndex(): number {
    return this.selectedField;
  }

  setSelectedField(index: number): void {
    this.selectedField = Math.max(0, Math.min(Math.floor(index), this.fields.length - 1));
  }

  setTextAnswer(fieldId: string, value: string): void {
    this.answers.set(fieldId, value);
  }

  selectOption(fieldId: string, value: string): void {
    this.answers.set(fieldId, value);
  }

  answerFor(fieldId: string): unknown {
    return this.answers.get(fieldId);
  }

  missingRequiredFieldIds(): string[] {
    return this.fields
      .filter((field) => isMissingRequired(field, this.answers.get(field.id)))
      .map((field) => field.id);
  }

  submit(): McpServerElicitationResolution | null {
    if (this.complete) return this.resolution;
    if (this.missingRequiredFieldIds().length > 0) return null;

    const values: Record<string, unknown> = {};
    for (const field of this.fields) {
      values[field.id] = this.answers.get(field.id) ?? null;
    }

    const action = parseApprovalAction(values[APPROVAL_FIELD_ID]);
    const mode: McpServerElicitationResolution["mode"] = action ? "approval" : "form";
    this.resolution = {
      serverName: this.request.serverName,
      requestId: this.request.requestId,
      mode,
      values,
      action,
    };
    this.complete = true;
    return this.resolution;
  }

  cancel(): McpServerElicitationResolution {
    this.complete = true;
    this.resolution = {
      serverName: this.request.serverName,
      requestId: this.request.requestId,
      mode: "approval",
      values: { [APPROVAL_FIELD_ID]: "cancel" },
      action: "cancel",
    };
    return this.resolution;
  }

  onCtrlC(): CancellationEvent {
    this.cancel();
    return "Handled";
  }

  close(): void {
    this.complete = true;
  }

  isComplete(): boolean {
    return this.complete;
  }
}
