"use client";

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface InfoPopoverProps {
  title?: string;
  description: string;
}

export default function InfoPopover({ title = "คำอธิบาย", description }: InfoPopoverProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-500/60 bg-gray-700/60 text-[10px] font-semibold text-gray-300 transition-colors hover:border-gray-400 hover:text-gray-200"
          aria-label={title}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onClick={() => setOpen((prev) => !prev)}
        >
          i
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-72 border-gray-600 bg-gray-900 text-gray-100"
      >
        <p className="text-sm font-semibold text-gray-200">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-gray-300">{description}</p>
      </PopoverContent>
    </Popover>
  );
}
