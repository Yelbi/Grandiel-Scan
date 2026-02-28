'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useUserProfile } from '@/components/providers/UserProfileProvider';
import UserModal from '@/components/user/UserModal';

export default function UserButton() {
  const { profile, isLoggedIn } = useUserProfile();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="user-nav-btn"
        onClick={() => setModalOpen(true)}
        aria-label={isLoggedIn ? `Perfil de ${profile!.username}` : 'Crear cuenta / Ingresar'}
      >
        {isLoggedIn ? (
          <>
            <Image
              src={profile!.avatar}
              alt="Tu avatar"
              width={28}
              height={28}
              className="user-avatar-small"
              unoptimized
            />
            <span>{profile!.username}</span>
          </>
        ) : (
          <>
            <i className="fas fa-user-circle" aria-hidden="true" />
            <span>Ingresar</span>
          </>
        )}
      </button>

      {modalOpen && <UserModal onClose={() => setModalOpen(false)} />}
    </>
  );
}
