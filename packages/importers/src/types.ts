export interface ImportCard {
  title: string;
  description?: string;
  columnName: string;
}

/** Normalized shape every importer produces; the server turns it into a board. */
export interface ImportBoard {
  name: string;
  columns: string[];
  cards: ImportCard[];
}
