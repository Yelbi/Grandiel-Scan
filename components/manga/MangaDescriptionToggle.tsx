'use client';

import { useState } from 'react';

const COLLAPSE_AT = 220;

export default function MangaDescriptionToggle({ description }: { description: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = description.length > COLLAPSE_AT;
  const shown = isLong && !expanded
    ? description.slice(0, COLLAPSE_AT).trim() + '…'
    : description;

  return (
    <div className="manga-header__description">
      <p>{shown}</p>
      {isLong && (
        <button
          className="manga-description-toggle"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded
            ? <><i className="fas fa-chevron-up" aria-hidden="true" /> Ver menos</>
            : <><i className="fas fa-chevron-down" aria-hidden="true" /> Ver más</>
          }
        </button>
      )}
    </div>
  );
}
