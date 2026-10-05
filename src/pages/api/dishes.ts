import type { NextApiRequest, NextApiResponse } from 'next';
import { withTenantApi } from '@/server/tenant';

function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({ message: 'Welcome to magenta kitchen' });
}

export default withTenantApi(handler);
