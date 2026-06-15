import type { ImportBoard } from './types';

interface TrelloList {
  id: string;
  name: string;
  closed?: boolean;
  pos?: number;
}
interface TrelloCard {
  name: string;
  desc?: string;
  idList: string;
  closed?: boolean;
  pos?: number;
}

/** Trello board JSON export → board. Skips archived (closed) lists and cards. */
export function parseTrelloJson(text: string): ImportBoard {
  const data = JSON.parse(text) as {
    name?: string;
    lists?: TrelloList[];
    cards?: TrelloCard[];
  };
  const name = typeof data.name === 'string' && data.name ? data.name : 'Imported Trello board';

  const lists = (data.lists ?? [])
    .filter((l) => !l.closed)
    .sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0));
  const listNameById = new Map(lists.map((l) => [l.id, l.name]));

  const cards = (data.cards ?? [])
    .filter((c) => !c.closed && listNameById.has(c.idList))
    .sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0))
    .map((c) => ({
      title: String(c.name ?? 'Untitled').slice(0, 500),
      description: c.desc?.trim() || undefined,
      columnName: listNameById.get(c.idList)!,
    }));

  return { name, columns: lists.map((l) => l.name), cards };
}
