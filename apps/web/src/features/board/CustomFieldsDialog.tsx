import { Button } from '@/components/ui/button';
import { useCustomFieldAdmin } from '@/lib/queries';
import type { CustomField, CustomFieldType } from '@librekanban/shared';
import * as Dialog from '@radix-ui/react-dialog';
import { Trash2, X } from 'lucide-react';
import { useState } from 'react';

const OFFERED: CustomFieldType[] = ['text', 'number', 'date', 'select', 'checkbox', 'url', 'email'];
const inputCls =
  'w-full h-9 rounded-md border border-border bg-bg px-2 text-sm outline-none focus:ring-2 focus:ring-brand/60';

export function CustomFieldsDialog({
  boardId,
  fields,
  onClose,
}: {
  boardId: string;
  fields: CustomField[];
  onClose: () => void;
}) {
  const admin = useCustomFieldAdmin(boardId);
  const [name, setName] = useState('');
  const [type, setType] = useState<CustomFieldType>('text');
  const [options, setOptions] = useState('');

  const add = () => {
    const n = name.trim();
    if (!n) return;
    const config =
      type === 'select'
        ? {
            options: options
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          }
        : undefined;
    admin.create.mutate({ name: n, type, config });
    setName('');
    setOptions('');
  };

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface p-5 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="font-semibold">Custom fields</Dialog.Title>
            <Dialog.Close className="text-muted hover:text-text">
              <X className="size-5" />
            </Dialog.Close>
          </div>

          <div className="mb-4 space-y-1.5">
            {fields.length === 0 && <div className="text-sm text-muted">No custom fields yet.</div>}
            {fields.map((f) => (
              <div key={f.id} className="group flex items-center gap-2 text-sm">
                <span className="flex-1">{f.name}</span>
                <span className="text-xs text-muted">{f.type}</span>
                <button
                  type="button"
                  onClick={() => admin.remove.mutate(f.id)}
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Trash2 className="size-3.5 text-muted hover:text-red-400" />
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-2 border-t border-border pt-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Field name"
              className={inputCls}
            />
            <div className="flex gap-2">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as CustomFieldType)}
                className={inputCls}
              >
                {OFFERED.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {type === 'select' && (
                <input
                  value={options}
                  onChange={(e) => setOptions(e.target.value)}
                  placeholder="option1, option2"
                  className={inputCls}
                />
              )}
            </div>
            <Button size="sm" onClick={add} disabled={admin.create.isPending}>
              Add field
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
