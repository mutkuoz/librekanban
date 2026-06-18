import { type TranslationKey, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import {
  type CustomField,
  DUE_STATES,
  type DueState,
  PRIORITIES,
  type Priority,
  SORT_KEYS,
  type SortKey,
  type WorkspaceMember,
} from '@librekanban/shared';
import { Filter } from 'lucide-react';
import { useState } from 'react';
import { type BoardFilter, EMPTY_FILTER, activeFilterCount } from './filter';

const SORT_LABEL_KEY: Record<SortKey, TranslationKey> = {
  manual: 'sort.manual',
  priority: 'sort.priority',
  due: 'sort.due',
  created: 'sort.created',
  title: 'sort.title',
};
const DUE_LABEL_KEY: Record<DueState, TranslationKey> = {
  any: 'due.any',
  overdue: 'due.overdue',
  today: 'due.today',
  week: 'due.week',
  none: 'due.none',
};

const selectCls = 'h-8 w-full rounded-md border border-border bg-bg px-2 text-sm outline-none';

export function FilterPanel({
  filter,
  setFilter,
  sort,
  setSort,
  customFields,
  members,
}: {
  filter: BoardFilter;
  setFilter: (next: BoardFilter) => void;
  sort: SortKey;
  setSort: (next: SortKey) => void;
  customFields: CustomField[];
  members: WorkspaceMember[];
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const count = activeFilterCount(filter);

  const togglePriority = (p: Priority) => {
    const has = filter.priorities.includes(p);
    setFilter({
      ...filter,
      priorities: has ? filter.priorities.filter((x) => x !== p) : [...filter.priorities, p],
    });
  };

  const clearAll = () => {
    setFilter({ ...EMPTY_FILTER, text: filter.text });
    setSort('manual');
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Filters & sort"
        className={cn(
          'flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-2 text-sm',
          count > 0 ? 'text-text' : 'text-muted hover:text-text',
        )}
      >
        <Filter className="size-4" />
        {t('filter.title')}
        {count > 0 && (
          <span className="grid size-4 place-items-center rounded-full bg-brand text-[10px] text-brand-fg">
            {count}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close filters"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="lk-pop absolute right-0 z-20 mt-2 w-72 space-y-3 rounded-md border border-border bg-surface p-3 shadow-xl">
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                {t('filter.sortBy')}
              </div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className={selectCls}
              >
                {SORT_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {t(SORT_LABEL_KEY[k])}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                {t('filter.priority')}
              </div>
              <div className="flex flex-wrap gap-1">
                {PRIORITIES.map((p) => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => togglePriority(p)}
                    className={cn(
                      'rounded-full border px-2 py-0.5 text-xs capitalize',
                      filter.priorities.includes(p)
                        ? 'border-brand bg-brand/15 text-text'
                        : 'border-border text-muted hover:text-text',
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                {t('filter.due')}
              </div>
              <select
                value={filter.due}
                onChange={(e) => setFilter({ ...filter, due: e.target.value as DueState })}
                className={selectCls}
              >
                {DUE_STATES.map((d) => (
                  <option key={d} value={d}>
                    {t(DUE_LABEL_KEY[d])}
                  </option>
                ))}
              </select>
            </div>

            {customFields.length > 0 && (
              <CustomFieldFilter
                filter={filter}
                setFilter={setFilter}
                customFields={customFields}
                members={members}
              />
            )}

            {(count > 0 || sort !== 'manual') && (
              <button
                type="button"
                onClick={clearAll}
                className="w-full rounded-md border border-border py-1.5 text-sm text-muted hover:text-text"
              >
                {t('filter.clear')}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function CustomFieldFilter({
  filter,
  setFilter,
  customFields,
  members,
}: {
  filter: BoardFilter;
  setFilter: (next: BoardFilter) => void;
  customFields: CustomField[];
  members: WorkspaceMember[];
}) {
  const t = useT();
  const [fieldId, setFieldId] = useState(filter.customField?.fieldId ?? '');
  const field = customFields.find((f) => f.id === fieldId) ?? null;
  const value = filter.customField?.value ?? '';

  const setValue = (v: string) =>
    setFilter({ ...filter, customField: fieldId && v ? { fieldId, value: v } : null });

  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
        {t('filter.customField')}
      </div>
      <select
        value={fieldId}
        onChange={(e) => {
          setFieldId(e.target.value);
          setFilter({ ...filter, customField: null });
        }}
        className={cn(selectCls, 'mb-1.5')}
      >
        <option value="">—</option>
        {customFields.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>

      {field &&
        (field.type === 'select' || field.type === 'multiselect' ? (
          <select value={value} onChange={(e) => setValue(e.target.value)} className={selectCls}>
            <option value="">{t('filter.any')}</option>
            {(field.config.options ?? []).map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        ) : field.type === 'checkbox' ? (
          <select value={value} onChange={(e) => setValue(e.target.value)} className={selectCls}>
            <option value="">{t('filter.any')}</option>
            <option value="true">{t('filter.checked')}</option>
            <option value="false">{t('filter.unchecked')}</option>
          </select>
        ) : field.type === 'user' ? (
          <select value={value} onChange={(e) => setValue(e.target.value)} className={selectCls}>
            <option value="">{t('board.anyone')}</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t('filter.value')}
            className={selectCls}
          />
        ))}
    </div>
  );
}
