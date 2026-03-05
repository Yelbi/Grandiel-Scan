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
}

export interface ReaderSettings {
  zoom: number;
  brightness: number;
  contrast: number;
  fitMode: 'width' | 'height' | 'original';
  backgroundColor: string;
}

export type ReadingMode = 'paginated' | 'continuous';
export type SortOrder = 'title-asc' | 'title-desc' | 'date-desc' | 'date-asc';
