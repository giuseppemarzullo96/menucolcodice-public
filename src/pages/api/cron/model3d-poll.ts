import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { loadIntegrations } from '@/server/integrations';
import { enterTenant, getTenantBySlug } from '@/server/tenant';
import { updateProduct } from '@/server/menuStore';
import { sendWhatsAppText } from '@/server/whatsapp';
import { recordAiUsage } from '@/server/aiUsageStore';
import { getTaskStatus } from '@/server/tripo3d';
import { listModel3dJobs, removeModel3dJob, bumpModel3dJobAttempts, type Model3dJob } from '@/server/model3dJobs';
import { uploadsDir, dishImageUrl } from '@/server/dishImage';

const MAX_ATTEMPTS = 20; // ogni ~2 minuti: ~40 minuti prima di arrendersi

async function downloadGlb(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download modello fallito: HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.glb`;
  fs.writeFileSync(path.join(uploadsDir(), filename), buffer);
  return dishImageUrl(filename);
}

function cleanupPhotos(filenames: string[]) {
  for (const filename of filenames) {
    try {
      const file = path.join(uploadsDir(), filename);
      if (fs.existsSync(file)) fs.unlinkSync(file);
    } catch {
      /* ignore */
    }
  }
}

async function processJob(job: Model3dJob) {
  const tenant = getTenantBySlug(job.tenantSlug);
  if (!tenant) {
    removeModel3dJob(job.id);
    return;
  }
  enterTenant(tenant);

  let status;
  try {
    status = await getTaskStatus(job.taskId);
  } catch (error) {
    console.error(`Tripo3D poll fallito per job ${job.id}:`, error);
    bumpModel3dJobAttempts(job.id);
    return;
  }

  if (status.status === 'success' && status.modelUrl) {
    try {
      const modelUrl = await downloadGlb(status.modelUrl);
      updateProduct(job.productId, { imageUrl: modelUrl, mediaType: 'model3d' });
      recordAiUsage({ slug: job.tenantSlug, kind: 'model3d' });
      cleanupPhotos(job.photoFilenames);
      removeModel3dJob(job.id);
      await sendWhatsAppText(
        job.whatsappNumber,
        `Il modello 3D di *${job.productName}* è pronto ed è già sul menu! Ricarica la pagina per vederlo.`
      );
    } catch (error) {
      console.error(`Salvataggio modello 3D fallito per job ${job.id}:`, error);
      removeModel3dJob(job.id);
      await sendWhatsAppText(
        job.whatsappNumber,
        `Il modello 3D di *${job.productName}* è stato generato ma non sono riuscito a salvarlo. Riprova con *modello 3d ${job.productName}*.`
      );
    }
    return;
  }

  if (status.status === 'failed') {
    cleanupPhotos(job.photoFilenames);
    removeModel3dJob(job.id);
    await sendWhatsAppText(
      job.whatsappNumber,
      `Non sono riuscito a generare il modello 3D di *${job.productName}* da quelle foto. Riprova con foto più chiare e da angolazioni diverse: *modello 3d ${job.productName}*.`
    );
    return;
  }

  // ancora in corso
  bumpModel3dJobAttempts(job.id);
  if (job.attempts + 1 >= MAX_ATTEMPTS) {
    cleanupPhotos(job.photoFilenames);
    removeModel3dJob(job.id);
    await sendWhatsAppText(
      job.whatsappNumber,
      `La generazione del modello 3D di *${job.productName}* sta impiegando troppo tempo, ho annullato. Riprova più tardi con *modello 3d ${job.productName}*.`
    );
  }
}

/**
 * Controlla i job di generazione 3D in corso (Tripo3D richiede secondi/minuti,
 * il webhook WhatsApp non può restare in attesa). Cron ogni 2 minuti (crontab:
 * minuto "star-slash-2", poi "* * * *"):
 *   curl -fsS "https://demo.menucolcodice.it/api/cron/model3d-poll?token=..."
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const cfg = loadIntegrations();
  const token = String(req.query.token || req.headers['x-cron-token'] || '');
  if (!cfg.webhookToken || token !== cfg.webhookToken) {
    return res.status(401).json({ message: 'Token non valido' });
  }

  const jobs = listModel3dJobs();
  for (const job of jobs) {
    await processJob(job);
  }

  return res.status(200).json({ ok: true, checked: jobs.length });
}
