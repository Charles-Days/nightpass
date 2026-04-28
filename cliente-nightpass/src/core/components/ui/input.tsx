import * as React from 'react';
import { cn } from '@/core/lib/utils/cn';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          'flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none',
          'file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
          'placeholder:text-muted-foreground',
          'selection:bg-primary selection:text-primary-foreground',
          'focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:border-ring',
          'aria-invalid:ring-destructive/20 aria-invalid:border-destructive',
          'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
          'md:text-sm',
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';
