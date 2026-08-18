import type { Manga } from '@/lib/types';
import type React from 'react';

export type Tab   = 'manga' | 'chapter' | 'edit-manga' | 'edit-chapter' | 'bulk' | 'autodiscover' | 'sources' | 'delete' | 'reports' | 'verify';
export type Alert = { type: 'ok' | 'err'; msg: string } | null;

export type BulkStatus = 'pending' | 'probing' | 'saving' | 'done' | 'error' | 'skip';
export type BulkEntry  = { chapter: number; folderId: string; status: BulkStatus; pages: number; pattern: string; error?: string };

export type VerifyStatus = 'idle' | 'probing' | 'ok' | 'different' | 'error' | 'no-url';
export type VerifyEntry  = {
  chapter: number;
  baseUrl: string;
  currentCount: number;
  ext: string;
  status: VerifyStatus;
  detectedCount?: number;
  detectedPattern?: string;
  detectedPages?: string[];
  errorMsg?: string;
};

export type ReportRow = {
  id: number;
  type: string;
  userId: string | null;
  mangaId: string | null;
  chapter: number | null;
  reason: string | null;
  description: string | null;
  status: string;
  createdAt: string;
};

export interface SharedTabProps {
  mangas: Manga[];
  setMangas: React.Dispatch<React.SetStateAction<Manga[]>>;
  notify: (type: 'ok' | 'err', msg: string) => void;
}

export const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'manga',        label: 'Añadir Manga',    icon: 'fas fa-book'        },
  { id: 'chapter',      label: 'Añadir Capítulo', icon: 'fas fa-plus-circle' },
  { id: 'bulk',         label: 'Carga Masiva',     icon: 'fas fa-layer-group' },
  { id: 'autodiscover', label: 'Auto-Descubrir',   icon: 'fas fa-bolt'        },
  { id: 'sources',      label: 'Automático',       icon: 'fas fa-robot'       },
  { id: 'verify',       label: 'Verificar Caps',   icon: 'fas fa-shield-alt'  },
  { id: 'edit-manga',   label: 'Editar Manga',     icon: 'fas fa-pen'         },
  { id: 'edit-chapter', label: 'Editar Capítulo',  icon: 'fas fa-edit'        },
  { id: 'delete',       label: 'Eliminar',         icon: 'fas fa-trash-alt'   },
  { id: 'reports',      label: 'Reportes',         icon: 'fas fa-flag'        },
];
