import type { PairingCode } from '@vigortally/schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Globe, Smartphone } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { useApi } from '../../api/ApiProvider';
import { Button, ErrorMessage } from '../../components/forms';
import { Page, Section } from '../../components/Page';
import { useNow } from '../../hooks/useNow';
import { formatDayInSentence, formatTime } from '../../lib/format';
import '../../components/list.css';

export function DevicesPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const devices = useQuery({ queryKey: ['devices'], queryFn: api.devices.list });
  const [pairing, setPairing] = useState<PairingCode | null>(null);
  const create = useMutation({ mutationFn: api.devices.createPairingCode, onSuccess: setPairing });
  const revoke = useMutation({
    mutationFn: api.devices.revoke,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['devices'] }),
  });

  return (
    <Page title="Connected devices">
      <Section label="Companion app">
        <div className="vt-card vt-form">
          {pairing ? (
            <PairingPanel
              code={pairing}
              onDone={() => {
                setPairing(null);
                void queryClient.invalidateQueries({ queryKey: ['devices'] });
              }}
            />
          ) : (
            <>
              <p className="vt-muted" style={{ margin: 0 }}>
                Open the VigorTally app on your phone and scan the code to connect it to this
                server. The phone keeps working offline and syncs when it can reach the server.
              </p>
              <Button busy={create.isPending} onClick={() => create.mutate()}>
                Connect app
              </Button>
            </>
          )}
          <ErrorMessage error={create.error} />
        </div>
      </Section>

      <Section label="Signed in">
        <ul className="vt-list">
          {devices.data?.map((device) => {
            const Icon = device.kind === 'device' ? Smartphone : Globe;
            return (
              <li key={device.id} className="vt-list__item">
                <Icon aria-hidden="true" size={20} className="vt-accent" />
                <span className="vt-list__main">
                  <span>
                    {device.name}
                    {device.current && <span className="vt-muted"> · this browser</span>}
                  </span>
                  <span className="vt-list__sub">
                    {device.lastUsedAt
                      ? `Last used ${formatDayInSentence(device.lastUsedAt)}, ${formatTime(device.lastUsedAt)}`
                      : 'Never used'}
                  </span>
                </span>
                {!device.current && (
                  <Button
                    variant="danger"
                    onClick={() => {
                      if (window.confirm(`Sign out ${device.name}?`)) revoke.mutate(device.id);
                    }}
                  >
                    Sign out
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
        <ErrorMessage error={devices.error ?? revoke.error} />
      </Section>
    </Page>
  );
}

function PairingPanel({ code, onDone }: { code: PairingCode; onDone: () => void }) {
  const now = useNow(1000);
  const [svg, setSvg] = useState<string | null>(null);
  const secondsLeft = Math.max(0, Math.round((new Date(code.expiresAt).getTime() - now) / 1000));

  useEffect(() => {
    let cancelled = false;
    QRCode.toString(code.link, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' })
      .then((markup) => !cancelled && setSvg(markup))
      .catch(() => !cancelled && setSvg(null));
    return () => {
      cancelled = true;
    };
  }, [code.link]);

  if (secondsLeft === 0) {
    return (
      <>
        <p style={{ margin: 0 }}>This code has expired.</p>
        <Button variant="secondary" onClick={onDone}>
          Done
        </Button>
      </>
    );
  }

  return (
    <div className="vt-pairing">
      {svg && (
        <div
          className="vt-pairing__qr"
          role="img"
          aria-label="QR code to connect the companion app"
          // The SVG is generated locally by the qrcode library from our own link.
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}
      <div className="vt-pairing__details">
        <p className="vt-label">Or enter manually</p>
        <p className="vt-muted" style={{ margin: 0 }}>
          Server
        </p>
        <p className="vt-pairing__value">{code.serverUrl}</p>
        <p className="vt-muted" style={{ margin: 0 }}>
          Code
        </p>
        <p className="vt-pairing__code" aria-label="Pairing code">
          {code.code}
        </p>
        <p className="vt-muted" style={{ margin: 0 }}>
          Valid for {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
        </p>
        <Button variant="secondary" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  );
}
