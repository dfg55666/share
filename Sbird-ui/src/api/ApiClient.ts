export class ApiClient {
  private readonly apiPrefix: string;
  private static readonly REQUEST_TIMEOUT_MS = 30000;

  constructor(apiPrefix = "/api") {
    this.apiPrefix = apiPrefix.replace(/\/+$/, "");
  }

  get<T>(path: string, init?: RequestInit): Promise<T> {
    return this.request<T>(path, {
      ...init,
      method: "GET",
    });
  }

  post<T>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers ?? {});
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    return this.request<T>(path, {
      ...init,
      method: "POST",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${this.apiPrefix}${path.startsWith("/") ? path : `/${path}`}`;
    const hasExternalSignal = Boolean(init?.signal);
    const controller = hasExternalSignal ? null : new AbortController();
    const requestInit: RequestInit = controller
      ? { ...init, signal: controller.signal }
      : { ...init };
    const timeoutToken = controller
      ? globalThis.setTimeout(() => {
          controller.abort();
        }, ApiClient.REQUEST_TIMEOUT_MS)
      : null;

    let response: Response;
    try {
      response = await fetch(url, requestInit);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new Error(`Request timed out after ${ApiClient.REQUEST_TIMEOUT_MS}ms`);
      }
      throw error;
    } finally {
      if (timeoutToken !== null) {
        globalThis.clearTimeout(timeoutToken);
      }
    }
    const contentType = response.headers.get("Content-Type") ?? "";

    let payload: unknown = null;
    if (contentType.toLowerCase().includes("application/json")) {
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
    }

    if (!response.ok) {
      throw new Error(this.extractErrorMessage(response.status, payload));
    }

    if (payload === null && response.status !== 204) {
      const normalizedType = contentType.trim() || "unknown";
      throw new Error(`Expected JSON response but received ${normalizedType}`);
    }

    return payload as T;
  }

  private extractErrorMessage(status: number, payload: unknown): string {
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      const record = payload as Record<string, unknown>;
      if (typeof record.error === "string" && record.error.trim().length > 0) {
        return record.error;
      }
      if (typeof record.message === "string" && record.message.trim().length > 0) {
        return record.message;
      }
      if (typeof record.status === "string" && record.status.trim().length > 0) {
        return record.status;
      }
    }
    return `Request failed: HTTP ${status}`;
  }
}

