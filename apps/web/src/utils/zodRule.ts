import type { z } from 'zod';

/**
 * Turns a shared contract field schema into an Ant Design Form rule, so the form shows exactly the
 * messages the API would return. One definition of "valid", used on both sides.
 *
 * `required` must match the schema: Ant Design skips custom validators for fields that were never
 * filled in unless the rule is marked required, so an untouched required field would otherwise pass.
 * It also drives the form's required/optional label marks.
 */
export function zodRule(schema: z.ZodType, { required }: { required: boolean }) {
  return {
    required,
    validator: async (_rule: unknown, value: unknown) => {
      const result = schema.safeParse(value ?? '');
      if (!result.success) throw new Error(result.error.issues[0]?.message ?? 'Invalid value');
    },
  };
}
