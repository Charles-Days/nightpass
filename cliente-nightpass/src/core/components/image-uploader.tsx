'use client';
import * as React from 'react';
import Image from 'next/image';
import { Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { uploadFile } from '@/core/lib/upload';

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string | undefined) => void;
  kind: 'venue' | 'event' | 'story';
  label?: string;
  /** Texto guía bajo el label (ej. medida recomendada). */
  hint?: string;
  /** Proporción del preview/dropzone. 'video' = 16:9 landscape, 'portrait' = 9:16 vertical. */
  aspect?: 'video' | 'portrait';
}

// Tamaño del preview según la proporción — refleja cómo se renderiza en la UI real.
const ASPECT_BOX: Record<'video' | 'portrait', string> = {
  video: 'h-32 w-56', // 16:9 aprox
  portrait: 'h-56 w-32', // 9:16 aprox
};

export function ImageUploader({
  value,
  onChange,
  kind,
  label = 'Imagen',
  hint,
  aspect = 'video',
}: ImageUploaderProps) {
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes');
      return;
    }
    setUploading(true);
    try {
      const publicUrl = await uploadFile(file, kind);
      onChange(publicUrl);
      toast.success('Imagen subida');
    } catch {
      toast.error('Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  }

  const box = ASPECT_BOX[aspect];

  return (
    <div className="space-y-2">
      <div className="space-y-0.5">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {hint ? (
          <p className="text-[11px] text-muted-foreground/70">{hint}</p>
        ) : null}
      </div>
      {value ? (
        <div className="relative inline-block">
          <Image src={value} alt="preview" width={224} height={224} unoptimized className={`${box} rounded-lg object-cover border border-white/10`} />
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
          className={`${box} flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-white/20 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50`}
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
