import { exerciseDisplayName, exercisesFromTemplate } from '@vigortally/core';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert, Pressable, Text, View } from 'react-native';
import { startWorkout, useActiveWorkout } from '../../src/activeWorkout';
import { Button, Card, ErrorText, Muted, Screen, Section } from '../../src/components';
import { newId } from '../../src/ids';
import { useApi } from '../../src/session';
import { spacing, text, useColors } from '../../src/theme';

export default function ActivitiesTab() {
  const c = useColors();
  const api = useApi();
  const active = useActiveWorkout();
  const templates = useQuery({ queryKey: ['templates'], queryFn: api.templates.list });
  const exercises = useQuery({ queryKey: ['exercises'], queryFn: api.exercises.list });
  const activities = useQuery({ queryKey: ['activities'], queryFn: api.activities.list });
  const names = new Map((exercises.data ?? []).map((e) => [e.id, exerciseDisplayName(e)]));

  const begin = (start: () => void) => {
    if (active) {
      Alert.alert('Workout in progress', 'Finish or cancel it first.', [
        { text: 'Open it', onPress: () => router.push('/workout') },
        { text: 'OK', style: 'cancel' },
      ]);
      return;
    }
    start();
    router.push('/workout');
  };

  return (
    <Screen
      title="Activities"
      refreshing={templates.isRefetching}
      onRefresh={() => {
        void templates.refetch();
        void activities.refetch();
      }}
    >
      <Section label="Quick start">
        {active ? (
          <Pressable accessibilityRole="button" onPress={() => router.push('/workout')}>
            <Card style={{ borderColor: c.accent, flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={text('title', c.text)}>{active.name}</Text>
                <Muted>
                  In progress · started{' '}
                  {new Date(active.startedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Muted>
              </View>
              <Text style={text('button', c.accent)}>Resume</Text>
            </Card>
          </Pressable>
        ) : (
          <Button
            title="Start an empty workout"
            onPress={() => begin(() => startWorkout({ id: newId() }))}
          />
        )}
      </Section>

      <Section label="My templates">
        {templates.data?.length === 0 && <Muted>Create templates in the web app.</Muted>}
        {templates.data?.map((t) => (
          <Pressable
            key={t.id}
            accessibilityRole="button"
            accessibilityLabel={`Start ${t.name}`}
            onPress={() =>
              begin(() =>
                startWorkout({
                  id: newId(),
                  name: t.name,
                  templateId: t.id,
                  exercises: exercisesFromTemplate(t.exercises),
                }),
              )
            }
          >
            <Card style={{ gap: spacing.xs }}>
              <Text style={text('title', c.text)}>{t.name}</Text>
              <Muted>
                {t.lastPerformedAt
                  ? `Last performed: ${new Date(t.lastPerformedAt).toLocaleDateString()}`
                  : 'Not performed yet'}
              </Muted>
              <View style={{ marginTop: spacing.sm }}>
                {t.exercises.map((e, i) => (
                  <Text
                    key={`${e.exerciseId}-${i}`}
                    style={[
                      text('body', c.textMuted),
                      e.supersetGroup != null && {
                        paddingLeft: spacing.md,
                        borderLeftWidth: 3,
                        borderLeftColor: c.border,
                      },
                    ]}
                  >
                    {e.sets.length} × {names.get(e.exerciseId) ?? '…'}
                  </Text>
                ))}
              </View>
              {t.notes ? (
                <Text style={[text('body', c.textMuted), { fontStyle: 'italic' }]}>{t.notes}</Text>
              ) : null}
            </Card>
          </Pressable>
        ))}
        <ErrorText error={templates.error} />
      </Section>

      <Section label="My activities">
        {activities.data?.length === 0 && <Muted>Add sports in the web app.</Muted>}
        {activities.data?.map((a) => (
          <Card key={a.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[text('body', c.text), { flex: 1 }]}>{a.name}</Text>
            <Muted>
              {a.sessionCount} {a.sessionCount === 1 ? 'session' : 'sessions'}
            </Muted>
          </Card>
        ))}
        <ErrorText error={activities.error} />
      </Section>
    </Screen>
  );
}
