import { displayDistance, formatDuration } from '@vigortally/core';
import type { ActivitySession, ActivityType } from '@vigortally/schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useApi } from '../../api/ApiProvider';
import { useMe } from '../../auth/AuthGate';
import { Button, ErrorMessage } from '../../components/forms';
import { EmptyState, Page, Section } from '../../components/Page';
import { formatDay, formatNumber, formatTime } from '../../lib/format';
import { SessionSheet } from './SessionSheet';
import { StrengthOverview } from './StrengthOverview';
import '../../components/list.css';

/** One-line summary of a session's values, e.g. "5.2 km · 152 bpm". */
function summarize(activity: ActivityType, session: ActivitySession, imperial: boolean): string {
  const parts: string[] = [];
  for (const field of activity.fields) {
    const value = session.values[field.key];
    if (value == null || value === '') continue;
    if (field.type === 'distance' && typeof value === 'number') {
      const d = displayDistance(value, imperial ? 'imperial' : 'metric');
      parts.push(`${formatNumber(d.value, 2)} ${d.unit}`);
    } else if (field.type === 'duration' && typeof value === 'number') {
      parts.push(formatDuration(value));
    } else if (typeof value === 'number') {
      parts.push(
        `${formatNumber(value)}${field.unit ? ` ${field.unit}` : ` ${field.label.toLowerCase()}`}`,
      );
    } else {
      parts.push(String(value));
    }
  }
  return parts.join(' · ');
}

export function ActivityDetailPage() {
  const { activityId } = useParams({ from: '/activities/$activityId' });
  const api = useApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const imperial = useMe().profile.units === 'imperial';
  const activities = useQuery({ queryKey: ['activities'], queryFn: api.activities.list });
  const activity = activities.data?.find((a) => a.id === activityId);

  const sessions = useQuery({
    queryKey: ['sessions', activityId],
    queryFn: () => api.sessions.list({ activityTypeId: activityId, limit: 200 }),
    enabled: activity?.kind === 'session',
  });
  const [editing, setEditing] = useState<ActivitySession | null | undefined>(undefined);

  const remove = useMutation({
    mutationFn: api.activities.remove,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['activities'] });
      await navigate({ to: '/activities' });
    },
  });

  if (activities.isPending) return null;
  if (!activity) {
    return (
      <Page title="Activity">
        <EmptyState title="Activity not found">It may have been deleted.</EmptyState>
      </Page>
    );
  }

  return (
    <Page title={activity.name}>
      {activity.kind === 'strength' ? (
        <StrengthOverview />
      ) : (
        <>
          <Button onClick={() => setEditing(null)}>
            <Plus aria-hidden="true" size={18} /> Log session
          </Button>
          <Section label="History">
            {sessions.data?.length === 0 ? (
              <EmptyState title="No sessions yet">Log your first session above.</EmptyState>
            ) : (
              <ul className="vt-list">
                {sessions.data?.map((session) => (
                  <li key={session.id}>
                    <button
                      type="button"
                      className="vt-list__item vt-list__item--button"
                      onClick={() => setEditing(session)}
                    >
                      <span className="vt-list__main">
                        <span>
                          {formatDay(session.startedAt)}, {formatTime(session.startedAt)}
                        </span>
                        <span className="vt-list__sub">
                          {summarize(activity, session, imperial) || session.notes || '—'}
                        </span>
                      </span>
                      {session.durationSec != null && (
                        <span className="vt-list__value">
                          {formatDuration(session.durationSec)}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <ErrorMessage error={sessions.error} />
          </Section>
          {editing !== undefined && (
            <SessionSheet
              key={editing?.id ?? 'new'}
              activity={activity}
              session={editing}
              open
              onClose={() => setEditing(undefined)}
            />
          )}
        </>
      )}

      <Section label="Manage">
        <Button
          variant="danger"
          busy={remove.isPending}
          onClick={() => {
            if (
              window.confirm(
                `Delete ${activity.name}? ${activity.kind === 'session' ? 'All its sessions are deleted too.' : 'Your workouts are kept.'}`,
              )
            ) {
              remove.mutate(activity.id);
            }
          }}
        >
          Delete activity
        </Button>
        <ErrorMessage error={remove.error} />
      </Section>
    </Page>
  );
}
