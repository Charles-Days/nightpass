import { clientFetch } from './api/client-client';
import { SignedUploadUrl } from '../types/api';

export async function uploadFile(
  file: File,
  kind: 'venue' | 'event' | 'story'
): Promise<string> {
  // 1. Get signed URL
  const { signedUrl, publicUrl } = await clientFetch<SignedUploadUrl>(
    '/api/uploads/sign',
    {
      method: 'POST',
      body: {
        filename: file.name,
        contentType: file.type || 'image/jpeg',
        kind,
      },
    }
  );

  // 2. Upload to Storage (R2/S3 or Local)

  const response = await fetch(signedUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type || 'image/jpeg',
    },
  });

  if (!response.ok) {
    throw new Error('Error al subir el archivo al servidor de almacenamiento');
  }

  return publicUrl;
}
