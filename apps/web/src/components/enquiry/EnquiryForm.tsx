import {
  type CreateEnquiryInput,
  CreateEnquirySchema,
  ENQUIRY_LIMITS,
  type ErrorDetail,
} from '@catalogue/contracts';
import { Alert, Button, Form, Input } from 'antd';
import { useEffect } from 'react';
import { zodRule } from '../../utils/zodRule';
import styles from './EnquiryForm.module.css';

export type EnquiryFormValues = Omit<CreateEnquiryInput, 'productId'>;

const FIELDS = CreateEnquirySchema.shape;
const FORM_FIELD_NAMES = new Set<string>(['name', 'email', 'phone', 'message']);

interface EnquiryFormProps {
  productTitle: string;
  submitting: boolean;
  onSubmit: (values: EnquiryFormValues) => void;
  /** Error from the last attempt, shown above the form. The form keeps what was typed. */
  errorMessage?: string;
  /** Field errors from the API (e.g. a 400), shown under the matching fields. */
  fieldErrors?: readonly ErrorDetail[];
}

export function EnquiryForm({
  productTitle,
  submitting,
  onSubmit,
  errorMessage,
  fieldErrors,
}: EnquiryFormProps) {
  const [form] = Form.useForm<EnquiryFormValues>();

  useEffect(() => {
    const known = (fieldErrors ?? []).filter((detail) => FORM_FIELD_NAMES.has(detail.path));
    if (known.length > 0) {
      form.setFields(
        known.map((detail) => ({ name: detail.path as keyof EnquiryFormValues, errors: [detail.message] })),
      );
    }
  }, [fieldErrors, form]);

  return (
    <Form
      form={form}
      layout="vertical"
      validateTrigger="onBlur"
      requiredMark="optional"
      initialValues={{ message: `I'm interested in ${productTitle}.` }}
      onFinish={onSubmit}
      disabled={submitting}
      // Turn off the browser's built-in validation: with an invalid type="email" value it blocks the
      // submit and shows its own tooltip, so our (shared-schema) messages for other fields never appear.
      noValidate
    >
      {errorMessage && <Alert type="error" showIcon message={errorMessage} className={styles.alert} />}

      <Form.Item label="Name" name="name" rules={[zodRule(FIELDS.name, { required: true })]}>
        <Input autoComplete="name" maxLength={ENQUIRY_LIMITS.nameMax} />
      </Form.Item>

      <Form.Item label="Email" name="email" rules={[zodRule(FIELDS.email, { required: true })]}>
        <Input type="email" autoComplete="email" maxLength={ENQUIRY_LIMITS.emailMax} />
      </Form.Item>

      <Form.Item label="Phone" name="phone" rules={[zodRule(FIELDS.phone, { required: false })]}>
        <Input type="tel" autoComplete="tel" maxLength={ENQUIRY_LIMITS.phoneMax} />
      </Form.Item>

      <Form.Item label="Message" name="message" rules={[zodRule(FIELDS.message, { required: true })]}>
        <Input.TextArea rows={4} showCount maxLength={ENQUIRY_LIMITS.messageMax} />
      </Form.Item>

      {/* Honeypot: invisible to people (off-screen, skipped by keyboard and screen readers); bots fill it in. */}
      <div aria-hidden className={styles.honeypot}>
        <Form.Item label="Website" name="website">
          <Input tabIndex={-1} autoComplete="off" />
        </Form.Item>
      </div>

      <Button type="primary" htmlType="submit" loading={submitting} block>
        Send enquiry
      </Button>
    </Form>
  );
}
