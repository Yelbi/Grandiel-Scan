import Link from 'next/link';
import Image from 'next/image';
import SearchBar from '@/components/ui/SearchBar';
import NavLinks from '@/components/layout/NavLinks';
import NavScrollObserver from '@/components/layout/NavScrollObserver';
import UserDropdown from '@/components/user/UserDropdown';
import { getAllMangas } from '@/lib/data';

export default async function Navbar() {
  const mangas = await getAllMangas();

  return (
    <nav id="main-nav" className="alpha" role="navigation" aria-label="Navegación principal">
      <NavScrollObserver />

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

      <NavLinks />

      <div className="nav-right">
        <SearchBar mangas={mangas} />
        <UserDropdown />
      </div>
    </nav>
  );
}
