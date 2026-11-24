import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useSession } from '../src/session';
import { useColors } from '../src/theme';

/** Sends unpaired phones to pairing and paired ones to the Activities tab. */
export default function Index() {
  const { loading, pairing } = useSession();
  const c = useColors();
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: c.background,
        }}
      >
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }
  return <Redirect href={pairing ? '/activities' : '/pair'} />;
}
