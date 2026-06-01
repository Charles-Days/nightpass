'use client';

import dynamic from 'next/dynamic';

// El DemoDialog arrastra ~670 líneas + 18 iconos + lógica de audio.
// Lo cargamos diferido (ssr:false) para sacarlo del chunk inicial del landing.
// El propio DemoDialog ya gestiona su trigger y solo monta el overlay al abrir.
const DemoDialog = dynamic(() => import('./demo-dialog').then((m) => m.DemoDialog), {
  ssr: false,
});

export function DemoDialogLazy() {
  return <DemoDialog />;
}
