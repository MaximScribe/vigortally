import { exerciseDisplayName } from '@vigortally/core';
import type { Bucket, ChartType, Metric, Widget, WidgetInput } from '@vigortally/schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useApi } from '../api/ApiProvider';
import { Button, ErrorMessage, SelectField, TextField } from '../components/forms';
import { Sheet } from '../components/Sheet';
import { newId } from '../lib/ids';
import { useExercises } from '../workout/ExercisePicker';

export const metricOptions: { value: Metric; label: string; group: string }[] = [
  { value: 'weight', label: 'Body weight', group: 'Body' },
  { value: 'calories', label: 'Calories', group: 'Nutrition' },
  { value: 'protein', label: 'Protein', group: 'Nutrition' },
  { value: 'carbs', label: 'Carbs', group: 'Nutrition' },
  { value: 'fat', label: 'Fat', group: 'Nutrition' },
  { value: 'water', label: 'Water', group: 'Nutrition' },
  { value: 'workouts', label: 'Workouts', group: 'Strength' },
  { value: 'trainingVolume', label: 'Training volume', group: 'Strength' },
  { value: 'exerciseOneRepMax', label: 'Estimated 1RM of an exercise', group: 'Strength' },
  { value: 'activitySessions', label: 'Sessions', group: 'Activities' },
  { value: 'activityDuration', label: 'Active time', group: 'Activities' },
  { value: 'activityDistance', label: 'Distance', group: 'Activities' },
];

const ranges = [
  { value: '7', label: 'Last 7 days' },
  { value: '14', label: 'Last 2 weeks' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 3 months' },
  { value: '180', label: 'Last 6 months' },
  { value: '365', label: 'Last year' },
];

interface Props {
  widget: Widget | null;
  onClose: () => void;
}

/** Add or edit a dashboard widget: any metric, chart type, range and grouping. */
export function WidgetSheet({ widget, onClose }: Props) {
  const api = useApi();
  const queryClient = useQueryClient();
  const exercises = useExercises();
  const activities = useQuery({ queryKey: ['activities'], queryFn: api.activities.list });
  const [draft, setDraft] = useState<WidgetInput>(
    widget ?? {
      id: newId(),
      title: '',
      metric: 'weight',
      chart: 'line',
      rangeDays: 90,
      bucket: 'day',
      exerciseId: null,
      activityTypeId: null,
    },
  );
  const save = useMutation({
    mutationFn: api.dashboard.save,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    },
  });
  const isActivity = draft.metric.startsWith('activity');
  const label = metricOptions.find((m) => m.value === draft.metric)?.label ?? '';

  return (
    <Sheet
      open
      title={widget ? 'Edit widget' : 'Add widget'}
      onClose={onClose}
      footer={
        <Button
          busy={save.isPending}
          disabled={draft.metric === 'exerciseOneRepMax' && !draft.exerciseId}
          onClick={() => save.mutate({ ...draft, title: draft.title.trim() || label })}
        >
          Save
        </Button>
      }
    >
      <SelectField
        label="Metric"
        value={draft.metric}
        onChange={(e) => {
          const metric = e.target.value as Metric;
          setDraft((d) => ({
            ...d,
            metric,
            chart: metric === 'weight' || metric === 'exerciseOneRepMax' ? 'line' : d.chart,
          }));
        }}
        options={metricOptions.map((m) => ({ value: m.value, label: `${m.group} · ${m.label}` }))}
      />
      {draft.metric === 'exerciseOneRepMax' && (
        <SelectField
          label="Exercise"
          value={draft.exerciseId ?? ''}
          onChange={(e) => setDraft((d) => ({ ...d, exerciseId: e.target.value || null }))}
          options={[
            { value: '', label: 'Choose an exercise' },
            ...(exercises.data ?? []).map((ex) => ({
              value: ex.id,
              label: exerciseDisplayName(ex),
            })),
          ]}
        />
      )}
      {isActivity && (
        <SelectField
          label="Activity"
          value={draft.activityTypeId ?? ''}
          onChange={(e) => setDraft((d) => ({ ...d, activityTypeId: e.target.value || null }))}
          options={[
            { value: '', label: 'All activities' },
            ...(activities.data ?? []).map((a) => ({ value: a.id, label: a.name })),
          ]}
        />
      )}
      <TextField
        label="Title"
        placeholder={label}
        value={draft.title}
        onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
      />
      <div className="vt-row">
        <SelectField
          label="Show as"
          value={draft.chart}
          onChange={(e) => setDraft((d) => ({ ...d, chart: e.target.value as ChartType }))}
          options={[
            { value: 'line', label: 'Line' },
            { value: 'bar', label: 'Bars' },
            { value: 'number', label: 'Number' },
          ]}
        />
        <SelectField
          label="Group by"
          value={draft.bucket}
          onChange={(e) => setDraft((d) => ({ ...d, bucket: e.target.value as Bucket }))}
          options={[
            { value: 'day', label: 'Day' },
            { value: 'week', label: 'Week' },
            { value: 'month', label: 'Month' },
          ]}
        />
      </div>
      <SelectField
        label="Time range"
        value={String(draft.rangeDays)}
        onChange={(e) => setDraft((d) => ({ ...d, rangeDays: Number(e.target.value) }))}
        options={ranges}
      />
      <ErrorMessage error={save.error} />
    </Sheet>
  );
}
