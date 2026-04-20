'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';

/**
 * Login page.
 *
 * Branded per Brand Manual: dark centered card, gradient CTA, logo on top.
 * Supports ?next=/target redirect after successful login.
 *
 * The form is wrapped in a Suspense boundary because useSearchParams()
 * requires it at the route level for Next.js App Router prerendering.
 */
export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <Logo size="lg" showTagline />
      </div>

      <Card accent>
        <CardHeader>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Sign in to access your farm operations.</CardDescription>
        </CardHeader>

        <CardContent>
          <Suspense fallback={<FormSkeleton />}>
            <LoginForm />
          </Suspense>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-ink-muted">
        © 2026 SwineSense · AI Farm Operations Assistant
      </p>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/overview';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="label-badge">Email</label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1.5 block w-full rounded-btn border border-surface-border bg-surface-elevated px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand-orange focus:ring-0"
          placeholder="manager@farm.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="label-badge">Password</label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1.5 block w-full rounded-btn border border-surface-border bg-surface-elevated px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand-orange focus:ring-0"
          placeholder="••••••••"
        />
      </div>

      {error && (
        <p className="text-sm text-status-critical" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-16 animate-pulse rounded-btn bg-surface-border/40" />
      <div className="h-16 animate-pulse rounded-btn bg-surface-border/40" />
      <div className="h-12 animate-pulse rounded-btn bg-surface-border/40" />
    </div>
  );
}
