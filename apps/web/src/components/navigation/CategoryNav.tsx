import type { Category } from '@catalogue/contracts';
import { NavLink } from 'react-router';
import { paths } from '../../config/paths';
import styles from './CategoryNav.module.css';

interface CategoryNavProps {
  categories: readonly Category[];
}

/** Category links. The active category is highlighted from the URL (NavLink). Scrolls sideways on small screens. */
export function CategoryNav({ categories }: CategoryNavProps) {
  if (categories.length === 0) return null;

  return (
    <nav aria-label="Categories" className={styles.nav}>
      <ul className={styles.list}>
        {categories.map((category) => (
          <li key={category.slug}>
            <NavLink
              to={paths.category(category.slug)}
              className={({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link)}
            >
              {category.name}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
