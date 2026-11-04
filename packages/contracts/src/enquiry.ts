import { z } from 'zod';
import { ProductIdSchema } from './product';

export const ENQUIRY_LIMITS = {
  nameMax: 100,
  emailMax: 254,
  phoneMax: 30,
  messageMax: 2000,
  honeypotMax: 200,
} as const;

// Digits, spaces, +, -, ( ) — permissive on purpose; we only need something a person can call.
const PHONE_PATTERN = /^[+()\d\s-]{6,30}$/;

/**
 * Shared by the enquiry form (client-side validation) and the API (authoritative validation).
 * Optional fields accept '' from form inputs and normalise it to undefined.
 */
export const CreateEnquirySchema = z.object({
  productId: ProductIdSchema,
  name: z
    .string({ error: 'Name is required' })
    .trim()
    .min(1, 'Name is required')
    .max(ENQUIRY_LIMITS.nameMax, `Name must be ${ENQUIRY_LIMITS.nameMax} characters or fewer`),
  email: z
    .string({ error: 'Email is required' })
    .trim()
    .min(1, 'Email is required')
    .max(ENQUIRY_LIMITS.emailMax, `Email must be ${ENQUIRY_LIMITS.emailMax} characters or fewer`)
    .pipe(z.email('Enter a valid email address')),
  phone: z
    .string()
    .trim()
    .refine((value) => value === '' || PHONE_PATTERN.test(value), 'Enter a valid phone number')
    .optional()
    .transform((value) => value || undefined),
  message: z
    .string({ error: 'Message is required' })
    .trim()
    .min(1, 'Message is required')
    .max(ENQUIRY_LIMITS.messageMax, `Message must be ${ENQUIRY_LIMITS.messageMax} characters or fewer`),
  /** Honeypot: hidden in the UI, so any value means a bot. Accepted silently, never stored. */
  website: z.string().max(ENQUIRY_LIMITS.honeypotMax).optional(),
});
/** What the client sends (form values). */
export type CreateEnquiryInput = z.input<typeof CreateEnquirySchema>;
/** What the API works with after validation/normalisation. */
export type CreateEnquiry = z.output<typeof CreateEnquirySchema>;

export const EnquiryCreatedSchema = z.object({
  id: z.string(),
  status: z.literal('received'),
});
export type EnquiryCreated = z.infer<typeof EnquiryCreatedSchema>;
