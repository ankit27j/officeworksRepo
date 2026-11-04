import { observer } from 'mobx-react-lite';
import { Outlet, ScrollRestoration, useLocation, useNavigate, useSearchParams } from 'react-router';
import { AppHeader } from '../components/layout/AppHeader';
import { AppLayout } from '../components/layout/AppLayout';
import { CategoryNav } from '../components/navigation/CategoryNav';
import { SearchBar } from '../components/search/SearchBar';
import { ThemeToggle } from '../components/theme/ThemeToggle';
import { APP_CONFIG } from '../config/app';
import { paths } from '../config/paths';
import { useCategories } from '../hooks/useCategories';
import { useStores } from '../hooks/useStores';

/** Wires stores and routing into the presentational layout. Every page renders inside <Outlet />. */
export const RootLayout = observer(function RootLayout() {
  const { theme } = useStores();
  const { state: categories } = useCategories();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const currentTerm = location.pathname === '/search' ? (params.get('q') ?? '') : '';

  return (
    <AppLayout
      header={
        <AppHeader
          appName={APP_CONFIG.name}
          // key: reset the box when the URL's term changes (e.g. back button, or leaving search).
          search={
            <SearchBar
              key={currentTerm}
              initialValue={currentTerm}
              onSearch={(term) => navigate(paths.search(term))}
            />
          }
          nav={<CategoryNav categories={categories.data ?? []} />}
          actions={<ThemeToggle isDark={theme.isDark} onToggle={() => theme.toggle()} />}
        />
      }
      footer={`© ${new Date().getFullYear()} ${APP_CONFIG.name}`}
    >
      <Outlet />
      <ScrollRestoration />
    </AppLayout>
  );
});
