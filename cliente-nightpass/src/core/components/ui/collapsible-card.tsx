'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/core/lib/utils/cn';

interface CollapsibleCardProps {
  icon?: React.ReactNode;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hasUnsavedChanges?: boolean;
  rightSlot?: React.ReactNode;
  className?: string;
}

export function CollapsibleCard({
  icon,
  title,
  children,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  hasUnsavedChanges = false,
  rightSlot,
  className,
}: CollapsibleCardProps) {
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const open = isControlled ? controlledOpen : internalOpen;

  const contentId = React.useId();
  const headerId = React.useId();

  const toggle = () => {
    const next = !open;
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  };

  return (
    <div
      className={cn(
        'rounded-[22px] border border-white/10 bg-white/[0.025] overflow-hidden',
        className,
      )}
    >
      {/* Header — clickeable */}
      <div
        id={headerId}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-controls={contentId}
        onClick={toggle}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex min-h-[56px] cursor-pointer select-none items-center gap-3 px-6 py-4',
          'transition-colors hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-0',
        )}
      >
        {/* Icon */}
        {icon && <span className="shrink-0">{icon}</span>}

        {/* Title + unsaved dot */}
        <span className="flex flex-1 items-center gap-2 font-medium">
          {title}
          {hasUnsavedChanges && (
            <span
              aria-label="Cambios sin guardar"
              className="inline-block size-2 rounded-full bg-orange-400"
            />
          )}
        </span>

        {/* rightSlot — visible solo cuando open */}
        {open && rightSlot && (
          <span
            className="shrink-0"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {rightSlot}
          </span>
        )}

        {/* Chevron */}
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </div>

      {/* Animated content */}
      <div
        id={contentId}
        role="region"
        aria-labelledby={headerId}
        className="grid transition-[grid-template-rows] duration-200 ease-in-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="border-t border-white/8 px-6 py-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
