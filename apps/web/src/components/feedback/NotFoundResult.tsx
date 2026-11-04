import { Button, Result } from 'antd';
import { useNavigate } from 'react-router';
import { paths } from '../../config/paths';

interface NotFoundResultProps {
  title?: string;
  subTitle?: string;
}

export function NotFoundResult({
  title = 'Page not found',
  subTitle = "We couldn't find what you were looking for.",
}: NotFoundResultProps) {
  const navigate = useNavigate();
  return (
    <Result
      status="404"
      title={title}
      subTitle={subTitle}
      extra={
        <Button type="primary" onClick={() => navigate(paths.home())}>
          Back to home
        </Button>
      }
    />
  );
}
