import { useCallback, useEffect, useRef, useState } from 'react';
import ChatBubble from './ChatBubble';
import styles from './ChatTimeline.module.scss';

// ── Types ────────────────────────────────────────────────────────────────────

interface TimelineMessage {
  id: string;
  role: 'user' | 'agent';
  senderName: string;
  senderTag?: string;
  time: string;
  content: string;
  thinking?: {
    steps: { text: string }[];
    toolCalls?: {
      label: string;
      name: string;
      status: 'success' | 'loading' | 'error';
    }[];
    items?: Array<
      | { type: 'step'; text: string }
      | {
          type: 'tool';
          label: string;
          name: string;
          status: 'success' | 'loading' | 'error';
        }
    >;
  };
}

interface ChatTimelineProps {
  messages: TimelineMessage[];
}

// ── Constants ────────────────────────────────────────────────────────────────

/** Default estimated height (px) for messages not yet measured by ResizeObserver */
const DEFAULT_ITEM_HEIGHT = 80;

/** Extra items rendered above/below the visible viewport to reduce flicker */
const OVERSCAN_COUNT = 5;

/** When message count is below this threshold, render all items (no virtualization) */
const VIRTUALIZATION_THRESHOLD = 50;

/** Timeline gap between message rows — must match .timeline `gap` in SCSS */
const ROW_GAP = 24;

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Compute the average measured height across all cached entries.
 * Falls back to DEFAULT_ITEM_HEIGHT when the cache is empty.
 */
function averageHeight(cache: Map<string, number>): number {
  if (cache.size === 0) return DEFAULT_ITEM_HEIGHT;
  let total = 0;
  cache.forEach((h) => { total += h; });
  return total / cache.size;
}

/**
 * Look up the height for a single message — measured value if available,
 * otherwise the current running average.
 */
function heightOf(
  id: string,
  cache: Map<string, number>,
  fallback: number,
): number {
  return cache.get(id) ?? fallback;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ChatTimeline({ messages }: ChatTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 30 });

  // Measured heights cache — persists across renders, keyed by message id
  const heightCacheRef = useRef<Map<string, number>>(new Map());

  // ResizeObserver instance — shared across all visible rows
  const observerRef = useRef<ResizeObserver | null>(null);

  // Map from DOM element → message id for the observer callback
  const elToIdRef = useRef<Map<Element, string>>(new Map());

  // ── ResizeObserver setup ─────────────────────────────────────────────────

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      let changed = false;
      for (const entry of entries) {
        const id = elToIdRef.current.get(entry.target);
        if (!id) continue;
        const h = entry.contentRect.height;
        if (h > 0 && heightCacheRef.current.get(id) !== h) {
          heightCacheRef.current.set(id, h);
          changed = true;
        }
      }
      // Re-calculate visible range when heights change (padding shifts)
      if (changed) updateVisibleRange();
    });
    observerRef.current = observer;

    return () => {
      observer.disconnect();
      observerRef.current = null;
      elToIdRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Ref callback for each visible row ────────────────────────────────────

  /**
   * Returns a ref-callback that observes / unobserves the row DOM node.
   * Stable per message id to avoid excessive observe/unobserve churn.
   */
  const rowRefCallbacksRef = useRef<Map<string, (el: HTMLDivElement | null) => void>>(new Map());

  const getRowRef = useCallback((id: string) => {
    let cb = rowRefCallbacksRef.current.get(id);
    if (!cb) {
      let prevEl: HTMLDivElement | null = null;
      cb = (el: HTMLDivElement | null) => {
        const observer = observerRef.current;
        if (!observer) return;
        // Unobserve previous element
        if (prevEl && prevEl !== el) {
          observer.unobserve(prevEl);
          elToIdRef.current.delete(prevEl);
        }
        // Observe new element
        if (el) {
          elToIdRef.current.set(el, id);
          observer.observe(el);
        }
        prevEl = el;
      };
      rowRefCallbacksRef.current.set(id, cb);
    }
    return cb;
  }, []);

  // ── Visible range calculation ────────────────────────────────────────────

  const updateVisibleRange = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const scrollTop = el.scrollTop;
    const viewHeight = el.clientHeight;
    const cache = heightCacheRef.current;
    const fallback = averageHeight(cache);

    // Walk items to find which ones intersect the viewport
    let accumulatedTop = 0;
    let startIdx = 0;
    let endIdx = messages.length;
    let foundStart = false;

    for (let i = 0; i < messages.length; i++) {
      const h = heightOf(messages[i].id, cache, fallback) + ROW_GAP;

      if (!foundStart && accumulatedTop + h > scrollTop) {
        startIdx = Math.max(0, i - OVERSCAN_COUNT);
        foundStart = true;
      }

      if (foundStart && accumulatedTop > scrollTop + viewHeight) {
        endIdx = Math.min(messages.length, i + OVERSCAN_COUNT);
        break;
      }

      accumulatedTop += h;
    }

    if (!foundStart) {
      // All items above viewport (shouldn't happen, but safeguard)
      startIdx = Math.max(0, messages.length - OVERSCAN_COUNT);
    }

    setVisibleRange((prev) => {
      if (prev.start === startIdx && prev.end === endIdx) return prev;
      return { start: startIdx, end: endIdx };
    });
  }, [messages]);

  // ── Effects ──────────────────────────────────────────────────────────────

  // Recalculate on messages change
  useEffect(() => {
    updateVisibleRange();
  }, [messages.length, updateVisibleRange]);

  // Window resize → recalculate
  useEffect(() => {
    const onResize = () => updateVisibleRange();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [updateVisibleRange]);

  const handleScroll = () => {
    updateVisibleRange();
  };

  // ── Non-virtualized path (few messages) ──────────────────────────────────

  if (messages.length < VIRTUALIZATION_THRESHOLD) {
    return (
      <div className={styles.timeline} ref={containerRef}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`${styles.messageRow} ${
              msg.role === 'user'
                ? styles.messageRowUser
                : styles.messageRowAgent
            }`}
          >
            <ChatBubble
              role={msg.role}
              senderName={msg.senderName}
              senderTag={msg.senderTag}
              time={msg.time}
              content={msg.content}
              avatarIcon={msg.role === 'agent'}
              thinking={msg.role === 'agent' ? msg.thinking : undefined}
            />
          </div>
        ))}
      </div>
    );
  }

  // ── Virtualized path ─────────────────────────────────────────────────────

  const cache = heightCacheRef.current;
  const fallback = averageHeight(cache);

  // Compute top padding — sum of heights for items before visible start
  let topPadding = 0;
  for (let i = 0; i < visibleRange.start; i++) {
    topPadding += heightOf(messages[i].id, cache, fallback) + ROW_GAP;
  }

  // Compute bottom padding — sum of heights for items after visible end
  let bottomPadding = 0;
  for (let i = visibleRange.end; i < messages.length; i++) {
    bottomPadding += heightOf(messages[i].id, cache, fallback) + ROW_GAP;
  }

  const visibleMessages = messages.slice(visibleRange.start, visibleRange.end);

  return (
    <div className={styles.timeline} ref={containerRef} onScroll={handleScroll}>
      {topPadding > 0 && <div style={{ height: topPadding, flexShrink: 0 }} />}
      {visibleMessages.map((msg) => (
        <div
          key={msg.id}
          ref={getRowRef(msg.id)}
          className={`${styles.messageRow} ${
            msg.role === 'user' ? styles.messageRowUser : styles.messageRowAgent
          }`}
        >
          <ChatBubble
            role={msg.role}
            senderName={msg.senderName}
            senderTag={msg.senderTag}
            time={msg.time}
            content={msg.content}
            avatarIcon={msg.role === 'agent'}
            thinking={msg.role === 'agent' ? msg.thinking : undefined}
          />
        </div>
      ))}
      {bottomPadding > 0 && <div style={{ height: bottomPadding, flexShrink: 0 }} />}
    </div>
  );
}
