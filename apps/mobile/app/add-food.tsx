import { nutrientsForGrams } from '@vigortally/core';
import type { Food, Meal } from '@vigortally/schema';
import { useQuery } from '@tanstack/react-query';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { Button, Card, ErrorText, Field, Muted } from '../src/components';
import { newId } from '../src/ids';
import { useApi, useSession } from '../src/session';
import { layout, radius, spacing, text, useColors } from '../src/theme';

/** Search, recent foods or barcode scan, then pick an amount. */
export default function AddFoodScreen() {
  const c = useColors();
  const api = useApi();
  const { write } = useSession();
  const params = useLocalSearchParams<{ meal: Meal; date: string }>();
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Food | null>(null);
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [lookupError, setLookupError] = useState<unknown>(null);
  const query = q.trim();
  const foods = useQuery({
    queryKey: ['foods', query],
    queryFn: () => (query ? api.foods.search(query) : api.foods.recent()),
  });

  if (picked) {
    return (
      <Amount
        food={picked}
        onBack={() => setPicked(null)}
        onAdd={async (quantity) => {
          const id = newId();
          await write('PUT', `/diary/${id}`, {
            id,
            date: params.date,
            meal: params.meal,
            foodId: picked.id,
            quantity,
          });
          router.back();
        }}
      />
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: c.background,
        padding: layout.screenGutter,
        gap: spacing.md,
      }}
    >
      {scanning ? (
        <View style={{ height: 260, borderRadius: radius.lg, overflow: 'hidden' }}>
          <CameraView
            style={{ flex: 1 }}
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
            onBarcodeScanned={async ({ data }) => {
              setScanning(false);
              setLookupError(null);
              try {
                setPicked(await api.foods.barcode(data));
              } catch (e) {
                setLookupError(e);
              }
            }}
          />
        </View>
      ) : (
        <Button
          title="Scan barcode"
          onPress={async () => {
            const granted = permission?.granted || (await requestPermission()).granted;
            if (granted) setScanning(true);
          }}
        />
      )}
      <ErrorText error={lookupError} />
      <TextInput
        accessibilityLabel="Search foods"
        placeholder="Search your foods"
        placeholderTextColor={c.textSubtle}
        value={q}
        onChangeText={setQ}
        style={[
          text('body', c.text),
          { backgroundColor: c.input, borderRadius: radius.md, padding: spacing.md },
        ]}
      />
      {!query && <Text style={text('label', c.textSubtle)}>Recent</Text>}
      <FlatList
        data={foods.data ?? []}
        keyExtractor={(f) => f.id}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          foods.isSuccess ? (
            <Muted>
              {query
                ? 'No food matches. Create foods in the web app.'
                : 'Foods you log show up here.'}
            </Muted>
          ) : undefined
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => setPicked(item)}
            style={{
              paddingVertical: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: c.border,
            }}
          >
            <Text style={text('body', c.text)}>{item.name}</Text>
            <Muted>
              {[item.brand, `${Math.round(item.per100g.kcal)} kcal / 100 g`]
                .filter(Boolean)
                .join(' · ')}
            </Muted>
          </Pressable>
        )}
      />
    </View>
  );
}

function Amount({
  food,
  onBack,
  onAdd,
}: {
  food: Food;
  onBack: () => void;
  onAdd: (q: { grams: number } | { servings: number }) => Promise<void>;
}) {
  const c = useColors();
  const serving = food.servings[0];
  const [amount, setAmount] = useState(serving ? '1' : '100');
  const [busy, setBusy] = useState(false);
  const value = Number(amount.replace(',', '.')) || 0;
  const grams = serving ? value * serving.grams : value;
  const n = nutrientsForGrams(food.per100g, grams);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: c.background,
        padding: layout.screenGutter,
        gap: spacing.lg,
      }}
    >
      <View>
        <Text style={text('title', c.text)}>{food.name}</Text>
        {food.brand && <Muted>{food.brand}</Muted>}
      </View>
      <Field
        label={serving ? `Servings (${serving.label})` : 'Grams'}
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
        autoFocus
      />
      <Card style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
        {[
          [Math.round(n.kcal), 'kcal'],
          [n.protein.toFixed(1), 'protein'],
          [n.carbs.toFixed(1), 'carbs'],
          [n.fat.toFixed(1), 'fat'],
        ].map(([v, l]) => (
          <View key={l} style={{ alignItems: 'center' }}>
            <Text style={text('headline', c.text)}>{v}</Text>
            <Muted>{l}</Muted>
          </View>
        ))}
      </Card>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Button title="Back" variant="secondary" onPress={onBack} />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            title="Add"
            busy={busy}
            disabled={value <= 0}
            onPress={async () => {
              setBusy(true);
              await onAdd(serving ? { servings: value } : { grams: value });
            }}
          />
        </View>
      </View>
    </View>
  );
}
