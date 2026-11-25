import Ionicons from '@expo/vector-icons/Ionicons';
import { sideMenuWidth } from '@vigortally/ui';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Muted } from '../src/components';
import { useSession } from '../src/session';
import { spacing, text, useColors } from '../src/theme';

/**
 * Side menu from the profile picture: full screen when upright, the same width on the
 * right when the phone is sideways.
 */
export default function MenuScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const size = useWindowDimensions();
  const width = sideMenuWidth(size);
  const { pairing, pendingWrites, syncNow, unpair } = useSession();

  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      <Pressable
        accessibilityLabel="Close menu"
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
        onPress={() => router.back()}
      />
      <ScrollView
        style={{ width, flexGrow: 0, backgroundColor: c.background }}
        contentContainerStyle={{
          gap: spacing.xl,
          padding: spacing.xl,
          paddingTop: insets.top + spacing.lg,
          paddingBottom: insets.bottom + spacing.xl,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={text('title', c.text)}>{pairing?.user.name}</Text>
            <Muted>{pairing?.user.email}</Muted>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close menu"
            onPress={() => router.back()}
            hitSlop={12}
          >
            <Ionicons name="close" size={26} color={c.textMuted} />
          </Pressable>
        </View>

        <Card>
          <Text style={text('label', c.textSubtle)}>Server</Text>
          <Text style={text('body', c.text)}>{pairing?.serverUrl}</Text>
          <Muted>
            {pendingWrites === 0
              ? 'Everything is synced.'
              : `${pendingWrites} ${pendingWrites === 1 ? 'change is' : 'changes are'} waiting for the server.`}
          </Muted>
          {pendingWrites > 0 && (
            <Button title="Sync now" variant="secondary" onPress={() => void syncNow()} />
          )}
        </Card>

        <Muted>
          Profile, goals, recipes, the household and statistics settings are managed in the web app.
          The phone is for logging on the go.
        </Muted>

        <Button
          title="Disconnect this phone"
          variant="danger"
          onPress={() =>
            Alert.alert(
              'Disconnect?',
              pendingWrites > 0
                ? `${pendingWrites} unsynced changes will be lost.`
                : 'You can connect again with a new code.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Disconnect',
                  style: 'destructive',
                  onPress: () => {
                    void unpair().then(() => router.replace('/pair'));
                  },
                },
              ],
            )
          }
        />
      </ScrollView>
    </View>
  );
}
