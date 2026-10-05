import React from 'react';
import { AiKeysCard } from './AiKeysCard';
import { AiUsageCard } from './AiUsageCard';
import { WhatsAppTab } from './WhatsAppTab';
import { StripeCard } from './StripeCard';
import { PaypalCard } from './PaypalCard';
import { GoogleCard } from './GoogleCard';
import { Tripo3dCard } from './Tripo3dCard';

export const PlatformTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Chiavi e numeri della piattaforma. I clienti non vedono questa pagina: Stripe, PayPal, Google, AI e WhatsApp restano tuoi.
      </p>
      <StripeCard />
      <PaypalCard />
      <GoogleCard />
      <Tripo3dCard />
      <AiUsageCard />
      <AiKeysCard />
      <WhatsAppTab />
    </div>
  );
};
