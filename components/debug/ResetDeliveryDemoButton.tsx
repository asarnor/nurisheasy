'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { apiFetch } from '@/lib/utils/api';
import { isDebugClient } from '@/lib/utils/debug-client';
import { DEMO_DELIVERY_ORDER_ID } from '@/lib/delivery-tracking';

interface ResetDeliveryDemoButtonProps {
  onReset?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

export const ResetDeliveryDemoButton: React.FC<ResetDeliveryDemoButtonProps> = ({
  onReset,
  className = '',
  variant = 'secondary',
}) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!isDebugClient()) return null;

  const handleReset = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await apiFetch('/api/debug/reset-delivery-demo', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || 'Failed to reset delivery demo.');
        return;
      }

      setMessage(data.message || 'Delivery demo reset.');
      onReset?.();
    } catch (error) {
      console.error('Error resetting delivery demo:', error);
      setMessage('Failed to reset delivery demo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      <Button variant={variant} onClick={handleReset} disabled={loading}>
        {loading ? 'Resetting...' : 'Reset delivery demo'}
      </Button>
      <p className="mt-2 text-xs text-slate-500">
        Restores order #{DEMO_DELIVERY_ORDER_ID.slice(-4)} to READY so you can test delivery
        tracking again.
      </p>
      {message ? <p className="mt-1 text-xs font-medium text-emerald-700">{message}</p> : null}
    </div>
  );
};
