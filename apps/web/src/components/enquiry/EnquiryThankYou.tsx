import { Button, Result } from 'antd';

interface EnquiryThankYouProps {
  name: string;
  email: string;
  productTitle: string;
  onClose: () => void;
}

export function EnquiryThankYou({ name, email, productTitle, onClose }: EnquiryThankYouProps) {
  return (
    <Result
      status="success"
      title={`Thank you, ${name}!`}
      subTitle={`We've received your enquiry about ${productTitle}. Our sales team will be in touch at ${email}.`}
      extra={
        <Button type="primary" onClick={onClose}>
          Done
        </Button>
      }
    />
  );
}
