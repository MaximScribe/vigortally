import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ChevronRight, Plus } from 'lucide-react';
import { useState } from 'react';
import { useApi } from '../api/ApiProvider';
import { ErrorMessage } from '../components/forms';
import { EmptyState, Page, Section } from '../components/Page';
import { formatDay } from '../lib/format';
import { activityIcon } from '../lib/icons';
import { AddActivitySheet } from './activities/AddActivitySheet';
import '../components/list.css';

export function ActivitiesPage() {
  const api = useApi();
  const activities = useQuery({ queryKey: ['activities'], queryFn: api.activities.list });
  const [adding, setAdding] = useState(false);
  const visible = (activities.data ?? []).filter((a) => !a.archived);

  return (
    <Page title="Activities">
      <Section
        label="My activities"
        action={
          <button
            type="button"
            className="vt-icon-button"
            aria-label="Add activity"
            onClick={() => setAdding(true)}
          >
            <Plus aria-hidden="true" size={24} />
          </button>
        }
      >
        {activities.isSuccess && visible.length === 0 ? (
          <EmptyState title="No activities yet">
            Add the sports you do: strength training, running, skiing, bouldering or your own.
          </EmptyState>
        ) : (
          <ul className="vt-list">
            {visible.map((activity) => {
              const Icon = activityIcon(activity.icon);
              return (
                <li key={activity.id}>
                  <Link
                    to="/activities/$activityId"
                    params={{ activityId: activity.id }}
                    className="vt-list__item vt-list__item--button"
                  >
                    <Icon aria-hidden="true" size={22} className="vt-accent" />
                    <span className="vt-list__main">
                      <span>{activity.name}</span>
                      <span className="vt-list__sub">
                        {activity.sessionCount === 0
                          ? 'No sessions yet'
                          : `${activity.sessionCount} ${activity.sessionCount === 1 ? 'session' : 'sessions'} · last ${formatDay(activity.lastAt!).toLowerCase()}`}
                      </span>
                    </span>
                    <ChevronRight aria-hidden="true" size={18} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <ErrorMessage error={activities.error} />
      </Section>

      <AddActivitySheet open={adding} onClose={() => setAdding(false)} existing={visible} />
    </Page>
  );
}
