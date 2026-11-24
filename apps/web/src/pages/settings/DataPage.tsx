import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { useApi } from '../../api/ApiProvider';
import { ErrorMessage } from '../../components/forms';
import { Page, Section } from '../../components/Page';
import '../../components/list.css';

export function DataPage() {
  const api = useApi();
  const info = useQuery({ queryKey: ['server-info'], queryFn: api.server.info });

  return (
    <Page title="Export & server">
      <Section label="Your data">
        <div className="vt-card vt-form">
          <p className="vt-muted" style={{ margin: 0 }}>
            Download everything you have logged (workouts, activities, diary, weigh-ins) and what
            your household shares (foods, recipes, meal plan, shopping) as one JSON file.
          </p>
          <a className="vt-button vt-button--secondary" href="/api/export" download>
            <Download aria-hidden="true" size={18} /> Download my data
          </a>
        </div>
      </Section>

      <Section label="Server">
        <ul className="vt-list">
          <li className="vt-list__item">
            <span className="vt-list__main">Version</span>
            <span className="vt-list__value">{info.data?.version ?? '…'}</span>
          </li>
          <li className="vt-list__item">
            <span className="vt-list__main">API version</span>
            <span className="vt-list__value">{info.data?.apiVersion ?? '…'}</span>
          </li>
          <li className="vt-list__item">
            <span className="vt-list__main">Features</span>
            <span className="vt-list__value">{info.data?.features.join(', ') ?? '…'}</span>
          </li>
        </ul>
        <ErrorMessage error={info.error} />
      </Section>
    </Page>
  );
}
