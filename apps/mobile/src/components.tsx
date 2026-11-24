import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { layout, radius, spacing, text, useColors } from './theme';

/** Standard screen: big title, scrolling content, pull to refresh. */
export function Screen({
  title,
  children,
  onRefresh,
  refreshing = false,
  headerRight,
}: {
  title?: string;
  children: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  headerRight?: ReactNode;
}) {
  const c = useColors();
  return (
    <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />
          ) : undefined
        }
      >
        {(title || headerRight) && (
          <View style={styles.titleRow}>
            {title && <Text style={text('display', c.text)}>{title}</Text>}
            {headerRight}
          </View>
        )}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Section({
  label,
  action,
  children,
}: {
  label: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  const c = useColors();
  return (
    <View style={{ gap: spacing.md }}>
      <View style={styles.sectionHeader}>
        <Text style={text('label', c.textSubtle)}>{label}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const c = useColors();
  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }, style]}>
      {children}
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  busy,
  accessibilityLabel,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  busy?: boolean;
  accessibilityLabel?: string;
}) {
  const c = useColors();
  const background =
    variant === 'primary' ? c.accent : variant === 'secondary' ? c.surfaceRaised : 'transparent';
  const color =
    variant === 'primary'
      ? c.onAccent
      : variant === 'danger'
        ? c.danger
        : variant === 'ghost'
          ? c.accent
          : c.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed && variant === 'primary' ? c.accentPressed : background,
          borderColor: variant === 'danger' ? c.border : 'transparent',
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text style={text('button', color)}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  suffix,
  ...input
}: TextInputProps & { label: string; suffix?: string }) {
  const c = useColors();
  return (
    <View style={{ gap: spacing.xs, flex: 1 }}>
      <Text style={text('bodySmall', c.textMuted)}>{label}</Text>
      <View style={{ justifyContent: 'center' }}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={c.textSubtle}
          style={[
            styles.input,
            { backgroundColor: c.input, color: c.text, paddingRight: suffix ? 44 : spacing.md },
          ]}
          {...input}
        />
        {suffix && (
          <Text style={[text('body', c.textSubtle), { position: 'absolute', right: spacing.md }]}>
            {suffix}
          </Text>
        )}
      </View>
    </View>
  );
}

export function ErrorText({ error }: { error: unknown }) {
  const c = useColors();
  if (!error) return null;
  const message = error instanceof Error ? error.message : 'Something went wrong';
  return (
    <Text accessibilityRole="alert" style={text('bodySmall', c.danger)}>
      {message}
    </Text>
  );
}

export function Muted({ children }: { children: ReactNode }) {
  const c = useColors();
  return <Text style={text('bodySmall', c.textMuted)}>{children}</Text>;
}

/** Row in a list card. */
export function ListRow({
  title,
  subtitle,
  value,
  onPress,
  right,
}: {
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  right?: ReactNode;
}) {
  const c = useColors();
  const content = (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={text('body', c.text)}>{title}</Text>
        {subtitle ? <Text style={text('bodySmall', c.textMuted)}>{subtitle}</Text> : null}
      </View>
      {value ? <Text style={text('body', c.textMuted)}>{value}</Text> : null}
      {right}
    </View>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {content}
    </Pressable>
  ) : (
    content
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
    paddingHorizontal: layout.screenGutter,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: layout.minTouchTarget,
  },
  card: { padding: spacing.lg, borderWidth: 1, borderRadius: radius.lg, gap: spacing.md },
  button: {
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 52,
    paddingVertical: spacing.sm,
  },
});
