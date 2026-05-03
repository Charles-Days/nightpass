import imageCompression from 'browser-image-compression';
import { clientFetch } from './api/client-client';
import { SignedUploadUrl } from '../types/api';

const COMPRESSION_OPTS = {
  maxSizeMB: 2,
  maxWidthOrHeight: 2560,
  useWebWorker: true,
  fileType: 'image/webp' as const,
  initialQuality: 0.92,
};

async function compressIfImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file;
  try {
    const compressed = await imageCompression(file, COMPRESSION_OPTS);
    const renamed = file.name.replace(/\.[^.]+$/, '.webp');
    return new File([compressed], renamed, { type: 'image/webp' });
  } catch {
    return file;
  }
}

export async function uploadFile(
  file: File,
  kind: 'venue' | 'event' | 'story'
): Promise<string> {
  const optimized = await compressIfImage(file);

  const { signedUrl, publicUrl } = await clientFetch<SignedUploadUrl>(
    '/api/uploads/sign',
    {
      method: 'POST',
      body: {
        filename: optimized.name,
        contentType: optimized.type || 'image/jpeg',
        kind,
      },
    }
  );

  const response = await fetch(signedUrl, {
    method: 'PUT',
    body: optimized,
    headers: { 'Content-Type': optimized.type || 'image/jpeg' },
  });

  if (!response.ok) {
    throw new Error('Error al subir el archivo al servidor de almacenamiento');
  }

  return publicUrl;
}
