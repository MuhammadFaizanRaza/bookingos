'use client';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { StaffMember } from '@/lib/types';
import { initials } from '@/lib/utils';

interface SalonTeamProps {
  staff: StaffMember[];
  onBook: (staffId: string) => void;
}

function StaffCard({
  member,
  onBook,
}: {
  member: StaffMember;
  onBook: () => void;
}) {
  return (
    <div className="group flex flex-col items-center rounded-2xl border bg-card p-6 text-center shadow-sm transition-all hover:shadow-md">
      <div className="relative">
        <Avatar className="h-20 w-20 ring-4 ring-background shadow-md">
          <AvatarImage src={member.user.avatarUrl ?? undefined} />
          <AvatarFallback
            className="text-lg font-semibold text-white"
            style={{ background: member.color }}
          >
            {initials(member.user.name)}
          </AvatarFallback>
        </Avatar>
        {/* Color dot */}
        <span
          className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card"
          style={{ background: member.color }}
        />
      </div>

      <h3 className="mt-4 font-display text-lg font-semibold">{member.user.name}</h3>
      {member.title && (
        <p className="text-sm font-medium text-primary">{member.title}</p>
      )}
      {member.bio && (
        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{member.bio}</p>
      )}

      <Button
        size="sm"
        variant="outline"
        className="mt-4 w-full opacity-0 transition-opacity group-hover:opacity-100"
        onClick={onBook}
      >
        Book with {member.user.name.split(' ')[0]}
      </Button>
    </div>
  );
}

export function SalonTeam({ staff, onBook }: SalonTeamProps) {
  const bookableStaff = staff.filter((s) => s.isBookable);
  if (!bookableStaff.length) return null;

  return (
    <section id="team" className="py-24">
      <div className="container">
        <div className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            The Experts
          </p>
          <h2 className="mt-2 font-display text-4xl font-bold">Meet Our Team</h2>
          <p className="mt-3 text-muted-foreground">
            Skilled specialists dedicated to your beauty
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {bookableStaff.map((member) => (
            <StaffCard
              key={member.id}
              member={member}
              onBook={() => onBook(member.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
