'use client';

import React from 'react';
import SubscriptionPage from '@/components/SubscriptionPage';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

export default function PremiumRoute() {
  const handleSuccess = () => {
    // Redirect user back to home or refresh layout state
    window.location.href = `${BASE_PATH}/` || '/';
  };

  return <SubscriptionPage onPurchaseSuccess={handleSuccess} />;
}
