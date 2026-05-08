// Port subset of `tuitoweb/src/chatwidget/plugins.rs`.
//
// The upstream TUI integrates plugin marketplace browsing/installation. The C-end `/api`
// contract in Sbird does not expose plugins yet, so Phase 1 keeps the state vocabulary and
// keeps an injectable provider boundary for host-side implementations.

export type PluginsCacheState =
  | { kind: "Uninitialized" }
  | { kind: "Loading" }
  | { kind: "Ready"; response: unknown; fetchedAtIso: string }
  | { kind: "Failed"; error: string };

export type PluginsListProvider = () => Promise<unknown>;

let pluginsListProvider: PluginsListProvider | null = null;

export function setPluginsListProvider(provider: PluginsListProvider | null): void {
  pluginsListProvider = provider;
}

export function pluginsNotAvailableError(): Error {
  return new Error("Plugins endpoint is not available. Configure a plugins provider first.");
}

export async function fetchPluginsList(): Promise<unknown> {
  if (!pluginsListProvider) {
    throw pluginsNotAvailableError();
  }
  return pluginsListProvider();
}

export class PluginsCache {
  private state: PluginsCacheState = { kind: "Uninitialized" };
  private inFlightToken = 0;

  snapshot(): PluginsCacheState {
    return this.state;
  }

  reset(): void {
    this.state = { kind: "Uninitialized" };
  }

  async prefetch(opts: { force?: boolean } = {}): Promise<PluginsCacheState> {
    if (this.state.kind === "Loading" && !opts.force) {
      return this.state;
    }
    if (this.state.kind === "Ready" && !opts.force) {
      return this.state;
    }

    const provider = pluginsListProvider;
    if (!provider) {
      this.state = { kind: "Failed", error: pluginsNotAvailableError().message };
      return this.state;
    }

    this.state = { kind: "Loading" };
    const token = (this.inFlightToken = (this.inFlightToken + 1) >>> 0);
    try {
      const response = await provider();
      if (token !== this.inFlightToken) {
        return this.state;
      }
      this.state = {
        kind: "Ready",
        response,
        fetchedAtIso: new Date().toISOString(),
      };
      return this.state;
    } catch (error) {
      if (token !== this.inFlightToken) {
        return this.state;
      }
      this.state = {
        kind: "Failed",
        error: error instanceof Error ? error.message : String(error),
      };
      return this.state;
    }
  }
}
