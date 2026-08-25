import type {MetadataRoute} from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Inco-Source Operations Hub',
    short_name: 'Inco Hub',
    description: 'Beveiligde interne operationsportal van Inco-Source.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f3f6f9',
    theme_color: '#102a43',
    icons: [{src: '/brand/inco-source-logo.png', sizes: 'any', type: 'image/png'}],
  };
}
