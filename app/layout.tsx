import './globals.css';
import type {Metadata, Viewport} from 'next';
import {Shell} from '@/components/layout';
import {OperationsProvider} from '@/components/operations-provider';
import {getServerPortalSession} from '@/lib/auth-server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: {default: 'Inco-Source Operations Hub', template: '%s · Inco-Source'},
  description: 'Beveiligde interne operationsportal voor planning, zendingen, voorraad, ordervrijgave en SOP’s.',
  applicationName: 'Inco-Source Operations Hub',
  robots: {index: false, follow: false, nocache: true, googleBot: {index: false, follow: false, noimageindex: true}},
  referrer: 'no-referrer',
  icons: {icon: '/icon.svg', apple: '/brand/inco-source-logo.png'},
  manifest: '/manifest.webmanifest',
};
export const viewport: Viewport = {width: 'device-width', initialScale: 1, themeColor: '#102a43', colorScheme: 'light'};

export default async function RootLayout({children}: {children: React.ReactNode}) {
  const session = await getServerPortalSession();
  return <html lang="nl" data-scroll-behavior="smooth"><body><OperationsProvider session={session}><Shell>{children}</Shell></OperationsProvider></body></html>;
}
