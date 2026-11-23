import { today as todayIso } from '@vigortally/core';
import type { ShoppingItem } from '@vigortally/schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useApi } from '../api/ApiProvider';
import { Button, ErrorMessage } from '../components/forms';
import { formatDayInSentence, formatNumber } from '../lib/format';
import { newId } from '../lib/ids';

function formatGrams(grams: number): string {
  return grams >= 1000 ? `${formatNumber(grams / 1000, 2)} kg` : `${formatNumber(grams, 0)} g`;
}

/** The dynamic shopping list: basics for the planned meals plus hand-written extras. */
export function ShoppingTab() {
  const api = useApi();
  const queryClient = useQueryClient();
  const today = todayIso();
  const list = useQuery({
    queryKey: ['shopping-list', today],
    queryFn: () => api.shopping.list(today),
  });
  const [extra, setExtra] = useState('');
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['shopping-list'] });

  const buy = useMutation({
    mutationFn: (item: ShoppingItem) =>
      api.shopping.purchase({ id: newId(), foodId: item.foodId, grams: item.gramsToBuy }),
    onSuccess: refresh,
  });
  const saveExtra = useMutation({ mutationFn: api.shopping.saveExtra, onSuccess: refresh });
  const removeExtra = useMutation({ mutationFn: api.shopping.removeExtra, onSuccess: refresh });
  const clearDone = useMutation({ mutationFn: api.shopping.clearDoneExtras, onSuccess: refresh });

  const data = list.data;
  const days = data?.daysUntilShopping;

  return (
    <>
      {data && (
        <div className="vt-forecast" role="status">
          {days == null ? (
            <span>Plan some meals to get a shopping forecast.</span>
          ) : days === 0 ? (
            <span>
              <strong>Shop today</strong> — today&apos;s meals aren&apos;t covered.
            </span>
          ) : (
            <span>
              <strong>
                Shop in {days} {days === 1 ? 'day' : 'days'}
              </strong>{' '}
              — planned meals covered until {formatDayInSentence(data.coveredUntil!)}.
            </span>
          )}
          <span className="vt-muted">
            List covers meals until {formatDayInSentence(data.until)}.
          </span>
        </div>
      )}

      <ul className="vt-list" aria-label="Shopping list">
        {data?.items.map((item) => (
          <li key={item.foodId} className="vt-list__item">
            <button
              type="button"
              className="vt-check"
              aria-label={`Bought ${item.name}`}
              disabled={buy.isPending}
              onClick={() => buy.mutate(item)}
            >
              <Check aria-hidden="true" size={16} />
            </button>
            <span className="vt-list__main">
              <span>{item.name}</span>
              <span className="vt-list__sub">
                need {formatGrams(item.gramsNeeded)} · at home ~{formatGrams(item.gramsInStock)}
              </span>
            </span>
            <span className="vt-list__value">{formatGrams(item.gramsToBuy)}</span>
          </li>
        ))}
        {data?.extras.map((e) => (
          <li key={e.id} className="vt-list__item">
            <button
              type="button"
              className="vt-check"
              aria-pressed={e.done}
              aria-label={`Bought ${e.text}`}
              onClick={() => saveExtra.mutate({ ...e, done: !e.done })}
            >
              <Check aria-hidden="true" size={16} />
            </button>
            <span className={`vt-list__main ${e.done ? 'vt-done' : ''}`}>{e.text}</span>
            <button
              type="button"
              className="vt-icon-button"
              aria-label={`Remove ${e.text}`}
              onClick={() => removeExtra.mutate(e.id)}
            >
              <Trash2 aria-hidden="true" size={16} />
            </button>
          </li>
        ))}
        {data && data.items.length === 0 && data.extras.length === 0 && (
          <li className="vt-list__empty">Nothing to buy for the planned meals.</li>
        )}
      </ul>

      <form
        className="vt-row vt-row--end"
        onSubmit={(e) => {
          e.preventDefault();
          if (!extra.trim()) return;
          saveExtra.mutate({ id: newId(), text: extra.trim(), done: false });
          setExtra('');
        }}
      >
        <input
          className="vt-input"
          placeholder="Add something else"
          aria-label="Add to shopping list"
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
        />
        <Button type="submit" variant="secondary" disabled={!extra.trim()}>
          Add
        </Button>
      </form>
      {data?.extras.some((e) => e.done) && (
        <Button variant="ghost" onClick={() => clearDone.mutate()}>
          Clear ticked items
        </Button>
      )}
      <ErrorMessage error={list.error ?? buy.error ?? saveExtra.error} />
    </>
  );
}
