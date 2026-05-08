import type { AppEvent, AppEventHandler } from "./app_event";

export class AppEventSender {
  private readonly listeners = new Set<AppEventHandler>();

  public subscribe(handler: AppEventHandler): () => void {
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }

  public send(event: AppEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
