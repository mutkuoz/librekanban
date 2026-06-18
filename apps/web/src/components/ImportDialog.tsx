import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import * as Dialog from '@radix-ui/react-dialog';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { Loader2, Upload, X } from 'lucide-react';
import { useState } from 'react';

const inputCls =
  'w-full h-9 rounded-md border border-border bg-bg px-2 text-sm outline-none focus:ring-2 focus:ring-brand/60';

export function ImportDialog({ onClose }: { onClose: () => void }) {
  const t = useT();
  const qc = useQueryClient();
  const router = useRouter();
  const [source, setSource] = useState<'csv' | 'trello'>('csv');
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const res =
        source === 'csv'
          ? await api.importCsv(file, name.trim() || 'Imported board')
          : await api.importTrello(file);
      await qc.invalidateQueries({ queryKey: ['boards'] });
      onClose();
      router.navigate({ to: '/b/$boardId', params: { boardId: res.boardId } });
    } catch (e) {
      setError(e instanceof Error ? e.message : t('import.failed'));
    } finally {
      setBusy(false);
    }
  };

  const tab = (key: 'csv' | 'trello', label: string) => (
    <button
      type="button"
      onClick={() => setSource(key)}
      className={cn(
        'flex-1 rounded-md border px-3 py-1.5 text-sm',
        source === key ? 'border-brand bg-brand/15 text-text' : 'border-border text-muted',
      )}
    >
      {label}
    </button>
  );

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface p-5 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="font-semibold">{t('import.title')}</Dialog.Title>
            <Dialog.Close className="text-muted hover:text-text">
              <X className="size-5" />
            </Dialog.Close>
          </div>

          <div className="space-y-3">
            <div className="flex gap-2">
              {tab('csv', t('import.csvTab'))}
              {tab('trello', t('import.trelloTab'))}
            </div>

            {source === 'csv' && (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('import.newBoardName')}
                className={inputCls}
              />
            )}
            <input
              type="file"
              accept={source === 'csv' ? '.csv,text/csv' : '.json,application/json'}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-text"
            />
            <p className="text-xs text-muted">
              {source === 'csv' ? t('import.csvHint') : t('import.trelloHint')}
            </p>
            {error && <div className="text-sm text-red-400">{error}</div>}

            <Button className="w-full" onClick={submit} disabled={!file || busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {t('boards.import')}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
