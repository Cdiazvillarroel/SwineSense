import { z } from 'zod';

/**
 * Zod schema for the Claude AI response.
 *
 * Mirrors the structured output contract defined in claude_alert_prompt.md.
 * Used in two places:
 *   1. Pipedream workflow (JS equivalent) — validates before writeback.
 *   2. /api/webhooks/pipedream-callback — validates the incoming payload
 *      before trusting it to update the DB.
 *
 * If Claude ever drifts (e.g. returns markdown or an extra field), this
 * schema throws and the alert is marked ai_response_status = 'failed'.
 */

export const ClaudeAlertInsightSchema = z.object({
  ai_insight: z.string().min(10).max(1200),
  likely_cause: z.string().min(5).max(500),
  recommended_action: z.string().min(5).max(500),
  priority_level: z.enum(['Routine', 'Attention', 'Urgent', 'Immediate']),
  short_message: z.string().min(10).max(200),
  requires_vet_escalation: z.boolean(),
  confidence: z.enum(['low', 'medium', 'high']),
});

export type ClaudeAlertInsight = z.infer<typeof ClaudeAlertInsightSchema>;

export const PipedreamCallbackSchema = z.object({
  alert_id: z.string().uuid(),
  model: z.string().min(1),
  insight: ClaudeAlertInsightSchema,
  metadata: z
    .object({
      input_tokens: z.number().int().nonnegative().optional(),
      output_tokens: z.number().int().nonnegative().optional(),
      latency_ms: z.number().int().nonnegative().optional(),
    })
    .optional(),
});

export type PipedreamCallback = z.infer<typeof PipedreamCallbackSchema>;
