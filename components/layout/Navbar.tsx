import Link from 'next/link';
import Image from 'next/image';
import SearchBar from '@/components/ui/SearchBar';
import { getAllMangas } from '@/lib/data';

export default async function Navbar() {
  const mangas = await getAllMangas();

  return (
    <nav className="alpha" role="navigation" aria-label="Navegación principal">
      <div className="logo">
        <Link href="/" aria-label="Ir a inicio">
          <Image
            src="/img/logo.gif"
            alt="Grandiel Scan Logo"
            width={120}
            height={50}
            unoptimized
            priority
          />
        </Link>
      </div>

      <ul className="list">
        <li>
          <Link href="/mangas">
            <span>Mangas</span>
          </Link>
        </li>
        <li>
          <Link href="/actualizaciones">
            <span>Actualizaciones</span>
          </Link>
        </li>
        <li>
          <Link href="/nuevos">
            <span>Nuevos</span>
          </Link>
        </li>
      </ul>

      <SearchBar mangas={mangas} />
    </nav>
  );
}
