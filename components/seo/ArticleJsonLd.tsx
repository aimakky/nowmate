interface Props {
  title: string
  description: string
  url: string
  datePublished?: string
}

export default function ArticleJsonLd({ title, description, url, datePublished = '2025-01-01' }: Props) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    url,
    datePublished,
    dateModified: new Date().toISOString().split('T')[0],
    author: { '@type': 'Organization', name: 'YVOICE', url: 'https://nowmatejapan.com' },
    publisher: {
      '@type': 'Organization',
      name: 'YVOICE',
      url: 'https://nowmatejapan.com',
      logo: { '@type': 'ImageObject', url: 'https://nowmatejapan.com/opengraph-image' },
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
