import { Star } from 'lucide-react';
import type { Review } from '@/lib/types';

interface SalonReviewsProps {
  reviews: Review[];
}

function StarRow({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const sz = size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${sz} ${i < rating ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted'}`}
        />
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="flex flex-col rounded-2xl border bg-card p-5 shadow-sm">
      <StarRow rating={review.rating} />
      {review.comment && (
        <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
          &ldquo;{review.comment}&rdquo;
        </p>
      )}
      <div className="mt-4 border-t pt-4">
        <p className="font-medium text-sm">{review.clientName}</p>
        <p className="text-xs text-muted-foreground">
          {review.serviceName && <span>{review.serviceName}</span>}
          {review.staffName && review.serviceName && ' · '}
          {review.staffName && <span>{review.staffName}</span>}
        </p>
      </div>
    </div>
  );
}

export function SalonReviews({ reviews }: SalonReviewsProps) {
  if (!reviews.length) return null;

  const avg =
    reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  const fiveStarCount = reviews.filter((r) => r.rating === 5).length;

  return (
    <section id="reviews" className="py-24">
      <div className="container">
        <div className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Client Love
          </p>
          <h2 className="mt-2 font-display text-4xl font-bold">What Clients Say</h2>

          {/* Rating summary */}
          <div className="mt-6 inline-flex items-center gap-4 rounded-2xl border bg-card px-8 py-4 shadow-sm">
            <div>
              <p className="font-display text-5xl font-bold">{avg.toFixed(1)}</p>
              <StarRow rating={Math.round(avg)} size="lg" />
              <p className="mt-1 text-xs text-muted-foreground">
                {reviews.length} reviews
              </p>
            </div>
            <div className="h-12 w-px bg-border" />
            <div className="text-start">
              <p className="font-semibold">{fiveStarCount} × 5-star reviews</p>
              <p className="text-sm text-muted-foreground">
                {Math.round((fiveStarCount / reviews.length) * 100)}% of clients give 5 stars
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      </div>
    </section>
  );
}
