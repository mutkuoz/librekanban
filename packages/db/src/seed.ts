import './load-env';
import { eq } from 'drizzle-orm';
import { createDb } from './client';
import { newId } from './ids';
import { boards, cards, columns, swimlanes, workspaces } from './schema';

/**
 * Optional demo data: a workspace with a "Welcome" board, three columns, a
 * default swimlane and a few cards. Safe to skip; the app provisions a real
 * workspace on first signup. Positions use simple sortable keys.
 */
async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required to seed');
  const { db, pool } = createDb(url);

  const existing = await db.select({ id: workspaces.id }).from(workspaces).limit(1);
  if (existing.length > 0) {
    console.log('• Workspace already exists — skipping seed.');
    await pool.end();
    return;
  }

  const workspaceId = newId();
  await db.insert(workspaces).values({ id: workspaceId, name: 'Demo', slug: 'demo' });

  const boardId = newId();
  await db.insert(boards).values({
    id: boardId,
    workspaceId,
    name: 'Welcome to librekanban',
    slug: 'welcome',
    description: 'A sample board to get you started.',
    position: 'a0',
  });

  const swimlaneId = newId();
  await db.insert(swimlanes).values({
    id: swimlaneId,
    boardId,
    name: 'Default',
    isDefault: true,
    position: 'a0',
  });

  const columnDefs = [
    { name: 'To Do', pos: 'a0' },
    { name: 'In Progress', pos: 'a1' },
    { name: 'Done', pos: 'a2', isDone: true },
  ];
  const columnIds: string[] = [];
  for (const c of columnDefs) {
    const id = newId();
    columnIds.push(id);
    await db.insert(columns).values({
      id,
      boardId,
      name: c.name,
      position: c.pos,
      isDoneColumn: Boolean(c.isDone),
    });
  }

  const sampleCards = [
    { col: 0, title: 'Drag me to another column →', pos: 'a0' },
    { col: 0, title: 'Add your first real task', pos: 'a1' },
    { col: 1, title: 'This one is in progress', pos: 'a0' },
  ];
  let n = 0;
  for (const sc of sampleCards) {
    n += 1;
    await db.insert(cards).values({
      id: newId(),
      boardId,
      columnId: columnIds[sc.col]!,
      swimlaneId,
      number: n,
      title: sc.title,
      position: sc.pos,
    });
  }
  await db
    .update(boards)
    .set({ cardCounter: n })
    .where(eq(boards.id, boardId));

  console.log('✓ Seeded demo workspace + board.');
  await pool.end();
}

main().catch((err) => {
  console.error('✗ Seed failed:', err);
  process.exit(1);
});
