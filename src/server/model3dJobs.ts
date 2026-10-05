import fs from 'fs';
import path from 'path';

export type Model3dJob = {
  id: string;
  tenantSlug: string;
  productId: string;
  productName: string;
  taskId: string;
  whatsappNumber: string;
  createdAt: number;
  /** Nomi file delle foto temporanee in public/uploads/, da cancellare a job concluso. */
  photoFilenames: string[];
  attempts: number;
};

const FILE = path.join(process.cwd(), 'platform', '3d-jobs.json');

function load(): Model3dJob[] {
  if (!fs.existsSync(FILE)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function save(jobs: Model3dJob[]) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(jobs, null, 2), 'utf8');
}

export function addModel3dJob(job: Model3dJob) {
  const jobs = load();
  jobs.push(job);
  save(jobs);
}

export function listModel3dJobs(): Model3dJob[] {
  return load();
}

export function removeModel3dJob(id: string) {
  save(load().filter((job) => job.id !== id));
}

export function bumpModel3dJobAttempts(id: string) {
  const jobs = load();
  const job = jobs.find((j) => j.id === id);
  if (job) {
    job.attempts += 1;
    save(jobs);
  }
}

/** Un tenant ha già un job 3D in corso per un certo piatto? Evita doppie generazioni. */
export function hasActiveJobForProduct(tenantSlug: string, productId: string): boolean {
  return load().some((job) => job.tenantSlug === tenantSlug && job.productId === productId);
}
