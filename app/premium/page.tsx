'use client';

import React from 'react';
import SubscriptionPage from '@/components/SubscriptionPage';

export default function PremiumRoute() {
  const handleSuccess = () => {
    // Redirect user back to home or refresh layout state
    window.location.href = '/';
  };

  return <SubscriptionPage onPurchaseSuccess={handleSuccess} />;
}
