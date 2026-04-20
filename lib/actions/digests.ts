'use server';

/**
 * SwineSense — Server Actions for daily digest action items.
 *
 * Covers:
 *   - updateActionStatus   (open / in_progress / done / skipped)
 *   - assignAction         (to a user id, or null to unassign)
 *   - updateActionNotes    (free-text notes, last-write-wins)
 *   - addTextEvidence      (written statement as evidence)
 *   - uploadFileEvidence   (FormData with a File → Supabase Storage)
 *   - deleteEvidence       (also removes Storage object)
 *   - listOrgMembers       (for the Assignee picker)
 *   - signEvidenceUrl      (creates short-lived signed URL for private bucket)
 */

import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import type { Database, TableUpdate } from '@/lib/database';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// ─────────────────────────── Schemas ───────────────────────────

const UuidSchema = z.string().uuid();
const StatusSchema = z.enum(['open', 'in_progress', 'done', 'skipped']);
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
  'text/plain',
  'text/csv',
]);

export type ActionResult<T = null> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; error: string };

// ─────────────────────────── Supabase admin helper ──────────────

function getServiceClient() {
  return createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

async function requireUser() {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return { user, sb };
}

function revalidateDigestViews() {
  revalidatePath('/ai-insights');
  revalidatePath('/overview');
}

// ─────────────────────────── Action item mutations ──────────────

export async function updateActionStatus(
  actionIdRaw: string,
  statusRaw: string
): Promise<ActionResult> {
  try {
    const actionId = UuidSchema.parse(actionIdRaw);
    const status = StatusSchema.parse(statusRaw);
    const { user, sb } = await requireUser();

    const patch: TableUpdate<'digest_action_items'> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === 'done') {
      patch.completed_at = new Date().toISOString();
      patch.completed_by = user.id;
    } else {
      patch.completed_at = null;
      patch.completed_by = null;
    }

    const { error } = await sb
      .from('digest_action_items')
      .update(patch)
      .eq('id', actionId);
    if (error) return { ok: false, error: error.message };

    revalidateDigestViews();
    return { ok: true, message: `Marked as ${status.replace('_', ' ')}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error' };
  }
}

export async function assignAction(
  actionIdRaw: string,
  assigneeIdRaw: string | null
): Promise<ActionResult> {
  try {
    const actionId = UuidSchema.parse(actionIdRaw);
    const assignee = assigneeIdRaw === null ? null : UuidSchema.parse(assigneeIdRaw);
    const { sb } = await requireUser();

    const { error } = await sb
      .from('digest_action_items')
      .update({
        assigned_to: assignee,
        updated_at: new Date().toISOString(),
      })
      .eq('id', actionId);
    if (error) return { ok: false, error: error.message };

    revalidateDigestViews();
    return { ok: true, message: assignee ? 'Assigned' : 'Unassigned' };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error' };
  }
}

export async function updateActionNotes(
  actionIdRaw: string,
  notesRaw: string
): Promise<ActionResult> {
  try {
    const actionId = UuidSchema.parse(actionIdRaw);
    const notes = z.string().max(5000).parse(notesRaw);
    const { sb } = await requireUser();

    const { error } = await sb
      .from('digest_action_items')
      .update({ notes: notes.length === 0 ? null : notes })
      .eq('id', actionId);
    if (error) return { ok: false, error: error.message };

    revalidateDigestViews();
    return { ok: true, message: 'Notes saved' };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error' };
  }
}

// ─────────────────────────── Evidence ────────────────────────────

export async function addTextEvidence(
  actionIdRaw: string,
  textRaw: string,
  captionRaw?: string
): Promise<ActionResult> {
  try {
    const actionId = UuidSchema.parse(actionIdRaw);
    const text = z.string().min(1).max(5000).parse(textRaw);
    const caption = captionRaw ? z.string().max(200).parse(captionRaw) : null;
    const { user, sb } = await requireUser();

    // Resolve site_id for RLS-compliant insert
    const { data: action, error: aErr } = await sb
      .from('digest_action_items')
      .select('site_id')
      .eq('id', actionId)
      .single();
    if (aErr || !action) return { ok: false, error: 'Action item not found' };

    const { error } = await sb.from('digest_action_evidence').insert({
      action_item_id: actionId,
      site_id: action.site_id,
      kind: 'text',
      text_content: text,
      caption,
      uploaded_by: user.id,
    });
    if (error) return { ok: false, error: error.message };

    revalidateDigestViews();
    return { ok: true, message: 'Note attached' };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error' };
  }
}

export async function uploadFileEvidence(formData: FormData): Promise<ActionResult> {
  try {
    const actionId = UuidSchema.parse(formData.get('actionId'));
    const caption = ((formData.get('caption') as string | null) ?? '').trim() || null;
    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: 'No file provided' };
    }
    if (file.size > MAX_FILE_BYTES) {
      return { ok: false, error: `File too large (max ${MAX_FILE_BYTES / 1024 / 1024} MB)` };
    }
    const contentType = file.type || 'application/octet-stream';
    if (!ALLOWED_MIME.has(contentType)) {
      return {
        ok: false,
        error: `Unsupported file type: ${contentType}. Allowed: JPG, PNG, WEBP, HEIC, PDF, TXT, CSV.`,
      };
    }

    const { user, sb } = await requireUser();

    const { data: action, error: aErr } = await sb
      .from('digest_action_items')
      .select('site_id')
      .eq('id', actionId)
      .single();
    if (aErr || !action) return { ok: false, error: 'Action item not found' };

    // Path convention must match the storage RLS policy:
    // digest-evidence/<site_id>/<action_id>/<uuid>.<ext>
    const ext = extensionFor(contentType, file.name);
    const objectName = `${crypto.randomUUID()}${ext}`;
    const storagePath = `${action.site_id}/${actionId}/${objectName}`;

    const bytes = Buffer.from(await file.arrayBuffer());
    const admin = getServiceClient();

    const { error: upErr } = await admin.storage
      .from('digest-evidence')
      .upload(storagePath, bytes, {
        contentType,
        upsert: false,
      });
    if (upErr) return { ok: false, error: `Upload failed: ${upErr.message}` };

    const kind = contentType.startsWith('image/') ? 'photo' : 'document';

    const { error: dbErr } = await sb.from('digest_action_evidence').insert({
      action_item_id: actionId,
      site_id: action.site_id,
      kind,
      storage_path: storagePath,
      caption,
      size_bytes: file.size,
      content_type: contentType,
      uploaded_by: user.id,
    });

    if (dbErr) {
      // Best-effort cleanup if DB insert fails after upload
      await admin.storage.from('digest-evidence').remove([storagePath]);
      return { ok: false, error: dbErr.message };
    }

    revalidateDigestViews();
    return { ok: true, message: 'Evidence uploaded' };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error' };
  }
}

export async function deleteEvidence(evidenceIdRaw: string): Promise<ActionResult> {
  try {
    const evidenceId = UuidSchema.parse(evidenceIdRaw);
    const { sb } = await requireUser();

    const { data: ev, error: fetchErr } = await sb
      .from('digest_action_evidence')
      .select('id, storage_path')
      .eq('id', evidenceId)
      .single();
    if (fetchErr || !ev) return { ok: false, error: 'Evidence not found' };

    // Delete DB row first — if this fails, we didn't orphan a file
    const { error: delErr } = await sb
      .from('digest_action_evidence')
      .delete()
      .eq('id', evidenceId);
    if (delErr) return { ok: false, error: delErr.message };

    if (ev.storage_path) {
      const admin = getServiceClient();
      // Best-effort: storage cleanup shouldn't block success
      await admin.storage.from('digest-evidence').remove([ev.storage_path]);
    }

    revalidateDigestViews();
    return { ok: true, message: 'Evidence deleted' };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error' };
  }
}

// ─────────────────────────── Read helpers ────────────────────────

export async function listOrgMembers(): Promise<
  { user_id: string; email: string | null; role: string }[]
> {
  const sb = createClient();
  const { data, error } = await sb.rpc('auth_user_org_members');
  if (error) {
    console.error('listOrgMembers:', error.message);
    return [];
  }
  return (data ?? []) as { user_id: string; email: string | null; role: string }[];
}

/**
 * Creates a short-lived signed URL (1 hour) for an evidence file in the
 * private digest-evidence bucket. Called from the server component at render
 * time for each evidence thumbnail.
 */
export async function signEvidenceUrl(
  storagePathRaw: string
): Promise<string | null> {
  try {
    const storagePath = z.string().min(1).parse(storagePathRaw);
    const admin = getServiceClient();
    const { data, error } = await admin.storage
      .from('digest-evidence')
      .createSignedUrl(storagePath, 60 * 60);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

// ─────────────────────────── utilities ────────────────────────

function extensionFor(contentType: string, filename: string): string {
  const fromName = filename.match(/\.[a-zA-Z0-9]+$/)?.[0];
  if (fromName) return fromName.toLowerCase();
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/heic': '.heic',
    'image/heif': '.heif',
    'application/pdf': '.pdf',
    'text/plain': '.txt',
    'text/csv': '.csv',
  };
  return map[contentType] ?? '';
}
