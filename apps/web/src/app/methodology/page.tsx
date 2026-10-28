'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MethodologyPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="p-12 text-center text-slate-500 text-sm">
      Redirecting to Home...
    </div>
  );
}
