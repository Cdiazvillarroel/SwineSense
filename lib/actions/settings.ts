'use server';

/**
 * SwineSense — Server Actions for the /settings page.
 *
 * - createNotificationChannel(formData)
 * - updateNotificationChannel(id, patch)
 * - deleteNotificationChannel(id)
 * - toggleAlertRule(ruleId, active)
 */

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const UuidSchema = z.string().uuid();
const ChannelSchema = z.enum(['telegram', 'whatsapp', 'email', 'sms']);
const SeveritySchema = z.enum(['Low', 'Medium', 'High', 'Critical']);

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

async function requireUser() {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return { user, sb };
}

function revalidateSettings() {
  revalidatePath('/settings');
}

// ─────────────────────────── Notification channels ───────────────────────────

export async function createNotificationChannel(formData: FormData): Promise<ActionResult> {
  try {
    const siteId = UuidSchema.parse(formData.get('site_id'));
    const channel = ChannelSchema.parse(formData.get('channel'));
    const recipientRaw = String(formData.get('recipient') ?? '').trim();
    const recipient = z.string().min(1).max(200).parse(recipientRaw);
    const minSeverity = SeveritySchema.parse(formData.get('min_severity') ?? 'High');
    const active = formData.get('active') === 'on' || formData.get('active') === 'true';

    // Per-channel format validation for friendlier errors
    if (channel === 'email') {
      if (!/^\S+@\S+\.\S+$/.test(recipient)) {
        return { ok: false, error: 'Email format looks invalid.' };
      }
    } else if (channel === 'sms' || channel === 'whatsapp') {
      if (!/^\+?[0-9 ()-]{6,20}$/.test(recipient)) {
        return {
          ok: false,
          error: 'Phone number should include country code, e.g. +61 400 123 456.',
        };
      }
    }
    // telegram: chat_id can be numeric or an @channel — accept anything non-empty

    const { sb } = await requireUser();
    const { error } = await sb.from('site_notification_channels').insert({
      site_id: siteId,
      channel,
      recipient,
      min_severity: minSeverity,
      active,
    });
    if (error) return { ok: false, error: error.message };

    revalidateSettings();
    return { ok: true, message: 'Channel created' };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error' };
  }
}

const UpdateChannelSchema = z.object({
  recipient: z.string().min(1).max(200).optional(),
  min_severity: SeveritySchema.optional(),
  active: z.boolean().optional(),
});

export async function updateNotificationChannel(
  channelIdRaw: string,
  patchRaw: unknown
): Promise<ActionResult> {
  try {
    const channelId = UuidSchema.parse(channelIdRaw);
    const patch = UpdateChannelSchema.parse(patchRaw);
    if (Object.keys(patch).length === 0) {
      return { ok: false, error: 'No fields to update' };
    }

    const { sb } = await requireUser();
    const { error } = await sb
      .from('site_notification_channels')
      .update(patch)
      .eq('id', channelId);

    if (error) return { ok: false, error: error.message };
    revalidateSettings();
    return { ok: true, message: 'Updated' };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error' };
  }
}

export async function deleteNotificationChannel(
  channelIdRaw: string
): Promise<ActionResult> {
  try {
    const channelId = UuidSchema.parse(channelIdRaw);
    const { sb } = await requireUser();
    const { error } = await sb
      .from('site_notification_channels')
      .delete()
      .eq('id', channelId);
    if (error) return { ok: false, error: error.message };
    revalidateSettings();
    return { ok: true, message: 'Deleted' };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error' };
  }
}

// ─────────────────────────── Alert rules ───────────────────────────

export async function toggleAlertRule(
  ruleIdRaw: string,
  activeRaw: boolean
): Promise<ActionResult> {
  try {
    const ruleId = UuidSchema.parse(ruleIdRaw);
    const active = z.boolean().parse(activeRaw);
    const { sb } = await requireUser();

    const { error } = await sb
      .from('alert_rules')
      .update({ active })
      .eq('id', ruleId);

    if (error) return { ok: false, error: error.message };
    revalidateSettings();
    return { ok: true, message: active ? 'Rule enabled' : 'Rule disabled' };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error' };
  }
}
