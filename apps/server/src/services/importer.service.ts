import { type ImportBoard, parseCsv, parseTrelloJson } from '@librekanban/importers';
import type { Deps } from '../lib/context';
import { forbidden } from '../lib/errors';
import { createImportedBoard } from './board.service';
import { assertWorkspacePermission, primaryWorkspaceId } from './permissions';

async function importInto(deps: Deps, userId: string, parsed: ImportBoard): Promise<string> {
  const workspaceId = await primaryWorkspaceId(deps.db, userId);
  if (!workspaceId) throw forbidden('You are not a member of any workspace');
  await assertWorkspacePermission(deps.db, userId, workspaceId, 'board:create');

  const boardId = await createImportedBoard(deps.db, {
    workspaceId,
    userId,
    name: parsed.name,
    columnNames: parsed.columns,
    cards: parsed.cards,
  });
  deps.bus.publish({ type: 'board.updated', boardId, actorId: userId });
  return boardId;
}

/** Import a CSV (Kanboard task export or any CSV) into a new board. */
export function importCsv(deps: Deps, userId: string, text: string, name: string): Promise<string> {
  return importInto(deps, userId, parseCsv(text, name));
}

/** Import a Trello board JSON export into a new board. */
export function importTrello(deps: Deps, userId: string, text: string): Promise<string> {
  return importInto(deps, userId, parseTrelloJson(text));
}
