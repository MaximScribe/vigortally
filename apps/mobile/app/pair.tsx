import { createApiClient } from '@vigortally/client';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { Button, Card, ErrorText, Field, Muted, Screen } from '../src/components';
import { isInsecureRemote, normalizeServerUrl, parsePairingLink } from '../src/pairing';
import { useSession } from '../src/session';
import { spacing, text, useColors } from '../src/theme';

function deviceName(): string {
  return Platform.OS === 'ios' ? 'iPhone / iPad' : 'Android phone';
}

/** Connect this phone to a VigorTally server: scan the QR code or type it in. */
export default function PairScreen() {
  const c = useColors();
  const { savePairing } = useSession();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [server, setServer] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function pair(serverInput: string, codeInput: string) {
    const serverUrl = normalizeServerUrl(serverInput);
    if (!serverUrl) return setError(new Error('Enter the address of your VigorTally server.'));
    setBusy(true);
    setError(null);
    try {
      const api = createApiClient({ baseUrl: serverUrl });
      const info = await api.server.info();
      if (info.apiVersion !== 1) {
        throw new Error(
          `This app needs API version 1; the server speaks ${info.apiVersion}. Update the app or server.`,
        );
      }
      const result = await api.devices.pair({ code: codeInput, deviceName: deviceName() });
      await savePairing({ serverUrl, token: result.token, user: result.user });
      router.replace('/activities');
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen title="Connect">
      <Muted>
        On your computer, open VigorTally, tap your profile picture and choose Connected devices →
        Connect app. Then scan the code shown there.
      </Muted>

      {scanning && permission?.granted ? (
        <View style={{ height: 320, borderRadius: 16, overflow: 'hidden' }}>
          <CameraView
            style={{ flex: 1 }}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={({ data }) => {
              const link = parsePairingLink(data);
              if (!link || busy) return;
              setScanning(false);
              setServer(link.serverUrl);
              setCode(link.code);
              void pair(link.serverUrl, link.code);
            }}
          />
        </View>
      ) : (
        <Button
          title="Scan QR code"
          onPress={async () => {
            const granted = permission?.granted || (await requestPermission()).granted;
            if (granted) setScanning(true);
            else
              setError(
                new Error('Camera access is needed to scan. You can type the code instead.'),
              );
          }}
        />
      )}

      <Card>
        <Text style={text('label', c.textSubtle)}>Or enter it by hand</Text>
        <Field
          label="Server address"
          placeholder="vigortally.your-tailnet.ts.net"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          value={server}
          onChangeText={setServer}
        />
        {normalizeServerUrl(server) && isInsecureRemote(normalizeServerUrl(server)!) && (
          <Text style={text('bodySmall', c.warning)}>
            Plain HTTP outside your home network isn&apos;t private. Use HTTPS or Tailscale.
          </Text>
        )}
        <Field
          label="Pairing code"
          placeholder="ABCD-EFGH"
          autoCapitalize="characters"
          autoCorrect={false}
          value={code}
          onChangeText={setCode}
        />
        <ErrorText error={error} />
        <View style={{ marginTop: spacing.sm }}>
          <Button
            title="Connect"
            busy={busy}
            disabled={!server || code.length < 6}
            onPress={() => void pair(server, code)}
          />
        </View>
      </Card>
    </Screen>
  );
}
