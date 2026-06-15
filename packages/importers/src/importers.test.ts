import { describe, expect, it } from 'vitest';
import { parseCsv } from './csv';
import { parseTrelloJson } from './trello';

describe('parseCsv', () => {
  it('maps title/column/description and groups columns (quoted commas ok)', () => {
    const csv = 'Title,Column,Description\n"Fix bug",To Do,"Urgent, ASAP"\nShip it,Done,\n';
    const b = parseCsv(csv, 'My Import');
    expect(b.name).toBe('My Import');
    expect([...b.columns].sort()).toEqual(['Done', 'To Do']);
    expect(b.cards).toHaveLength(2);
    expect(b.cards[0]).toMatchObject({
      title: 'Fix bug',
      columnName: 'To Do',
      description: 'Urgent, ASAP',
    });
  });

  it('falls back to first column for title and a default column', () => {
    const b = parseCsv('Foo,Bar\nhello,world\n');
    expect(b.cards[0]?.title).toBe('hello');
    expect(b.cards[0]?.columnName).toBe('Imported');
  });
});

describe('parseTrelloJson', () => {
  it('maps lists→columns and cards, skipping closed ones', () => {
    const json = JSON.stringify({
      name: 'Board',
      lists: [
        { id: 'l1', name: 'A', pos: 1 },
        { id: 'l2', name: 'B', pos: 2, closed: true },
      ],
      cards: [
        { name: 'c1', idList: 'l1', pos: 1 },
        { name: 'c2', idList: 'l2' },
        { name: 'c3', idList: 'l1', closed: true },
      ],
    });
    const b = parseTrelloJson(json);
    expect(b.name).toBe('Board');
    expect(b.columns).toEqual(['A']);
    expect(b.cards).toHaveLength(1);
    expect(b.cards[0]).toMatchObject({ title: 'c1', columnName: 'A' });
  });
});
