import { EmptyState, Page, Section } from '../components/Page';

export function ActivitiesPage() {
  return (
    <Page title="Activities">
      <Section label="My activities">
        <EmptyState title="No activities yet">
          Add the sports you do: strength training, running, skiing, bouldering or your own.
        </EmptyState>
      </Section>
    </Page>
  );
}
