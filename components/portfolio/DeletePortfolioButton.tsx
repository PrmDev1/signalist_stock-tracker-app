'use client';

import { useState, useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { deleteSavedPortfolio } from '@/lib/actions/cloudflare.actions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface DeletePortfolioButtonProps {
  id: string;
  name: string;
}

export default function DeletePortfolioButton({ id, name }: DeletePortfolioButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const response = await deleteSavedPortfolio(id);

      if (!response.success) {
        toast.error(response.error || 'Failed to delete portfolio');
        return;
      }

      toast.success('Portfolio deleted');
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        aria-label={`Delete portfolio ${name}`}
        title={`Delete ${name}`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/35 bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all duration-200 hover:bg-red-500/20 hover:border-red-500/70"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-gray-800 border-gray-600 text-gray-200 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Portfolio</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to delete “{name}”? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-10 px-4 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={handleDelete}
              className="h-10 px-4 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 disabled:opacity-60 transition-colors"
            >
              {isPending ? 'Deleting...' : 'Delete'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
