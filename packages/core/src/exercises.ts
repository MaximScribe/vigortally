/**
 * Built-in exercise library. Ids are fixed so workouts and templates keep pointing at the
 * same exercise across servers and updates. Names follow "Name (Equipment)" in the UI.
 */
import type { Equipment, Exercise, MuscleGroup } from '@vigortally/schema';

type Row = [id: string, name: string, equipment: Equipment, muscle: MuscleGroup];

const rows: Row[] = [
  ['e1771a08-8418-4839-a860-393fe6b1e0fe', 'Bench Press', 'barbell', 'chest'],
  ['d6cfb44c-5586-4f4f-b73f-3135d7b10f96', 'Bench Press', 'dumbbell', 'chest'],
  ['d62a34cb-0c7b-4956-b994-e559aafe663c', 'Incline Bench Press', 'barbell', 'chest'],
  ['beb741fe-8983-46c6-9b8b-145dab5c1585', 'Incline Bench Press', 'dumbbell', 'chest'],
  ['28cbfe18-5ca7-4ba5-915d-92ca479e7f44', 'Chest Fly', 'cable', 'chest'],
  ['d99473d9-6330-48ba-bd9a-43c5f8175ebe', 'Chest Dip', 'bodyweight', 'chest'],
  ['89bd3e36-32e9-49b6-ad5b-dc7b256d8847', 'Push Up', 'bodyweight', 'chest'],
  ['744eec80-a616-449b-924d-b816628df6e9', 'Deadlift', 'barbell', 'back'],
  ['9aee0e28-4130-46ba-9546-2086d50754f5', 'Romanian Deadlift', 'barbell', 'hamstrings'],
  ['2f37a8e2-a6a7-48ca-b922-35523538c42f', 'Pull Up', 'bodyweight', 'back'],
  ['a3bce57c-66d8-4e99-a6e7-09ba97734d1c', 'Chin Up', 'bodyweight', 'back'],
  ['828ff49c-6a46-4b2c-b62c-e61ea46dd4a0', 'Lat Pulldown', 'cable', 'back'],
  ['a4a254c7-79c7-4669-870f-87600a196ed3', 'Seated Row', 'cable', 'back'],
  ['85ad7f3a-a068-443b-9ecb-27dc90b1f2f0', 'Seated Row', 'machine', 'back'],
  ['22a907af-ea7b-4b2b-8ed9-bc8e21220ec5', 'Bent Over Row', 'barbell', 'back'],
  ['8a7547f0-2a85-40e2-bfc9-a6f4f2983fa7', 'One Arm Row', 'dumbbell', 'back'],
  ['5f827805-9c47-4354-887d-cab32668754d', 'Overhead Press', 'barbell', 'shoulders'],
  ['3f925eca-052a-49b6-9f9e-512dc0e1ceae', 'Shoulder Press', 'dumbbell', 'shoulders'],
  ['245d7f13-61c8-4984-921a-2fcbb3a12e7a', 'Lateral Raise', 'dumbbell', 'shoulders'],
  ['be46f32a-6f31-4fac-b0be-ea2411630b4a', 'Lateral Raise', 'cable', 'shoulders'],
  ['bea6d574-5ea9-4a25-bb63-23a2db671059', 'Face Pull', 'cable', 'shoulders'],
  ['38f8e163-95e8-4cfa-a1f3-a55b33d4a994', 'Rear Delt Fly', 'machine', 'shoulders'],
  ['3d1ac53d-956c-4424-a644-550199b55939', 'Bicep Curl', 'barbell', 'biceps'],
  ['e08344f1-6d24-42b6-934c-2ec912c50e58', 'Bicep Curl', 'dumbbell', 'biceps'],
  ['f1fff511-6317-4cad-a4b0-fd4145d24807', 'Bicep Curl', 'cable', 'biceps'],
  ['3265c854-9a13-47d8-9415-42f3ad826c00', 'Hammer Curl', 'dumbbell', 'biceps'],
  ['bfe7b924-e392-4b06-aca1-1cd6ae29cb2b', 'Triceps Pushdown', 'cable', 'triceps'],
  ['6fbdfd7d-e4ad-4e9e-9d51-71e5bc64bcf6', 'Skullcrusher', 'barbell', 'triceps'],
  ['236205bd-b4af-4cc5-b997-c454a23eece4', 'Overhead Triceps Extension', 'cable', 'triceps'],
  ['da7bf99d-4941-462b-ab10-e562ee5ce534', 'Squat', 'barbell', 'quads'],
  ['f32d2887-098a-4a3b-ad74-732b6dfabdc3', 'Front Squat', 'barbell', 'quads'],
  ['26263282-b97f-41c1-a8dd-5ac7a598ba40', 'Goblet Squat', 'kettlebell', 'quads'],
  ['fa773935-5aef-4e72-abf9-30b9800c792a', 'Leg Press', 'machine', 'quads'],
  ['050bec91-ab4f-46fa-955b-afa262dc52fe', 'Leg Extension', 'machine', 'quads'],
  ['d48e223d-fe70-4884-b2ad-8335c0dfe302', 'Bulgarian Split Squat', 'dumbbell', 'quads'],
  ['7aeb9a60-5877-4b61-8141-65a1cc3884a1', 'Lunge', 'dumbbell', 'quads'],
  ['453e10cc-fd9b-47ee-8d26-0ae67b97683a', 'Leg Curl', 'machine', 'hamstrings'],
  ['f269da22-e716-4492-a7ea-1cf4bba9fae3', 'Hip Thrust', 'barbell', 'glutes'],
  ['bc2401b7-9105-4dbc-b17f-8ff638ba33e4', 'Calf Raise', 'machine', 'calves'],
  ['40b5347a-e689-467f-9ec8-2e95bb092bcb', 'Plank', 'bodyweight', 'core'],
  ['860609dc-999d-4e68-a26f-c79055a3643f', 'Hanging Leg Raise', 'bodyweight', 'core'],
  ['9ce484fd-4375-400d-87fd-3b690dc9719d', 'Cable Crunch', 'cable', 'core'],
  ['2063068e-29fd-43fa-96f6-e9336c7e800f', 'Kettlebell Swing', 'kettlebell', 'full_body'],
];

export const builtInExercises: readonly Exercise[] = rows.map(([id, name, equipment, muscle]) => ({
  id,
  name,
  equipment,
  muscle,
  builtIn: true,
}));

const equipmentLabels: Record<Equipment, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  machine: 'Machine',
  cable: 'Cable',
  bodyweight: 'Bodyweight',
  kettlebell: 'Kettlebell',
  band: 'Band',
  other: 'Other',
};

/** "Bench Press (Dumbbell)". Bodyweight exercises keep their plain name. */
export function exerciseDisplayName(exercise: Pick<Exercise, 'name' | 'equipment'>): string {
  if (exercise.equipment === 'bodyweight' || exercise.equipment === 'other') return exercise.name;
  return `${exercise.name} (${equipmentLabels[exercise.equipment]})`;
}

export function equipmentLabel(equipment: Equipment): string {
  return equipmentLabels[equipment];
}
