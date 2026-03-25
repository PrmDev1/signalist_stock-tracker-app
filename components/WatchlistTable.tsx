'use client';

import Image from 'next/image';
import type { MouseEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { WATCHLIST_TABLE_HEADER } from '@/lib/constants';
import { cn, getChangeColorClass } from '@/lib/utils';
import { Button } from './ui/button';
import WatchlistButton from './WatchlistButton';
import SetPriceAlertModal from '@/components/modals/SetPriceAlertModal';
import type { PriceAlertDto } from '@/lib/alerts/types';

type AlertByTicker = Record<string, PriceAlertDto>;

export function WatchlistTable({ watchlist }: WatchlistTableProps) {
  const router = useRouter();
  const [alertByTicker, setAlertByTicker] = useState<AlertByTicker>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<{
    ticker: string;
    company: string;
    currentPrice: number;
  } | null>(null);

  const tickerList = useMemo(
    () => watchlist.map((item) => item.symbol.toUpperCase()),
    [watchlist]
  );

  useEffect(() => {
    if (tickerList.length === 0) {
      setAlertByTicker({});
      return;
    }

    let active = true;

    const loadAlerts = async () => {
      try {
        const response = await fetch(
          `/api/alerts?tickers=${encodeURIComponent(tickerList.join(','))}`,
          { method: 'GET', cache: 'no-store' }
        );

        if (!response.ok || !active) {
          return;
        }

        const payload = (await response.json()) as { alerts?: PriceAlertDto[] };
        const nextState: AlertByTicker = {};

        for (const alert of payload.alerts || []) {
          nextState[alert.ticker.toUpperCase()] = alert;
        }

        setAlertByTicker(nextState);
      } catch {
        // Do not block table render when alert data fetch fails.
      }
    };

    void loadAlerts();

    return () => {
      active = false;
    };
  }, [tickerList]);

  const handleOpenModal = (
    event: MouseEvent<HTMLButtonElement>,
    item: StockWithData
  ) => {
    event.preventDefault();
    event.stopPropagation();

    setSelectedStock({
      ticker: item.symbol.toUpperCase(),
      company: item.company,
      currentPrice: Number(item.currentPrice || 0),
    });
    setIsModalOpen(true);
  };

  const handleAlertChange = (ticker: string, alert: PriceAlertDto | null) => {
    const key = ticker.toUpperCase();

    setAlertByTicker((prev) => {
      const next = { ...prev };
      if (!alert) {
        delete next[key];
        return next;
      }

      next[key] = alert;
      return next;
    });
  };

  return (
    <>
      <Table className='scrollbar-hide-default watchlist-table'>
        <TableHeader>
          <TableRow className='table-header-row'>
            {WATCHLIST_TABLE_HEADER.map((label) => (
              <TableHead className='table-header' key={label}>
                {label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {watchlist.map((item, index) => (
            <TableRow
              key={item.symbol + index}
              className='table-row'
              onClick={() =>
                router.push(`/stocks/${encodeURIComponent(item.symbol)}`)
              }
            >
              <TableCell className='pl-4 table-cell'>{item.company}</TableCell>
              <TableCell className='table-cell'>{item.symbol}</TableCell>
              <TableCell className='table-cell'>
                {item.priceFormatted || '—'}
              </TableCell>
              <TableCell
                className={cn(
                  'table-cell',
                  getChangeColorClass(item.changePercent)
                )}
              >
                {item.changeFormatted || '—'}
              </TableCell>
              <TableCell className='table-cell'>
                {item.marketCap || '—'}
              </TableCell>
              <TableCell className='table-cell'>
                {item.peRatio || '—'}
              </TableCell>
              <TableCell>
                <Button
                  type='button'
                  className={cn(
                    'add-alert min-w-[120px] justify-center gap-2',
                    alertByTicker[item.symbol.toUpperCase()]?.isActive &&
                      'border-yellow-400/50 bg-yellow-500/10 text-yellow-400'
                  )}
                  onClick={(event) => handleOpenModal(event, item)}
                >
                  <Image
                    src={
                      alertByTicker[item.symbol.toUpperCase()]?.isActive
                        ? '/assets/icons/bell-filled.svg'
                        : '/assets/icons/bell-outline.svg'
                    }
                    alt='Alert'
                    width={16}
                    height={16}
                  />
                  {alertByTicker[item.symbol.toUpperCase()]?.isActive
                    ? 'Active'
                    : 'Set Alert'}
                </Button>
              </TableCell>
              <TableCell>
                <WatchlistButton
                  symbol={item.symbol}
                  company={item.company}
                  isInWatchlist={true}
                  showTrashIcon={true}
                  type='icon'
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {selectedStock && (
        <SetPriceAlertModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          stock={selectedStock}
          initialAlert={alertByTicker[selectedStock.ticker] || null}
          onAlertChange={handleAlertChange}
        />
      )}
    </>
  );
}
