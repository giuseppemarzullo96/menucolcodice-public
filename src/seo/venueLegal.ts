import { loadRestaurantData } from '@/utils/dataLoader';
import { PLAN_LIMITS, type TenantRecord } from '@/server/tenant';
import { planName } from '@/utils/plans';

export type VenueLegal = {
  name: string;
  slug: string;
  menuHost: string;
  menuUrl: string;
  email: string;
  phone: string;
  addressLine: string;
  planName: string;
  whatsappManage: boolean;
  socialWhatsapp: boolean;
  delivery: boolean;
};

function addressLine(address: any) {
  if (!address || typeof address !== 'object') return '';
  const cityLine = [address.postalCode, address.city].filter(Boolean).join(' ').trim();
  const parts = [address.street, cityLine, address.state].filter(Boolean);
  return parts.join(', ');
}

export function buildVenueLegal(tenant: TenantRecord): VenueLegal {
  const { restaurantInfo, restaurantContacts, restaurantSocial } = loadRestaurantData();
  const name = String(restaurantInfo?.name || tenant.name || tenant.slug).trim();
  const email = String(restaurantContacts?.email || tenant.email || '').trim();
  const phone = String(restaurantContacts?.phone || '').trim();
  const social: any = restaurantSocial || {};
  const slug = tenant.slug;
  return {
    name,
    slug,
    menuHost: `${slug}.menucolcodice.it`,
    menuUrl: `https://${slug}.menucolcodice.it`,
    email,
    phone,
    addressLine: addressLine(restaurantInfo?.address),
    planName: planName(tenant.plan),
    whatsappManage: Boolean(PLAN_LIMITS[tenant.plan]?.whatsapp),
    socialWhatsapp: Boolean(String(social.whatsapp || '').trim()),
    delivery: Boolean(social.glovo || social.deliveroo || social.justeat),
  };
}
