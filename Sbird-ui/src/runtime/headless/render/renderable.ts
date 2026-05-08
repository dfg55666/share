export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CursorPos = [number, number];

export interface Renderable {
  desiredHeight(width: number): number;
  render(area: Rect): unknown;
  cursorPos?(area: Rect): CursorPos | null;
}

export type RenderableItem = Renderable | string | null;

function intersection(a: Rect, b: Rect): Rect {
  const x0 = Math.max(a.x, b.x);
  const y0 = Math.max(a.y, b.y);
  const x1 = Math.min(a.x + a.width, b.x + b.width);
  const y1 = Math.min(a.y + a.height, b.y + b.height);
  return {
    x: x0,
    y: y0,
    width: Math.max(0, x1 - x0),
    height: Math.max(0, y1 - y0),
  };
}

function isEmpty(rect: Rect): boolean {
  return rect.width <= 0 || rect.height <= 0;
}

function asRenderable(item: RenderableItem): Renderable {
  if (item === null) {
    return {
      desiredHeight: () => 0,
      render: () => null,
    };
  }
  if (typeof item === "string") {
    return {
      desiredHeight: () => 1,
      render: () => item,
    };
  }
  return item;
}

export class ColumnRenderable implements Renderable {
  private readonly children: RenderableItem[];

  constructor(children: RenderableItem[] = []) {
    this.children = children;
  }

  public push(child: RenderableItem): void {
    this.children.push(child);
  }

  desiredHeight(width: number): number {
    return this.children.reduce((sum, child) => sum + asRenderable(child).desiredHeight(width), 0);
  }

  render(area: Rect): unknown {
    let y = area.y;
    const rendered: unknown[] = [];
    for (const child of this.children) {
      const renderable = asRenderable(child);
      const childArea: Rect = intersection(
        { x: area.x, y, width: area.width, height: renderable.desiredHeight(area.width) },
        area,
      );
      if (!isEmpty(childArea)) {
        rendered.push(renderable.render(childArea));
      }
      y += childArea.height;
    }
    return rendered;
  }

  cursorPos(area: Rect): CursorPos | null {
    let y = area.y;
    for (const child of this.children) {
      const renderable = asRenderable(child);
      const childArea: Rect = intersection(
        { x: area.x, y, width: area.width, height: renderable.desiredHeight(area.width) },
        area,
      );
      if (!isEmpty(childArea) && renderable.cursorPos) {
        const pos = renderable.cursorPos(childArea);
        if (pos) return pos;
      }
      y += childArea.height;
    }
    return null;
  }
}

