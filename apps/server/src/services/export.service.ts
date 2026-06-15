import { toCsv } from '@librekanban/importers';
import type { Deps } from '../lib/context';
import { getBoardDetail } from './board.service';
import { listWorkspaceMembers } from './workspace.service';

/** Full board snapshot as pretty JSON (re-importable / backup). */
export async function exportBoardJson(
  deps: Deps,
  userId: string,
  boardId: string,
): Promise<{ filename: string; body: string }> {
  const detail = await getBoardDetail(deps, userId, boardId);
  return { filename: `${detail.board.slug}.json`, body: JSON.stringify(detail, null, 2) };
}

/** Flat cards CSV (round-trips with the CSV importer). */
export async function exportBoardCsv(
  deps: Deps,
  userId: string,
  boardId: string,
): Promise<{ filename: string; body: string }> {
  const detail = await getBoardDetail(deps, userId, boardId);
  const colName = new Map(detail.columns.map((c) => [c.id, c.name]));
  const swimName = new Map(detail.swimlanes.map((s) => [s.id, s.name]));
  const labelName = new Map(detail.labels.map((l) => [l.id, l.name]));
  const members = await listWorkspaceMembers(deps.db, detail.board.workspaceId);
  const memberName = new Map(members.map((m) => [m.id, m.name]));

  const headers = [
    'Number',
    'Title',
    'Column',
    'Swimlane',
    'Priority',
    'Due',
    'Start',
    'Labels',
    'Assignees',
    'Description',
  ];
  const rows = detail.cards.map((c) => [
    c.number,
    c.title,
    colName.get(c.columnId) ?? '',
    swimName.get(c.swimlaneId) ?? '',
    c.priority,
    c.dueAt ?? '',
    c.startAt ?? '',
    c.labelIds.map((id) => labelName.get(id) ?? '').join('; '),
    c.assigneeIds.map((id) => memberName.get(id) ?? '').join('; '),
    c.description ?? '',
  ]);
  return { filename: `${detail.board.slug}.csv`, body: toCsv([headers, ...rows]) };
}
