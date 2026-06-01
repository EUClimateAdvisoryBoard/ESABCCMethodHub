'use client';

/**
 * Action strip on top of /member-states/[code]: "Edit profile", "Invite
 * contributor" (opens share-link modal), "View submissions".
 */
import Link from 'next/link';
import { useState } from 'react';
import ShareLinkModal from '@/components/member-states/ShareLinkModal';

interface Props {
  countryCode: string;
  countryName: string;
}

export default function ProfileActions({ countryCode, countryName }: Props) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href={`/member-states/${countryCode}/edit`}
          className="text-[11px] px-3 py-1.5 rounded-md bg-primary text-white hover:bg-primary-dark"
        >
          Edit profile
        </Link>
        <button
          onClick={() => setShowModal(true)}
          className="text-[11px] px-3 py-1.5 rounded-md border border-primary text-primary hover:bg-primary/5"
        >
          Invite external contributor
        </button>
        <Link
          href={`/member-states/submissions?country=${countryCode}`}
          className="text-[11px] px-3 py-1.5 rounded-md border border-grey-200 text-tertiary-dark hover:bg-grey-50"
        >
          Submissions
        </Link>
      </div>
      {showModal && (
        <ShareLinkModal
          countryCode={countryCode}
          countryName={countryName}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
