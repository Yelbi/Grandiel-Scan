import { permanentRedirect } from 'next/navigation';

export default function NuevosPage() {
  permanentRedirect('/actualizaciones');
}

export const dynamic = 'force-static';
