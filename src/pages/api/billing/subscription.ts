import type { NextApiRequest, NextApiResponse } from 'next';
import { isAdminAuthenticated } from '@/server/auth';
import { paypalConfigured } from '@/server/billing';
import { stripeConfigured } from '@/server/stripeBilling';
import { fetchSubscriptionStatus, listUpgradePlans } from '@/server/subscriptionBilling';
import { currentTenant, withTenantApi } from '@/server/tenant';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });
  if (!isAdminAuthenticated(req)) return res.status(401).json({ message: 'Non autenticato' });

  const tenant = currentTenant();
  if (tenant.slug === 'demo') {
    return res.status(200).json({
      plan: tenant.plan,
      billingProvider: tenant.billingProvider,
      hasSubscription: false,
      cancellable: false,
      cancelAtPeriodEnd: false,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      nextPaymentAmount: null,
      nextPaymentCurrency: 'EUR',
      invoices: [],
      canManageBilling: false,
      providerStatus: '',
      message: 'Questo è il menu demo della piattaforma, senza abbonamento.',
      stripeOk: stripeConfigured(),
      paypalOk: paypalConfigured(),
      upgradePlans: [],
    });
  }

  const status = await fetchSubscriptionStatus(tenant);
  return res.status(200).json({
    ...status,
    stripeOk: stripeConfigured(),
    paypalOk: paypalConfigured(),
    upgradePlans: listUpgradePlans(tenant),
  });
}

export default withTenantApi(handler);
