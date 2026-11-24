import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, router, Tabs } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSession } from '../../src/session';
import { layout, text, useColors } from '../../src/theme';

function Avatar() {
  const c = useColors();
  const { pairing, pendingWrites } = useSession();
  const initials =
    pairing?.user.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || '?';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open menu"
      onPress={() => router.push('/menu')}
      hitSlop={8}
      style={{ marginRight: layout.screenGutter }}
    >
      <View
        style={{
          width: layout.avatarSize,
          height: layout.avatarSize,
          borderRadius: layout.avatarSize / 2,
          backgroundColor: c.accent,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={text('bodySmall', c.onAccent)}>{initials}</Text>
      </View>
      {pendingWrites > 0 && (
        <View
          accessibilityLabel={`${pendingWrites} changes waiting to sync`}
          style={{
            position: 'absolute',
            right: -2,
            top: -2,
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: c.warning,
            borderWidth: 2,
            borderColor: c.background,
          }}
        />
      )}
    </Pressable>
  );
}

/** Activities (the middle tab) is where the app opens. */
export const unstable_settings = { initialRouteName: 'activities' };

/** Bottom bar: Nutrition · Activities (center, default) · Stats. */
export default function TabsLayout() {
  const c = useColors();
  const { pairing, loading } = useSession();
  if (!loading && !pairing) return <Redirect href="/pair" />;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: c.background },
        headerShadowVisible: false,
        headerTitle: '',
        headerRight: () => <Avatar />,
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.border,
          height: layout.bottomBarHeight + 8,
        },
        tabBarActiveTintColor: c.text,
        tabBarInactiveTintColor: c.textSubtle,
      }}
    >
      <Tabs.Screen
        name="nutrition"
        options={{
          title: 'Nutrition',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="nutrition-outline" color={color as string} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="activities"
        options={{
          title: 'Activities',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="pulse-outline" color={color as string} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" color={color as string} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
