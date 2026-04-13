export function JsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: 'Wealth & Wellness Connect — 2ª Edição',
    description:
      'Evento exclusivo para 40 CEOs e executivos sobre saúde baseada em dados, wearables, biohacking e alta performance.',
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    organizer: {
      '@type': 'Organization',
      name: 'UWell Health Club',
    },
    previousStartDate: '2026-03-13T15:45:00-03:00',
    offers: {
      '@type': 'Offer',
      availability: 'https://schema.org/PreOrder',
      description: 'Lista de interesse para 2ª edição',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
