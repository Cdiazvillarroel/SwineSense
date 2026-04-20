/**
 * Supabase-generated types.
 *
 * This file is auto-generated. Do not edit manually.
 * Regenerate with:
 *
 *   npm run gen:types
 *
 * Until the Supabase project is provisioned, we export a minimal placeholder
 * so the rest of the codebase compiles.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: Record<string, { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
