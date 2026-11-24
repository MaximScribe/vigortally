import Ionicons from '@expo/vector-icons/Ionicons';
import {
  completedWorkout,
  completeSet,
  displayWeight,
  emptySet,
  exerciseDisplayName,
  formatDuration,
  inputWeightToKg,
  newWorkoutExercise,
  nextSetType,
  setLabels,
  type WorkoutDraft,
} from '@vigortally/core';
import type { WorkoutSet } from '@vigortally/schema';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { discardWorkout, updateWorkout, useActiveWorkout } from '../src/activeWorkout';
import { Button } from '../src/components';
import { useApi, useSession } from '../src/session';
import { layout, radius, spacing, text, useColors } from '../src/theme';

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

/** Full-screen set-and-rep logger, the same flow as the web app. */
export default function WorkoutScreen() {
  const workout = useActiveWorkout();
  useEffect(() => {
    if (!workout) router.back();
  }, [workout]);
  return workout ? <Logger workout={workout} /> : null;
}

function Logger({ workout }: { workout: WorkoutDraft }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const api = useApi();
  const { write } = useSession();
  const queryClient = useQueryClient();
  const units = useQuery({ queryKey: ['me'], queryFn: api.me.get }).data?.profile.units ?? 'metric';
  const exercises = useQuery({ queryKey: ['exercises'], queryFn: api.exercises.list });
  const names = useMemo(
    () => new Map((exercises.data ?? []).map((e) => [e.id, exerciseDisplayName(e)])),
    [exercises.data],
  );
  const ids = [...new Set(workout.exercises.map((e) => e.exerciseId))].sort();
  const previous = useQuery({
    queryKey: ['previous-sets', ids],
    queryFn: () => api.workouts.previous(ids),
    enabled: ids.length > 0,
  });
  const [picking, setPicking] = useState(false);
  const now = useNow(true);
  const rest = workout.restEndsAt ? Math.max(0, workout.restEndsAt - now) : 0;

  useEffect(() => {
    if (workout.restEndsAt && rest === 0) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      updateWorkout((w) => ({ ...w, restEndsAt: null }));
    }
  }, [rest, workout.restEndsAt]);

  const unit = units === 'imperial' ? 'LB' : 'KG';
  const changeSet = (ei: number, si: number, patch: Partial<WorkoutSet>) =>
    updateWorkout((w) => ({
      ...w,
      exercises: w.exercises.map((e, i) =>
        i === ei ? { ...e, sets: e.sets.map((s, j) => (j === si ? { ...s, ...patch } : s)) } : e,
      ),
    }));

  async function finish() {
    const result = completedWorkout(workout, new Date());
    if (result.exercises.length === 0) {
      Alert.alert('Nothing checked off', 'Discard this workout?', [
        { text: 'Keep logging', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => discardWorkout() },
      ]);
      return;
    }
    // Queued: saved now if online, otherwise as soon as the server is reachable.
    await write('PUT', `/workouts/${result.id}`, result);
    discardWorkout();
    void queryClient.invalidateQueries({ queryKey: ['templates'] });
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingHorizontal: layout.screenGutter,
          height: layout.topBarHeight,
          backgroundColor: c.surface,
          borderBottomWidth: 1,
          borderBottomColor: c.border,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Minimise workout"
          onPress={() => router.back()}
          hitSlop={10}
        >
          <Ionicons name="chevron-down" size={26} color={c.text} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            rest > 0
              ? `Rest ${formatDuration(rest / 1000)} left. Skip`
              : `Rest after sets: ${workout.restSeconds} seconds. Change`
          }
          onPress={() =>
            rest > 0
              ? updateWorkout((w) => ({ ...w, restEndsAt: null }))
              : Alert.alert(
                  'Rest after each set',
                  undefined,
                  [60, 90, 120, 180, 0].map((s) => ({
                    text: s === 0 ? 'Off' : formatDuration(s),
                    onPress: () => updateWorkout((w) => ({ ...w, restSeconds: s })),
                  })),
                )
          }
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: spacing.md,
            height: 36,
            borderRadius: radius.md,
            backgroundColor: rest > 0 ? c.accent : c.surfaceRaised,
          }}
        >
          <Ionicons name="timer-outline" size={18} color={rest > 0 ? c.onAccent : c.text} />
          {rest > 0 && (
            <Text style={text('numeric', c.onAccent)}>
              {formatDuration(Math.ceil(rest / 1000))}
            </Text>
          )}
        </Pressable>
        <Text style={[text('numeric', c.textMuted), { marginLeft: 'auto' }]}>
          {formatDuration((now - new Date(workout.startedAt).getTime()) / 1000)}
        </Text>
        <Pressable accessibilityRole="button" onPress={() => void finish()} hitSlop={10}>
          <Text style={text('button', c.accent)}>Finish</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: layout.screenGutter,
          gap: spacing.xl,
          paddingBottom: insets.bottom + spacing.xxxl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          accessibilityLabel="Workout name"
          value={workout.name}
          onChangeText={(name) => updateWorkout((w) => ({ ...w, name }))}
          style={[
            text('title', c.text),
            { backgroundColor: c.input, borderRadius: radius.md, padding: spacing.md },
          ]}
        />

        {workout.exercises.map((entry, ei) => {
          const labels = setLabels(entry.sets);
          const prev = previous.data?.[entry.exerciseId];
          return (
            <View key={`${entry.exerciseId}-${ei}`} style={{ gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[text('headline', c.accent), { flex: 1 }]}>
                  {names.get(entry.exerciseId) ?? '…'}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Options for ${names.get(entry.exerciseId) ?? 'exercise'}`}
                  hitSlop={10}
                  onPress={() =>
                    Alert.alert(names.get(entry.exerciseId) ?? 'Exercise', undefined, [
                      {
                        text: 'Remove last set',
                        onPress: () =>
                          updateWorkout((w) => ({
                            ...w,
                            exercises: w.exercises.map((e, i) =>
                              i === ei ? { ...e, sets: e.sets.slice(0, -1) } : e,
                            ),
                          })),
                      },
                      {
                        text: 'Remove exercise',
                        style: 'destructive',
                        onPress: () =>
                          updateWorkout((w) => ({
                            ...w,
                            exercises: w.exercises.filter((_, i) => i !== ei),
                          })),
                      },
                      { text: 'Cancel', style: 'cancel' },
                    ])
                  }
                >
                  <Ionicons name="ellipsis-vertical" size={20} color={c.accent} />
                </Pressable>
              </View>

              <View style={{ flexDirection: 'row', paddingHorizontal: 4 }}>
                {['SET', 'PREVIOUS', unit, 'REPS', ''].map((h, i) => (
                  <Text
                    key={i}
                    style={[
                      text('label', c.textSubtle),
                      {
                        width: [40, undefined, 76, 64, 48][i],
                        flex: i === 1 ? 1 : undefined,
                        textAlign: i === 1 ? 'left' : 'center',
                      },
                    ]}
                  >
                    {h}
                  </Text>
                ))}
              </View>

              {entry.sets.map((set, si) => {
                const p = prev?.[si];
                const prevText =
                  p?.reps == null
                    ? '—'
                    : p.weightKg
                      ? `${displayWeight(p.weightKg, units).value} × ${p.reps}`
                      : `${p.reps} reps`;
                const typeColor =
                  set.type === 'warmup'
                    ? c.setWarmup
                    : set.type === 'drop'
                      ? c.setDrop
                      : set.type === 'failure'
                        ? c.setFailure
                        : c.accent;
                return (
                  <View
                    key={si}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      minHeight: layout.setRowHeight,
                      borderRadius: radius.md,
                      paddingHorizontal: 4,
                      backgroundColor: set.done ? `${c.success}24` : 'transparent',
                    }}
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Set ${labels[si]}, change type`}
                      onPress={() => changeSet(ei, si, { type: nextSetType(set.type) })}
                      style={{ width: 40, alignItems: 'center' }}
                    >
                      <Text style={text('numeric', typeColor)}>{labels[si]}</Text>
                    </Pressable>
                    <Text style={[text('bodySmall', c.textMuted), { flex: 1 }]} numberOfLines={1}>
                      {prevText}
                    </Text>
                    <TextInput
                      accessibilityLabel={`Set ${labels[si]} ${unit.toLowerCase()}`}
                      keyboardType="decimal-pad"
                      placeholder={
                        p?.weightKg != null ? String(displayWeight(p.weightKg, units).value) : ''
                      }
                      placeholderTextColor={c.textSubtle}
                      value={
                        set.weightKg == null ? '' : String(displayWeight(set.weightKg, units).value)
                      }
                      onChangeText={(v) => {
                        const n = Number(v.replace(',', '.'));
                        changeSet(ei, si, {
                          weightKg:
                            v === '' || !Number.isFinite(n)
                              ? null
                              : Math.round(inputWeightToKg(n, units) * 1000) / 1000,
                        });
                      }}
                      style={[
                        text('numeric', c.text),
                        {
                          width: 68,
                          height: 38,
                          marginHorizontal: 4,
                          borderRadius: radius.md,
                          backgroundColor: c.input,
                          textAlign: 'center',
                        },
                      ]}
                    />
                    <TextInput
                      accessibilityLabel={`Set ${labels[si]} reps`}
                      keyboardType="number-pad"
                      placeholder={p?.reps != null ? String(p.reps) : ''}
                      placeholderTextColor={c.textSubtle}
                      value={set.reps == null ? '' : String(set.reps)}
                      onChangeText={(v) => {
                        const n = Number.parseInt(v, 10);
                        changeSet(ei, si, { reps: v === '' || !Number.isFinite(n) ? null : n });
                      }}
                      style={[
                        text('numeric', c.text),
                        {
                          width: 56,
                          height: 38,
                          marginHorizontal: 4,
                          borderRadius: radius.md,
                          backgroundColor: c.input,
                          textAlign: 'center',
                        },
                      ]}
                    />
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: set.done }}
                      accessibilityLabel={`Complete set ${labels[si]}`}
                      onPress={() => {
                        if (set.done) return changeSet(ei, si, { done: false });
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        updateWorkout((w) => ({
                          ...w,
                          restEndsAt: w.restSeconds > 0 ? Date.now() + w.restSeconds * 1000 : null,
                          exercises: w.exercises.map((e, i) =>
                            i === ei
                              ? {
                                  ...e,
                                  sets: e.sets.map((s, j) => (j === si ? completeSet(s, p) : s)),
                                }
                              : e,
                          ),
                        }));
                      }}
                      style={{
                        width: 44,
                        height: 38,
                        borderRadius: radius.md,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: set.done ? c.success : c.input,
                      }}
                    >
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={set.done ? c.onAccent : c.textSubtle}
                      />
                    </Pressable>
                  </View>
                );
              })}
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  updateWorkout((w) => ({
                    ...w,
                    exercises: w.exercises.map((e, i) => {
                      if (i !== ei) return e;
                      const last = e.sets.at(-1);
                      return {
                        ...e,
                        sets: [
                          ...e.sets,
                          last ? { ...last, type: 'normal', done: false } : emptySet(),
                        ],
                      };
                    }),
                  }))
                }
                style={{ alignSelf: 'center', padding: spacing.sm }}
              >
                <Text style={text('button', c.accent)}>Add set</Text>
              </Pressable>
            </View>
          );
        })}

        <Button title="Add exercises" variant="secondary" onPress={() => setPicking(true)} />
        <Button
          title="Cancel workout"
          variant="danger"
          onPress={() =>
            Alert.alert('Cancel workout?', 'Nothing will be saved.', [
              { text: 'Keep logging', style: 'cancel' },
              { text: 'Cancel workout', style: 'destructive', onPress: () => discardWorkout() },
            ])
          }
        />
      </ScrollView>

      <Modal visible={picking} animationType="slide" onRequestClose={() => setPicking(false)}>
        <ExercisePicker
          onClose={() => setPicking(false)}
          onPick={(id) => {
            setPicking(false);
            updateWorkout((w) => ({ ...w, exercises: [...w.exercises, newWorkoutExercise(id)] }));
          }}
        />
      </Modal>
    </View>
  );
}

function ExercisePicker({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (id: string) => void;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const api = useApi();
  const exercises = useQuery({ queryKey: ['exercises'], queryFn: api.exercises.list });
  const [q, setQ] = useState('');
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const list = (exercises.data ?? []).filter((e) =>
    words.every((w) => `${exerciseDisplayName(e)} ${e.muscle}`.toLowerCase().includes(w)),
  );
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: c.background,
        paddingTop: insets.top + spacing.md,
        paddingHorizontal: layout.screenGutter,
        gap: spacing.md,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={[text('title', c.text), { flex: 1 }]}>Add exercise</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
          hitSlop={10}
        >
          <Ionicons name="close" size={26} color={c.textMuted} />
        </Pressable>
      </View>
      <TextInput
        accessibilityLabel="Search exercises"
        placeholder="Search exercises"
        placeholderTextColor={c.textSubtle}
        value={q}
        onChangeText={setQ}
        autoFocus
        style={[
          text('body', c.text),
          { backgroundColor: c.input, borderRadius: radius.md, padding: spacing.md },
        ]}
      />
      <FlatList
        data={list}
        keyExtractor={(e) => e.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => onPick(item.id)}
            style={{
              paddingVertical: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: c.border,
            }}
          >
            <Text style={text('body', c.text)}>{exerciseDisplayName(item)}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}
