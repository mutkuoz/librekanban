import { relations } from 'drizzle-orm';
import { user } from './auth';
import { boardMembers, boards, columns, labels, swimlanes } from './board';
import { cardAssignees, cardLabels, cards, checklistItems, checklists, comments } from './card';
import { workspaceMembers, workspaces } from './workspace';

export * from './auth';
export * from './workspace';
export * from './board';
export * from './card';
export * from './activity';
export * from './notification';
export * from './attachment';
export * from './preference';
export * from './custom-field';

// ── Relations (enable Drizzle's relational query API, e.g. board + columns + cards) ──

export const workspacesRelations = relations(workspaces, ({ many }) => ({
  boards: many(boards),
  members: many(workspaceMembers),
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceMembers.workspaceId],
    references: [workspaces.id],
  }),
  user: one(user, { fields: [workspaceMembers.userId], references: [user.id] }),
}));

export const boardsRelations = relations(boards, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [boards.workspaceId], references: [workspaces.id] }),
  columns: many(columns),
  swimlanes: many(swimlanes),
  labels: many(labels),
  members: many(boardMembers),
}));

export const columnsRelations = relations(columns, ({ one, many }) => ({
  board: one(boards, { fields: [columns.boardId], references: [boards.id] }),
  cards: many(cards),
}));

export const swimlanesRelations = relations(swimlanes, ({ one, many }) => ({
  board: one(boards, { fields: [swimlanes.boardId], references: [boards.id] }),
  cards: many(cards),
}));

export const cardsRelations = relations(cards, ({ one, many }) => ({
  board: one(boards, { fields: [cards.boardId], references: [boards.id] }),
  column: one(columns, { fields: [cards.columnId], references: [columns.id] }),
  swimlane: one(swimlanes, { fields: [cards.swimlaneId], references: [swimlanes.id] }),
  assignees: many(cardAssignees),
  labels: many(cardLabels),
  comments: many(comments),
  checklists: many(checklists),
}));

export const cardAssigneesRelations = relations(cardAssignees, ({ one }) => ({
  card: one(cards, { fields: [cardAssignees.cardId], references: [cards.id] }),
  user: one(user, { fields: [cardAssignees.userId], references: [user.id] }),
}));

export const cardLabelsRelations = relations(cardLabels, ({ one }) => ({
  card: one(cards, { fields: [cardLabels.cardId], references: [cards.id] }),
  label: one(labels, { fields: [cardLabels.labelId], references: [labels.id] }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  card: one(cards, { fields: [comments.cardId], references: [cards.id] }),
  author: one(user, { fields: [comments.authorId], references: [user.id] }),
}));

export const checklistsRelations = relations(checklists, ({ one, many }) => ({
  card: one(cards, { fields: [checklists.cardId], references: [cards.id] }),
  items: many(checklistItems),
}));

export const checklistItemsRelations = relations(checklistItems, ({ one }) => ({
  checklist: one(checklists, { fields: [checklistItems.checklistId], references: [checklists.id] }),
}));
