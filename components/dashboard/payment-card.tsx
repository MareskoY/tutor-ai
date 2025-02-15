// components/dashboard/payment-card.tsx
'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface PaymentCardProps {
  title: string;
  description: string;
  price: string;
  period: string;
  features: string[];
  activeLabel?: string;
  isActive?: boolean;
  isLoading?: boolean;
  actionNode?: ReactNode;
}

export default function PaymentCard({
  title,
  description,
  price,
  period,
  features,
  activeLabel,
  isActive,
  isLoading,
  actionNode,
}: PaymentCardProps) {
  return (
    <div className="relative p-8 border border-gray-200 rounded-2xl shadow-sm flex flex-col">
      {/* Верхний бейдж (не показываем во время загрузки) */}
      {!isLoading && activeLabel && (
        <p className="absolute top-0 py-1.5 px-4 bg-emerald-500 text-white rounded-full text-xs font-semibold uppercase tracking-wide transform -translate-y-1/2 ">
          {activeLabel}
        </p>
      )}
      <div className="flex-1">
        <h3 className="text-xl font-semibold">{title}</h3>
        <p className="mt-4 flex items-baseline">
          <span className="text-5xl font-extrabold tracking-tight">
            {price}
          </span>
          <span className="ml-1 text-xl font-semibold">{period}</span>
        </p>
        <p className="mt-6">{description}</p>
        <ul className="mt-6 space-y-6">
          {features.map((item, index) => (
            <li key={item} className="flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="flex-shrink-0 w-6 h-6 text-emerald-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="ml-3">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Блок с кнопками и загрузкой */}
      <div className="mt-8">
        {isLoading && actionNode ? (
          <Button className={'w-full'} disabled={true}>
            Loading...
          </Button>
        ) : (
          actionNode
        )}
      </div>
    </div>
  );
}
