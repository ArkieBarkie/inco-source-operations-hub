'use client';

export default function GlobalError({reset}: {error: Error & {digest?: string}; reset: () => void}) {
  return <html lang="nl"><body><main style={{fontFamily: 'system-ui', padding: 32, maxWidth: 720, margin: '0 auto'}}><h1>De portal kon niet veilig starten</h1><p>Er zijn geen gegevens gewijzigd. Probeer opnieuw of neem contact op met de beheerder.</p><button onClick={reset} style={{padding: '12px 18px'}}>Opnieuw proberen</button></main></body></html>;
}
