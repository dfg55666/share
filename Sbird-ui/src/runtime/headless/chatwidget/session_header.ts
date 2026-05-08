// Port of `tuitoweb/src/chatwidget/session_header.rs`.

export class SessionHeader {
  private model: string;

  constructor(model: string) {
    this.model = model;
  }

  setModel(model: string): void {
    if (this.model !== model) {
      this.model = model;
    }
  }

  getModel(): string {
    return this.model;
  }
}
