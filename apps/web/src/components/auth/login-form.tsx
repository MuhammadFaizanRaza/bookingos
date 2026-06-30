'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Link, useRouter } from '@/i18n/routing';
import { api, ApiError, DEMO_TENANT_SLUG } from '@/lib/api';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/sonner';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  slug: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const { setSession } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { slug: DEMO_TENANT_SLUG },
  });

  async function onSubmit(values: FormValues) {
    try {
      const res = await api.auth.login({
        email: values.email,
        password: values.password,
        slug: values.slug || DEMO_TENANT_SLUG,
      });
      setSession(res);
      toast.success(t('loginTitle'));
      router.push('/dashboard');
    } catch (err) {
      const message =
        err instanceof ApiError && err.status === 401
          ? t('errorCredentials')
          : t('errorGeneric');
      toast.error(message);
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">{t('loginTitle')}</h1>
      <p className="mt-2 text-muted-foreground">{t('loginSubtitle')}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="slug">{t('slug')}</Label>
          <Input
            id="slug"
            placeholder="lumiere"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            {...register('slug')}
          />
          <p className="text-xs text-muted-foreground">{t('slugHint')}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{t('email')}</Label>
          <Input
            id="email"
            type="email"
            placeholder="owner@lumiere.demo"
            autoComplete="email"
            {...register('email')}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{t('email')} *</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t('password')}</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            {...register('password')}
          />
        </div>

        <Button
          type="submit"
          variant="gradient"
          size="lg"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('loginButton')}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t('noAccount')}{' '}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          {t('signupLink')}
        </Link>
      </p>
    </div>
  );
}
