'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import type { OrderDetail, TimelineEvent } from '@/types/order';
import { fetchOrder, fetchTimeline } from '@/lib/api';
import { formatCents, formatTime, formatEventType, shortId } from '@/lib/format';

/* ------------------------------------------------------------------ */
/*  Status badge                                                       */
/* ------------------------------------------------------------------ */

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PREPARING: 'bg-purple-100 text-purple-800',
  READY: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-800';
  return (
    <span
      className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${style}`}
    >
      {formatEventType(status)}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Timeline item                                                      */
/* ------------------------------------------------------------------ */

function TimelineItem({
  event,
  isLast,
}: {
  event: TimelineEvent;
  isLast: boolean;
}) {
  return (
    <div className="flex gap-4">
      {/* Dot and line */}
      <div className="flex flex-col items-center">
        <div className="w-3 h-3 rounded-full bg-orange-500 shrink-0 mt-1.5" />
        {!isLast && <div className="w-0.5 flex-1 bg-gray-200 mt-1" />}
      </div>

      {/* Content */}
      <div className="pb-6 flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-medium text-gray-900 text-sm">
            {formatEventType(event.type)}
          </p>
          <time className="text-xs text-gray-400 shrink-0">
            {formatTime(event.timestamp)}
          </time>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          Source: {event.source}
          {event.payload &&
            Object.keys(event.payload).length > 0 &&
            ` · ${JSON.stringify(event.payload)}`}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Terminal statuses (stop polling)                                    */
/* ------------------------------------------------------------------ */

const TERMINAL = new Set(['READY', 'COMPLETED', 'CANCELLED']);

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function OrderPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ---------------------------------------------------------------- */
  /*  Fetch data                                                       */
  /* ---------------------------------------------------------------- */

  const loadData = useCallback(async () => {
    try {
      const [o, t] = await Promise.all([
        fetchOrder(orderId),
        fetchTimeline(orderId),
      ]);
      setOrder(o);
      setEvents(t.events);
      setError(null);
      return o.status;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order');
      return null;
    }
  }, [orderId]);

  /* ---------------------------------------------------------------- */
  /*  Initial load + polling                                           */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    let mounted = true;

    async function init() {
      const status = await loadData();
      if (mounted) setLoading(false);

      // Start polling if not terminal
      if (status && !TERMINAL.has(status) && mounted) {
        intervalRef.current = setInterval(async () => {
          const s = await loadData();
          if (s && TERMINAL.has(s)) {
            if (intervalRef.current) clearInterval(intervalRef.current);
          }
        }, 3000);
      }
    }

    init();

    return () => {
      mounted = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadData]);

  /* ---------------------------------------------------------------- */
  /*  Loading / Error                                                  */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-6 text-center">
        <p className="font-medium">Could not load order</p>
        {error && <p className="text-sm mt-1">{error}</p>}
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  const isPolling = !TERMINAL.has(order.status);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Order {shortId(order.orderId)}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Placed {formatTime(order.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={order.status} />
          {isPolling && (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-600 border-t-transparent" />
          )}
        </div>
      </div>

      {/* Items */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Items</h2>
        </div>
        <ul className="divide-y divide-gray-100">
          {order.items.map((item, idx) => (
            <li key={idx} className="px-4 py-3">
              <div className="flex justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {item.quantity}× {item.productName}
                  </p>
                  {item.modifiers.length > 0 && (
                    <ul className="mt-1 text-xs text-gray-500">
                      {item.modifiers.map((m) => (
                        <li key={m.name}>
                          + {m.name}{' '}
                          {m.priceAdjustment > 0 &&
                            `(${formatCents(m.priceAdjustment)})`}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <span className="font-medium text-gray-700">
                  {formatCents(item.itemTotal)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Pricing breakdown */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-4 space-y-2">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal</span>
          <span>{formatCents(order.subtotal)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Service Fee</span>
          <span>{formatCents(order.serviceFee)}</span>
        </div>
        <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-200">
          <span>Total</span>
          <span>{formatCents(order.total)}</span>
        </div>
      </section>

      {/* Timeline */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Timeline</h2>
        </div>
        <div className="px-4 py-4">
          {events.length === 0 ? (
            <p className="text-gray-400 text-sm">No events yet</p>
          ) : (
            events.map((ev, idx) => (
              <TimelineItem
                key={ev.eventId}
                event={ev}
                isLast={idx === events.length - 1}
              />
            ))
          )}
        </div>
      </section>

      {/* Back link */}
      <div className="text-center pb-6">
        <a
          href="/"
          className="text-orange-600 hover:text-orange-700 font-medium text-sm"
        >
          ← Back to Menu
        </a>
      </div>
    </div>
  );
}
