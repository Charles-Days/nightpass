import * as React from 'react';
import { Label } from '@/core/components/ui/label';
import { cn } from '@/core/lib/utils/cn';

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Field({ label, htmlFor, error, description, children, className }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
