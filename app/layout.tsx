import './globals.css';import type {Metadata} from 'next';import {Shell} from '@/components/layout';import {OperationsProvider} from '@/components/operations-provider';
export const metadata:Metadata={title:'Inco-Source Operations Portal',description:'Interne kennisbank voor SOP’s en processen'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="nl"><body><OperationsProvider><Shell>{children}</Shell></OperationsProvider></body></html>}
