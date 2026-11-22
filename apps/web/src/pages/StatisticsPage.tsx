import { EmptyState, Page, Section } from '../components/Page';

export function StatisticsPage() {
  return (
    <Page title="Statistics">
      <Section label="Dashboard">
        <EmptyState title="Your dashboard is empty">
          Add widgets for any metric: training volume, weight trend, calories and more.
        </EmptyState>
      </Section>
    </Page>
  );
}
