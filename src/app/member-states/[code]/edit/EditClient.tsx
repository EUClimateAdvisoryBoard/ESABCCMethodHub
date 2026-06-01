'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import CountryProfileEditor from '@/components/member-states/CountryProfileEditor';
import { cpApi } from '@/lib/country-profiles/client';
import type { CountryProfile } from '@/data/country-profiles/_types';

export default function EditClient({ profile }: { profile: CountryProfile }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);

  return (
    <>
      {saved && (
        <div className="bg-green-50 border border-green-200 text-green-900 text-[12px] rounded-md p-3 mb-3">
          Saved. <button className="underline" onClick={() => router.push(`/member-states/${profile.code}`)}>Open the updated profile →</button>
        </div>
      )}
      <CountryProfileEditor
        profile={profile}
        submitLabel="Save changes"
        showContributorFields={false}
        onSubmit={async ({ patch, contributorName, message }) => {
          await cpApi.saveProfile(profile.code, patch, { contributorName, message });
          setSaved(true);
          router.refresh();
        }}
      />
    </>
  );
}
