export interface Manga {
  id: string;
  title: string;
  slug: string;
  image: string;
  description: string;
  genres: string[];
  type: 'Manhwa' | 'Manga' | 'Manhua' | string;
  status: 'En Emision' | 'Finalizado' | 'Pausado' | string;
  chapters: number[];
  dateAdded: string;
  lastUpdated: string;
  latestChapter: number;
  views?: number;
}

export interface Chapter {
  mangaId: string;
  chapter: number;
  baseUrl?: string;
  pages: string[];
}

export interface HistoryEntry {
  mangaId: string;
  chapter: number;
  page?: number;
  timestamp: number;
  title: string;
  image?: string;
}

export type ReadingMode = 'paginated' | 'continuous';
export type SortOrder = 'title-asc' | 'title-desc' | 'date-desc' | 'date-asc';
