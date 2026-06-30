'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { BookingFlow } from './booking-flow';

interface BookingDrawerProps {
  open: boolean;
  onClose: () => void;
  preSelectedServiceIds?: string[];
  preSelectedStaffId?: string;
  tenantSlug?: string;
}

export function BookingDrawer({
  open,
  onClose,
  preSelectedServiceIds,
  preSelectedStaffId,
  tenantSlug,
}: BookingDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        hideCloseButton
      >
        {/* Drawer header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4">
          <span className="font-display font-semibold">Book Appointment</span>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Scrollable booking flow */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {open && (
            <BookingFlow
              embedded
              onClose={onClose}
              preSelectedServiceIds={preSelectedServiceIds}
              preSelectedStaffId={preSelectedStaffId}
              tenantSlug={tenantSlug}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
