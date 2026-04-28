'use client';
import * as React from 'react';
import { Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { clientFetch } from '@/core/lib/api/client-client';
import type { SignedUploadUrl } from '@/core/types/api';

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string | undefined) => void;
  kind: 'venue' | 'event' | 'story';
  label?: string;
}

export function ImageUploader({ value, onChange, kind, label = 'Imagen' }: ImageUploaderProps) {
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes');
      return;
    }
    setUploading(true);
    try {
      const { signedUrl, publicUrl } = await clientFetch<SignedUploadUrl>('/api/uploads/sign', {
        method: 'POST',
        body: { filename: file.name, contentType: file.type, kind },
      });
      await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      onChange(publicUrl);
      toast.success('Imagen subida');
    } catch {
      toast.error('Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {value ? (
        <div className="relative inline-block">
          <img src={value} alt="preview" className="h-32 w-48 rounded-lg object-cover border border-white/10" />
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-destructive text-white text-xs"
          >
            <X className="size-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-32 w-48 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-white/20 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50"
        >
          <Upload className="size-5" />
          <span className="text-xs">{uploading ? 'Subiendo…' : 'Click para subir'}</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}
