import Ionicons from '@expo/vector-icons/Ionicons';
import { addDays, displayWeight, inputWeightToKg, today } from '@vigortally/core';
import { meals } from '@vigortally/schema';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { MacroRing } from '../../src/charts';
import { Button, Card, ErrorText, ListRow, Muted, Screen, Section } from '../../src/components';
import { newId } from '../../src/ids';
import { mealLabels } from '../../src/labels';
import { useApi, useSession } from '../../src/session';
import { radius, spacing, text, useColors } from '../../src/theme';

export default function NutritionTab() {
  const c = useColors();
  const api = useApi();
  const { write } = useSession();
  const [date, setDate] = useState(today);
  const me = useQuery({ queryKey: ['me'], queryFn: api.me.get });
  const day = useQuery({ queryKey: ['diary', date], queryFn: () => api.diary.day(date) });
  const plan = useQuery({
    queryKey: ['meal-plan', date],
    queryFn: () => api.mealPlan.list(date, date),
  });
  const [weight, setWeight] = useState('');
  const units = me.data?.profile.units ?? 'metric';
  const targets = me.data?.profile.targets;
  const data = day.data;

  const refresh = () => void day.refetch();
  const addWater = async (ml: number) => {
    const id = newId();
    await write('PUT', `/water/${id}`, { id, date, ml });
    refresh();
  };

  return (
    <Screen
      title="Nutrition"
      refreshing={day.isRefetching}
      onRefresh={() => {
        void day.refetch();
        void plan.refetch();
        void me.refetch();
      }}
    >
      {(plan.data?.length ?? 0) > 0 && (
        <Card>
          <Text style={text('label', c.textSubtle)}>
            Kitchen · cook {date === today() ? 'today' : 'this day'}
          </Text>
          {plan.data?.map((p) => (
            <ListRow
              key={p.id}
              title={p.recipeName}
              subtitle={`${mealLabels[p.meal]} · ${p.servings} servings`}
              right={
                <Button
                  title="Log 1"
                  variant="secondary"
                  accessibilityLabel={`Log one serving of ${p.recipeName}`}
                  onPress={async () => {
                    const id = newId();
                    await write('PUT', `/diary/${id}`, {
                      id,
                      date,
                      meal: p.meal,
                      recipeId: p.recipeId,
                      quantity: { servings: 1 },
                    });
                    refresh();
                  }}
                />
              }
            />
          ))}
        </Card>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous day"
          onPress={() => setDate((d) => addDays(d, -1))}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={24} color={c.textMuted} />
        </Pressable>
        <Text style={text('body', c.text)}>
          {date === today() ? 'Today' : new Date(`${date}T12:00:00`).toLocaleDateString()}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next day"
          onPress={() => setDate((d) => addDays(d, 1))}
          hitSlop={10}
        >
          <Ionicons name="chevron-forward" size={24} color={c.textMuted} />
        </Pressable>
      </View>

      {data && targets && (
        <Card>
          <MacroRing totals={data.totals} targets={targets} />
        </Card>
      )}

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Card style={{ flex: 1 }}>
          <Text style={text('label', c.textSubtle)}>Water</Text>
          <Text style={text('title', c.text)}>{((data?.waterMl ?? 0) / 1000).toFixed(2)} l</Text>
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            <View style={{ flex: 1 }}>
              <Button title="+250" variant="secondary" onPress={() => void addWater(250)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="+500" variant="secondary" onPress={() => void addWater(500)} />
            </View>
          </View>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={text('label', c.textSubtle)}>Weight</Text>
          <Text style={text('title', c.text)}>
            {data?.weighIn
              ? `${displayWeight(data.weighIn.weightKg, units).value} ${units === 'imperial' ? 'lb' : 'kg'}`
              : '—'}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            <TextInput
              accessibilityLabel="Weight"
              keyboardType="decimal-pad"
              placeholder={units === 'imperial' ? 'lb' : 'kg'}
              placeholderTextColor={c.textSubtle}
              value={weight}
              onChangeText={setWeight}
              style={[
                text('body', c.text),
                {
                  flex: 1,
                  minWidth: 0,
                  backgroundColor: c.input,
                  borderRadius: radius.md,
                  paddingHorizontal: spacing.sm,
                },
              ]}
            />
            <Button
              title="Log"
              variant="secondary"
              disabled={!weight}
              onPress={async () => {
                const n = Number(weight.replace(',', '.'));
                if (!(n > 0)) return;
                const id = data?.weighIn?.id ?? newId();
                await write('PUT', `/weigh-ins/${id}`, {
                  id,
                  date,
                  weightKg: inputWeightToKg(n, units),
                });
                setWeight('');
                refresh();
              }}
            />
          </View>
        </Card>
      </View>

      {meals.map((meal) => {
        const entries = data?.entries.filter((e) => e.meal === meal) ?? [];
        const kcal = entries.reduce((s, e) => s + e.nutrients.kcal, 0);
        return (
          <Section
            key={meal}
            label={mealLabels[meal]}
            action={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Add to ${mealLabels[meal].toLowerCase()}`}
                onPress={() => router.push({ pathname: '/add-food', params: { meal, date } })}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
                hitSlop={8}
              >
                {entries.length > 0 && <Muted>{Math.round(kcal)} kcal</Muted>}
                <Ionicons name="add" size={26} color={c.accent} />
              </Pressable>
            }
          >
            {entries.length > 0 && (
              <Card style={{ paddingVertical: spacing.xs }}>
                {entries.map((e) => (
                  <ListRow
                    key={e.id}
                    title={e.name}
                    subtitle={e.grams != null ? `${Math.round(e.grams)} g` : undefined}
                    value={`${Math.round(e.nutrients.kcal)} kcal`}
                  />
                ))}
              </Card>
            )}
          </Section>
        );
      })}
      <ErrorText error={day.error ?? me.error} />
    </Screen>
  );
}
