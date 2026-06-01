'use client';
import { useState } from 'react';
import CountryProfileEditor from '@/components/member-states/CountryProfileEditor';
import { cpApi } from '@/lib/country-profiles/client';
import type { CountryProfile } from '@/data/country-profiles/_types';

interface Props {
  profile: CountryProfile;
  token: string;
  allowedSections?: string[];
  contributorName?: string;
}

export default function ContributeClient({
  profile, token, allowedSections, contributorName,
}: Props) {
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-md p-6 text-center">
        <h2 className="text-base font-bold text-green-900 mb-1">Thank you — your submission was received.</h2>
        <p className="text-[13px] text-green-900/90">
          The ESABCC Secretariat will review your input. Once approved, it will appear
          on the public profile page for {profile.name}.
        </p>
      </div>
    );
  }

  return (
    <CountryProfileEditor
      profile={profile}
      allowedSections={allowedSections}
      contributorName={contributorName}
      submitLabel="Submit for review"
      showContributorFields
      onSubmit={async ({ patch, contributorName: name, contributorEmail, message }) => {
        await cpApi.submitExternal({
          token,
          contributorName: name,
          contributorEmail,
          message,
          patch,
        });
        setDone(true);
      }}
    />
  );
}
