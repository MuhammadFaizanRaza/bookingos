'use client';

import { useTranslations } from 'next-intl';
import { formatCurrency } from '@/lib/utils';

export interface ReceiptLine {
  name: string;
  qty: number;
  unitPrice: number;
}

export interface ReceiptData {
  salonName: string;
  saleNumber?: number;
  customerName: string;
  lines: ReceiptLine[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  tax: number;
  total: number;
  method: string;
  currency: string;
  locale: string;
  date: Date;
}

export function Receipt({ data }: { data: ReceiptData }) {
  const t = useTranslations('dashboard.pos.receipt');
  const tp = useTranslations('dashboard.pos');
  const { currency, locale } = data;

  return (
    <div className="print-receipt hidden bg-white text-black print:block">
      <div className="mx-auto max-w-sm font-mono text-sm">
        <div className="text-center">
          <p className="text-lg font-bold">{data.salonName}</p>
          <p className="mt-1 text-xs">{t('title')}</p>
        </div>

        <div className="mt-4 border-t border-dashed border-black/40 pt-2 text-xs">
          {data.saleNumber != null && (
            <div className="flex justify-between">
              <span>#</span>
              <span>{data.saleNumber}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>{t('date')}</span>
            <span>{data.date.toLocaleString(locale)}</span>
          </div>
          <div className="flex justify-between">
            <span>{tp('customer')}</span>
            <span>{data.customerName}</span>
          </div>
        </div>

        <table className="mt-3 w-full text-xs">
          <thead>
            <tr className="border-b border-dashed border-black/40 text-left">
              <th className="py-1">{t('item')}</th>
              <th className="py-1 text-center">{t('qty')}</th>
              <th className="py-1 text-right">{t('price')}</th>
            </tr>
          </thead>
          <tbody>
            {data.lines.map((l, i) => (
              <tr key={i}>
                <td className="py-1">{l.name}</td>
                <td className="py-1 text-center">{l.qty}</td>
                <td className="py-1 text-right">
                  {formatCurrency(l.unitPrice * l.qty, currency, locale)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-2 space-y-1 border-t border-dashed border-black/40 pt-2 text-xs">
          <div className="flex justify-between">
            <span>{tp('subtotal')}</span>
            <span>{formatCurrency(data.subtotal, currency, locale)}</span>
          </div>
          {data.discountPercent > 0 && (
            <div className="flex justify-between">
              <span>
                {tp('discount')} {data.discountPercent}%
              </span>
              <span>
                -{formatCurrency(data.discountAmount, currency, locale)}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span>{tp('tax')}</span>
            <span>{formatCurrency(data.tax, currency, locale)}</span>
          </div>
          <div className="flex justify-between border-t border-black/40 pt-1 text-sm font-bold">
            <span>{tp('total')}</span>
            <span>{formatCurrency(data.total, currency, locale)}</span>
          </div>
          <div className="flex justify-between">
            <span>{tp('method')}</span>
            <span className="uppercase">{data.method}</span>
          </div>
        </div>

        <p className="mt-4 text-center text-xs">{t('thankYou')}</p>
      </div>
    </div>
  );
}
