import { equipmentLabel, exerciseDisplayName } from '@vigortally/core';
import {
  equipment as equipmentSchema,
  muscleGroup,
  type Equipment,
  type Exercise,
  type MuscleGroup,
} from '@vigortally/schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useApi } from '../api/ApiProvider';
import { Button, ErrorMessage, SelectField, TextField } from '../components/forms';
import { Sheet } from '../components/Sheet';
import { newId } from '../lib/ids';
import '../components/list.css';

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (exerciseIds: string[]) => void;
}

const muscleLabel = (m: MuscleGroup) =>
  m === 'full_body' ? 'Full body' : m[0]!.toUpperCase() + m.slice(1);

export function useExercises() {
  const api = useApi();
  const query = useQuery({
    queryKey: ['exercises'],
    queryFn: api.exercises.list,
    staleTime: 5 * 60_000,
  });
  const byId = useMemo(() => new Map((query.data ?? []).map((e) => [e.id, e])), [query.data]);
  return { ...query, byId };
}

/** Pick one or more exercises, or create a custom one. */
export function ExercisePicker({ open, onClose, onAdd }: Props) {
  const exercises = useExercises();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const words = search.toLowerCase().split(/\s+/).filter(Boolean);
    return (exercises.data ?? []).filter((e) => {
      const text = `${exerciseDisplayName(e)} ${e.muscle}`.toLowerCase();
      return words.every((w) => text.includes(w));
    });
  }, [exercises.data, search]);

  function close() {
    setSearch('');
    setSelected([]);
    setCreating(false);
    onClose();
  }

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <Sheet
      open={open}
      title={creating ? 'New exercise' : 'Add exercises'}
      onClose={close}
      footer={
        !creating && (
          <Button
            disabled={selected.length === 0}
            onClick={() => {
              onAdd(selected);
              close();
            }}
          >
            Add {selected.length > 0 ? `(${selected.length})` : ''}
          </Button>
        )
      }
    >
      {creating ? (
        <CreateExercise
          initialName={search}
          onCancel={() => setCreating(false)}
          onCreated={(exercise) => {
            setCreating(false);
            setSelected((s) => [...s, exercise.id]);
          }}
        />
      ) : (
        <>
          <div className="vt-field__control">
            <input
              className="vt-input"
              type="search"
              placeholder="Search exercises"
              aria-label="Search exercises"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            <Search className="vt-field__suffix" aria-hidden="true" size={18} />
          </div>
          <ul className="vt-list">
            {filtered.map((exercise: Exercise) => {
              const isSelected = selected.includes(exercise.id);
              return (
                <li key={exercise.id}>
                  <button
                    type="button"
                    className="vt-list__item vt-list__item--button"
                    aria-pressed={isSelected}
                    onClick={() => toggle(exercise.id)}
                  >
                    <span className="vt-list__main">
                      <span className={isSelected ? 'vt-accent' : undefined}>
                        {exerciseDisplayName(exercise)}
                      </span>
                      <span className="vt-list__sub">{muscleLabel(exercise.muscle)}</span>
                    </span>
                    {isSelected && <Check aria-hidden="true" size={20} className="vt-accent" />}
                  </button>
                </li>
              );
            })}
            {exercises.isSuccess && filtered.length === 0 && (
              <li className="vt-list__empty">No exercise matches “{search}”.</li>
            )}
          </ul>
          <Button variant="secondary" onClick={() => setCreating(true)}>
            Create exercise
          </Button>
          <ErrorMessage error={exercises.error} />
        </>
      )}
    </Sheet>
  );
}

function CreateExercise({
  initialName,
  onCancel,
  onCreated,
}: {
  initialName: string;
  onCancel: () => void;
  onCreated: (exercise: Exercise) => void;
}) {
  const api = useApi();
  const queryClient = useQueryClient();
  const [name, setName] = useState(initialName);
  const [equipment, setEquipment] = useState<Equipment>('barbell');
  const [muscle, setMuscle] = useState<MuscleGroup>('chest');
  const create = useMutation({
    mutationFn: api.exercises.save,
    onSuccess: async (exercise) => {
      await queryClient.invalidateQueries({ queryKey: ['exercises'] });
      onCreated(exercise);
    },
  });

  return (
    <>
      <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      <div className="vt-row">
        <SelectField
          label="Equipment"
          value={equipment}
          onChange={(e) => setEquipment(e.target.value as Equipment)}
          options={equipmentSchema.options.map((value) => ({
            value,
            label: equipmentLabel(value),
          }))}
        />
        <SelectField
          label="Muscle"
          value={muscle}
          onChange={(e) => setMuscle(e.target.value as MuscleGroup)}
          options={muscleGroup.options.map((value) => ({ value, label: muscleLabel(value) }))}
        />
      </div>
      <ErrorMessage error={create.error} />
      <div className="vt-row">
        <Button variant="secondary" onClick={onCancel}>
          Back
        </Button>
        <Button
          disabled={!name.trim()}
          busy={create.isPending}
          onClick={() => create.mutate({ id: newId(), name: name.trim(), equipment, muscle })}
        >
          Create
        </Button>
      </div>
    </>
  );
}
