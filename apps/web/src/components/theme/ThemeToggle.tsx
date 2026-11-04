import { MoonOutlined, SunOutlined } from '@ant-design/icons';
import { Switch, Tooltip } from 'antd';

interface ThemeToggleProps {
  isDark: boolean;
  onToggle: () => void;
}

export function ThemeToggle({ isDark, onToggle }: ThemeToggleProps) {
  return (
    <Tooltip title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
      <Switch
        aria-label="Dark mode"
        checked={isDark}
        onChange={onToggle}
        checkedChildren={<MoonOutlined aria-hidden />}
        unCheckedChildren={<SunOutlined aria-hidden />}
      />
    </Tooltip>
  );
}
