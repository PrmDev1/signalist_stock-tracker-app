'use client';

import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AlertType, PriceAlertDto } from '@/lib/alerts/types';

interface SetPriceAlertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stock: {
    ticker: string;
    company: string;
    currentPrice: number;
  };
  initialAlert?: PriceAlertDto | null;
  onAlertChange?: (ticker: string, alert: PriceAlertDto | null) => void;
}

const defaultTrigger = (currentPrice: number) => {
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) return '0';
  return currentPrice.toFixed(2);
};

export default function SetPriceAlertModal({
  open,
  onOpenChange,
  stock,
  initialAlert,
  onAlertChange,
}: SetPriceAlertModalProps) {
  const [existingAlert, setExistingAlert] = useState<PriceAlertDto | null>(initialAlert || null);
  const [alertType, setAlertType] = useState<AlertType>('ABOVE');
  const [triggerPrice, setTriggerPrice] = useState<string>(defaultTrigger(stock.currentPrice));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isUpdateMode = useMemo(() => Boolean(existingAlert), [existingAlert]);

  useEffect(() => {
    if (!open) return;

    let active = true;

    const loadAlert = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/alerts?ticker=${encodeURIComponent(stock.ticker)}`, {
          method: 'GET',
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('ไม่สามารถโหลดข้อมูลการแจ้งเตือนได้');
        }

        const payload = (await response.json()) as { alert: PriceAlertDto | null };
        if (!active) return;

        setExistingAlert(payload.alert);

        if (payload.alert) {
          setAlertType(payload.alert.alertType);
          setTriggerPrice(payload.alert.triggerPrice.toString());
        } else {
          setAlertType('ABOVE');
          setTriggerPrice(defaultTrigger(stock.currentPrice));
        }
      } catch (error) {
        if (active) {
          const message = error instanceof Error ? error.message : 'ไม่สามารถโหลดการแจ้งเตือนได้';
          toast.error(message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadAlert();

    return () => {
      active = false;
    };
  }, [open, stock.ticker, stock.currentPrice]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const numericTriggerPrice = Number(triggerPrice);
    if (!Number.isFinite(numericTriggerPrice) || numericTriggerPrice <= 0) {
      toast.error('ราคาที่ใช้แจ้งเตือนต้องมากกว่า 0');
      return;
    }

    if (!Number.isFinite(stock.currentPrice) || stock.currentPrice <= 0) {
      toast.error('ไม่มีข้อมูลราคาตลาดปัจจุบันของหุ้นนี้');
      return;
    }

    if (alertType === 'ABOVE' && numericTriggerPrice <= stock.currentPrice) {
      toast.error('หากเลือกแจ้งเตือนเมื่อราคาสูงกว่า ราคาที่ตั้งต้องสูงกว่าราคาปัจจุบัน');
      return;
    }

    if (alertType === 'BELOW' && numericTriggerPrice >= stock.currentPrice) {
      toast.error('หากเลือกแจ้งเตือนเมื่อราคาต่ำกว่า ราคาที่ตั้งต้องต่ำกว่าราคาปัจจุบัน');
      return;
    }

    setSaving(true);

    try {
      const endpoint = existingAlert ? `/api/alerts/${existingAlert.id}` : '/api/alerts';
      const method = existingAlert ? 'PATCH' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticker: stock.ticker,
          company: stock.company,
          alertType,
          triggerPrice: numericTriggerPrice,
          currentPriceAtSet: stock.currentPrice,
          isActive: true,
        }),
      });

      const payload = (await response.json()) as { alert?: PriceAlertDto; error?: string };
      if (!response.ok || !payload.alert) {
        throw new Error(payload.error || 'ไม่สามารถบันทึกการแจ้งเตือนได้');
      }

      setExistingAlert(payload.alert);
      onAlertChange?.(stock.ticker, payload.alert);
      toast.success(existingAlert ? 'อัปเดตการแจ้งเตือนแล้ว' : 'สร้างการแจ้งเตือนแล้ว');
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'ไม่สามารถบันทึกการแจ้งเตือนได้';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!existingAlert) return;

    setDeleting(true);

    try {
      const response = await fetch(`/api/alerts/${existingAlert.id}`, {
        method: 'DELETE',
      });

      const payload = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'ไม่สามารถลบการแจ้งเตือนได้');
      }

      setExistingAlert(null);
      setAlertType('ABOVE');
      setTriggerPrice(defaultTrigger(stock.currentPrice));
      onAlertChange?.(stock.ticker, null);
      toast.success('ลบการแจ้งเตือนแล้ว');
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'ไม่สามารถลบการแจ้งเตือนได้';
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-full h-full max-w-none rounded-none border-0 bg-gray-900 p-0 sm:h-auto sm:max-w-[720px] sm:rounded-2xl sm:border sm:border-gray-600"
      >
        <div className="relative h-full overflow-y-auto p-4 sm:p-8">
          <div className="mx-auto w-full max-w-[580px] rounded-2xl border border-gray-600 bg-gray-800/90 p-6 shadow-2xl backdrop-blur-md sm:p-10">
            <DialogHeader className="mb-6 text-left">
              <DialogTitle className="text-3xl font-bold text-gray-100">แจ้งเตือนราคา</DialogTitle>
              <DialogDescription className="text-gray-400">
                ตั้งระดับราคาที่ต้องการ แล้วรับอีเมลเมื่อราคาวิ่งถึงเงื่อนไขที่กำหนด
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-gray-300">ชื่อการแจ้งเตือน</Label>
                <Input
                  value={`${stock.company} (${stock.ticker})`}
                  disabled
                  className="h-12 rounded-lg border-gray-600 bg-gray-700 text-gray-300 disabled:opacity-100"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">ประเภทการแจ้งเตือน</Label>
                <Select value={alertType} onValueChange={(value) => setAlertType(value as AlertType)}>
                  <SelectTrigger className="h-12 w-full rounded-lg border-gray-600 bg-gray-700 text-gray-100">
                    <SelectValue placeholder="เลือกประเภทการแจ้งเตือน" />
                  </SelectTrigger>
                  <SelectContent className="border-gray-600 bg-gray-800 text-gray-100">
                    <SelectItem value="ABOVE">ราคาสูงกว่า</SelectItem>
                    <SelectItem value="BELOW">ราคาต่ำกว่า</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">ราคาที่ใช้แจ้งเตือน</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={triggerPrice}
                  onChange={(event) => setTriggerPrice(event.target.value)}
                  className="h-12 rounded-lg border-gray-600 bg-gray-700 text-gray-100"
                  placeholder="เช่น 240.60"
                  required
                />
              </div>

              <div className="rounded-lg border border-gray-600 bg-gray-700/40 px-4 py-3 text-sm text-gray-400">
                ราคาตลาดขณะตั้งการแจ้งเตือน: ${stock.currentPrice.toFixed(2)}
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  variant="outline"
                  className="h-11 rounded-lg border-gray-600 bg-transparent text-gray-300 hover:bg-gray-700"
                >
                  ยกเลิก
                </Button>

                <div className="flex flex-col gap-3 sm:flex-row">
                  {isUpdateMode && (
                    <Button
                      type="button"
                      onClick={onDelete}
                      disabled={deleting || loading}
                      variant="destructive"
                      className="h-11 rounded-lg"
                    >
                      {deleting ? 'กำลังลบ...' : 'ลบการแจ้งเตือน'}
                    </Button>
                  )}
                  <Button
                    type="submit"
                    disabled={saving || loading}
                    className="h-11 rounded-lg bg-yellow-400 text-black hover:bg-yellow-500"
                  >
                    {saving
                      ? 'กำลังบันทึก...'
                      : isUpdateMode
                        ? 'อัปเดตการแจ้งเตือน'
                        : 'ตั้งการแจ้งเตือน'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
