import { addDays, today } from '@vigortally/core';
import type { Widget } from '@vigortally/schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useApi } from '../api/ApiProvider';
import { Button, ErrorMessage } from '../components/forms';
import { EmptyState, Page } from '../components/Page';
import { formatNumber } from '../lib/format';
import { Chart } from '../stats/Chart';
import { WidgetSheet } from '../stats/WidgetSheet';
import '../stats/stats.css';

export function StatisticsPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const widgets = useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard.list });
  const [editing, setEditing] = useState<Widget | null | undefined>(undefined);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  const remove = useMutation({ mutationFn: api.dashboard.remove, onSuccess: refresh });
  const reorder = useMutation({ mutationFn: api.dashboard.reorder, onSuccess: refresh });

  const list = widgets.data ?? [];
  const move = (index: number, by: -1 | 1) => {
    const ids = list.map((w) => w.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(index + by, 0, moved!);
    reorder.mutate(ids);
  };

  return (
    <Page title="Statistics">
      {widgets.isSuccess && list.length === 0 && (
        <EmptyState title="Your dashboard is empty">
          Add widgets for any metric: training volume, weight trend, calories and more.
        </EmptyState>
      )}
      <div className="vt-dashboard">
        {list.map((widget, index) => (
          <WidgetCard
            key={widget.id}
            widget={widget}
            onEdit={() => setEditing(widget)}
            onRemove={() => remove.mutate(widget.id)}
            onMoveUp={index > 0 ? () => move(index, -1) : undefined}
            onMoveDown={index < list.length - 1 ? () => move(index, 1) : undefined}
          />
        ))}
      </div>
      <Button variant="secondary" onClick={() => setEditing(null)}>
        <Plus aria-hidden="true" size={18} /> Add widget
      </Button>
      <ErrorMessage error={widgets.error ?? remove.error ?? reorder.error} />
      {editing !== undefined && (
        <WidgetSheet
          key={editing?.id ?? 'new'}
          widget={editing}
          onClose={() => setEditing(undefined)}
        />
      )}
    </Page>
  );
}

interface CardProps {
  widget: Widget;
  onEdit: () => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

function WidgetCard({ widget, onEdit, onRemove, onMoveUp, onMoveDown }: CardProps) {
  const api = useApi();
  const to = today();
  const from = addDays(to, -(widget.rangeDays - 1));
  const series = useQuery({
    queryKey: [
      'series',
      widget.metric,
      from,
      to,
      widget.bucket,
      widget.exerciseId,
      widget.activityTypeId,
    ],
    queryFn: () =>
      api.stats.series({
        metric: widget.metric,
        from,
        to,
        bucket: widget.bucket,
        exerciseId: widget.exerciseId ?? undefined,
        activityTypeId: widget.activityTypeId ?? undefined,
      }),
  });
  const data = series.data;

  return (
    <article className={`vt-card vt-widget vt-widget--${widget.chart}`} aria-label={widget.title}>
      <header className="vt-widget__header">
        <div className="vt-list__main">
          <h2 className="vt-widget__title">{widget.title}</h2>
          {data && data.summary != null && widget.chart !== 'number' && (
            <span className="vt-list__sub">
              {data.summaryLabel} {formatNumber(data.summary)} {data.unit}
            </span>
          )}
        </div>
        <div className="vt-widget__actions">
          {onMoveUp && (
            <button
              type="button"
              className="vt-icon-button"
              aria-label={`Move ${widget.title} up`}
              onClick={onMoveUp}
            >
              <ArrowUp aria-hidden="true" size={16} />
            </button>
          )}
          {onMoveDown && (
            <button
              type="button"
              className="vt-icon-button"
              aria-label={`Move ${widget.title} down`}
              onClick={onMoveDown}
            >
              <ArrowDown aria-hidden="true" size={16} />
            </button>
          )}
          <button
            type="button"
            className="vt-icon-button"
            aria-label={`Edit ${widget.title}`}
            onClick={onEdit}
          >
            <Pencil aria-hidden="true" size={16} />
          </button>
          <button
            type="button"
            className="vt-icon-button"
            aria-label={`Remove ${widget.title}`}
            onClick={() => {
              if (window.confirm(`Remove “${widget.title}” from the dashboard?`)) onRemove();
            }}
          >
            <Trash2 aria-hidden="true" size={16} />
          </button>
        </div>
      </header>

      {series.isPending ? (
        <div className="vt-widget__placeholder" aria-busy="true" />
      ) : !data || data.points.length === 0 ? (
        <p className="vt-muted vt-widget__empty">No data in this time range yet.</p>
      ) : widget.chart === 'number' ? (
        <div className="vt-hero">
          <span className="vt-hero__value">{formatNumber(data.summary ?? 0)}</span>
          <span className="vt-hero__unit">
            {data.unit} · {data.summaryLabel}, last {widget.rangeDays} days
          </span>
        </div>
      ) : (
        <Chart series={data} type={widget.chart} bucket={widget.bucket} title={widget.title} />
      )}
      <ErrorMessage error={series.error} />
    </article>
  );
}
