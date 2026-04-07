"use client";

import { useDebounce } from '@/hooks/useDebounce';
import {
  addToWatchlist,
  removeFromWatchlist,
} from '@/lib/actions/watchlist.actions';
import { Star, StarIcon, Stars, Trash2 } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner'

const WATCHLIST_UPDATED_EVENT = 'watchlist:updated';

// Minimal WatchlistButton implementation to satisfy page requirements.
// This component focuses on UI contract only. It toggles local state and
// calls onWatchlistChange if provided. Styling hooks match globals.css.

const WatchlistButton = ({
  symbol,
  company,
  isInWatchlist,
  showTrashIcon = false,
  type = 'button',
  onWatchlistChange,
}: WatchlistButtonProps) => {
  const [added, setAdded] = useState<boolean>(!!isInWatchlist);

  const notifyWatchlistUpdated = () => {
    if (typeof window === 'undefined') {
      return;
    }

    window.dispatchEvent(new Event(WATCHLIST_UPDATED_EVENT));
    window.localStorage.setItem(WATCHLIST_UPDATED_EVENT, String(Date.now()));
  };

  useEffect(() => {
    setAdded(!!isInWatchlist);
  }, [isInWatchlist]);

  const label = useMemo(() => {
    if (type === 'icon') return added ? '' : '';
    return added ? 'Remove from Watchlist' : 'Add to Watchlist';
  }, [added, type]);

  // Handle adding/removing stocks from watchlist
  const toggleWatchlist = async () => {
    const nextAddedState = !added;
    const result = added
      ? await removeFromWatchlist(symbol)
      : await addToWatchlist(symbol, company);

    if (result.success) {
      toast.success(added ? 'Removed from Watchlist' : 'Added to Watchlist', {
        description: `${company} ${
          added ? 'removed from' : 'added to'
        } your watchlist`,
      });

      // Notify parent component of watchlist change for state synchronization
      onWatchlistChange?.(symbol, nextAddedState);
      setAdded(nextAddedState);
      notifyWatchlistUpdated();
      return;
    }

    setAdded(added);
    toast.error(('error' in result && result.error) ? result.error : 'Failed to update watchlist');
  };

  // Debounce the toggle function to prevent rapid API calls (300ms delay)
  const debouncedToggle = useDebounce(toggleWatchlist, 300);

  // Click handler that provides optimistic UI updates
  const handleClick = (e: React.MouseEvent) => {
    // Prevent event bubbling and default behavior
    e.stopPropagation();
    e.preventDefault();

    debouncedToggle();
  };

  if (type === 'icon') {
    return (
      <button
        title={
          added
            ? `Remove ${symbol} from watchlist`
            : `Add ${symbol} to watchlist`
        }
        aria-label={
          added
            ? `Remove ${symbol} from watchlist`
            : `Add ${symbol} to watchlist`
        }
        className={`watchlist-icon-btn ${added ? 'watchlist-icon-added' : ''}`}
        onClick={handleClick}
      >
        <Star fill={added ? 'currentColor' : 'none'} />
      </button>
    );
  }

  return (
    <button
      className={`watchlist-btn ${added ? 'watchlist-remove' : ''}`}
      onClick={handleClick}
    >
      {showTrashIcon && added ? <Trash2 /> : null}
      <span>{label}</span>
    </button>
  );
};

export default WatchlistButton;
