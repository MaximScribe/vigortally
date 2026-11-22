import { EmptyState, Page, Section } from '../components/Page';

export function NutritionPage() {
  return (
    <Page title="Nutrition">
      <Section label="Today">
        <EmptyState title="Nothing logged yet">
          Your macro ring, calories, water and weigh-ins will show up here.
        </EmptyState>
      </Section>
    </Page>
  );
}
