'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { asset } from '@/lib/asset';
import { getDict, DEFAULT_LANG } from '@/lib/i18n';
import { modelHref, UNIVERSE_ROUTES, vendorHref } from '@/lib/routes';
import { runSearch, type SearchIndex, type SearchResult } from '@/lib/search';

let cachedIndex: SearchIndex | null = null;
let inflight: Promise<SearchIndex | null> | null = null;

function loadIndex(): Promise<SearchIndex | null> {
  if (cachedIndex) return Promise.resolve(cachedIndex);
  inflight ??= fetch(asset('/search-index.json'))
    .then((response) => (response.ok ? (response.json() as Promise<SearchIndex>) : null))
    .then((index) => {
      cachedIndex = index;
      return index;
    })
    .catch(() => null);
  return inflight;
}

interface SearchRow {
  key: string;
  href: string;
  title: string;
  note: string;
  tail?: string;
  group?: string;
}

function rowsOf(result: SearchResult): SearchRow[] {
  const dict = getDict(DEFAULT_LANG);
  const universeHref = (href: string): string => {
    if (href.startsWith('/leaderboard/all/')) {
      return `${UNIVERSE_ROUTES.allModels}${href.slice('/leaderboard/all/'.length)}`;
    }
    if (href.startsWith('/leaderboard/')) {
      return `${UNIVERSE_ROUTES.leaderboard}${href.slice('/leaderboard/'.length)}`;
    }
    if (href.startsWith('/vendor/')) {
      const rest = href.slice('/vendor/'.length);
      return vendorHref(UNIVERSE_ROUTES, rest.replace(/\/$/, ''));
    }
    if (href.startsWith('/model/')) {
      const rest = href.slice('/model/'.length);
      return modelHref(UNIVERSE_ROUTES, rest.replace(/\/$/, ''));
    }
    return href;
  };
  return [
    ...result.shortcuts.map((shortcut, index) => ({
      key: `s${index}`,
      href: universeHref(shortcut.href),
      title: shortcut.label,
      note: shortcut.hint,
      tail: shortcut.count == null ? '看榜单' : `${shortcut.count} 个`,
      group: index === 0 ? '按能力找' : undefined,
    })),
    ...result.vendors.map(({ vendor }, index) => ({
      key: `v${vendor.i}`,
      href: universeHref(`/vendor/${vendor.i}/`),
      title: vendor.n,
      note: `${dict.continent[vendor.c]}厂商`,
      tail: `${vendor.t} 个模型`,
      group: index === 0 ? '厂商星系' : undefined,
    })),
    ...result.models.map(({ model, vendor }, index) => ({
      key: `m${model.s}`,
      href: universeHref(`/model/${model.s}/`),
      title: model.n,
      note: `${vendor.n} · ${model.k ? dict.kind.label[model.k] : dict.kind.unknown}${model.x ? ' · 已退役' : ''}`,
      tail: model.r == null ? undefined : `智力 #${model.r}`,
      group: index === 0 ? '天体档案' : undefined,
    })),
  ];
}

/** Only the first row of each section gets a heading, but the result object can
 * omit earlier sections. Decide from the flattened list instead of row indices. */
function withGroups(rows: SearchRow[]): SearchRow[] {
  const seen = new Set<string>();
  return rows.map((row) => {
    if (!row.group) return row;
    if (seen.has(row.group)) return { ...row, group: undefined };
    seen.add(row.group);
    return row;
  });
}

export function UniverseSearch() {
  const [index, setIndex] = useState<SearchIndex | null>(cachedIndex);
  const [query, setQuery] = useState('');
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [composing, setComposing] = useState(false);
  const [cursor, setCursor] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const warm = useCallback(() => {
    if (!cachedIndex) void loadIndex().then(setIndex);
  }, []);

  useEffect(() => {
    if (composing) return;
    const timer = setTimeout(() => setTerm(query), 140);
    return () => clearTimeout(timer);
  }, [query, composing]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  const result = useMemo(() => runSearch(index, term), [index, term]);
  const rows = useMemo(() => withGroups(rowsOf(result)), [result]);
  const active = Math.min(cursor, Math.max(0, rows.length - 1));
  const pending = term.trim() !== query.trim();
  const allHref = `${UNIVERSE_ROUTES.allModels}?q=${encodeURIComponent(query.trim())}`;

  const dismiss = () => {
    setOpen(false);
    setQuery('');
    setTerm('');
    input.current?.blur();
  };

  const activate = (selector: string) => {
    box.current?.querySelector<HTMLElement>(selector)?.click();
  };

  return (
    <div ref={box} className="universe-global-search">
      <div className="universe-search-field">
        <span aria-hidden>⌕</span>
        <input
          ref={input}
          type="search"
          value={query}
          placeholder="搜模型、厂商或能力"
          aria-label="搜索模型、厂商或能力"
          aria-expanded={open && query.trim() !== ''}
          aria-controls="universe-global-results"
          role="combobox"
          onChange={(event) => {
            setQuery(event.target.value);
            setCursor(0);
            setOpen(true);
          }}
          onFocus={() => {
            warm();
            setOpen(true);
          }}
          onPointerEnter={warm}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={() => setComposing(false)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setOpen(false);
              input.current?.blur();
            } else if (event.key === 'ArrowDown' && rows.length) {
              event.preventDefault();
              setCursor((active + 1) % rows.length);
            } else if (event.key === 'ArrowUp' && rows.length) {
              event.preventDefault();
              setCursor((active - 1 + rows.length) % rows.length);
            } else if (event.key === 'Enter') {
              event.preventDefault();
              activate('[data-active="1"], [data-nav="all"]');
            }
          }}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setTerm('');
              input.current?.focus();
            }}
            aria-label="清空搜索"
          >
            ×
          </button>
        )}
      </div>

      {open && query.trim() && (
        <div id="universe-global-results" role="listbox" className="universe-search-popover">
          {!index && <p>正在载入星图索引…</p>}
          {index && rows.length === 0 && pending && <p>搜索中…</p>}
          {index && rows.length === 0 && !pending && (
            <p>
              没有匹配项。
              <Link href={allHref} data-nav="all" onClick={dismiss}>
                去全部模型继续筛选
              </Link>
            </p>
          )}
          {rows.map((row, index_) => (
            <div key={row.key}>
              {row.group && <small className="universe-search-group">{row.group}</small>}
              <Link
                href={row.href}
                role="option"
                aria-selected={index_ === active}
                data-active={index_ === active ? '1' : undefined}
                onPointerEnter={() => setCursor(index_)}
                onClick={dismiss}
              >
                <span>
                  <strong>{row.title}</strong>
                  <small>{row.note}</small>
                </span>
                {row.tail && <em>{row.tail}</em>}
              </Link>
            </div>
          ))}
          {result.modelTotal > result.models.length && (
            <Link href={allHref} data-nav="all" onClick={dismiss} className="universe-search-all">
              在全部模型里查看 {result.modelTotal} 个匹配 →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
