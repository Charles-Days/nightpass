import { Suspense } from 'react';
import { SignupSplit } from './_components/signup-split';

export const metadata = { title: 'Crear cuenta — NightPass' };

export default function CustomerSignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupSplit />
    </Suspense>
  );
}
