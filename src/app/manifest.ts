import type { MetadataRoute } from 'next'

// Lets students install Nudge on their home screen like an app
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Nudge — Class 10 Study Buddy',
    short_name: 'Nudge',
    description: 'Class 10 ASSEB (SEBA) study buddy: ask doubts in Assamese or English, practise book questions and past papers.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f9fafb',
    theme_color: '#15803d',
    lang: 'as',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
