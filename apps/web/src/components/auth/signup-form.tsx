'use client';

import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Link, useRouter } from '@/i18n/routing';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/sonner';

const schema = z.object({
  salonName: z.string().min(2),
  slug: z
    .string()
    .regex(/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/, 'invalid slug'),
  ownerName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

type FormValues = z.infer<typeof schema>;

export function SignupForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const { setSession } = useAuth();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  function slugify(v: string) {
    return v
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
  }

  async function onSubmit(values: FormValues) {
    try {
      const res = await api.auth.register(values);
      setSession(res);
      toast.success(t('signupTitle'));
      router.push('/dashboard');
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : t('errorGeneric');
      toast.error(message);
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">{t('signupTitle')}</h1>
      <p className="mt-2 text-muted-foreground">{t('signupSubtitle')}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="salonName">{t('salonName')}</Label>
          <Input
            id="salonName"
            placeholder="Lumière Beauty Lounge"
            {...register('salonName', {
              onChange: (e) =>
                setValue('slug', slugify(e.target.value), {
                  shouldValidate: true,
                }),
            })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">{t('slug')}</Label>
          <div className="flex items-center rounded-xl border border-input bg-background pe-3 focus-within:ring-2 focus-within:ring-ring">
            <Input
              id="slug"
              className="border-0 shadow-none focus-visible:ring-0"
              placeholder="lumiere"
              {...register('slug')}
            />
            <span className="shrink-0 text-sm text-muted-foreground">
              {t('slugHint')}
            </span>
          </div>
          {errors.slug && (
            <p className="text-xs text-destructive">{t('slug')} *</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="ownerName">{t('ownerName')}</Label>
          <Input id="ownerName" placeholder="Sofia Marchetti" {...register('ownerName')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{t('email')}</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@salon.com"
            {...register('email')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{t('password')}</Label>
          <Input
            id="password"
            type="password"
            placeholder="At least 8 characters"
            {...register('password')}
          />
          {errors.password && (
            <p className="text-xs text-destructive">{t('password')} *</p>
          )}
        </div>

        <Button
          type="submit"
          variant="gradient"
          size="lg"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('signupButton')}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t('haveAccount')}{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t('loginLink')}
        </Link>
      </p>
    </div>
  );
}
