import { Helmet } from "react-helmet";

interface SEOHeadProps {
  title: string;
  description: string;
  ogImage?: string;
  url?: string;
}

export function SEOHead({ title, description, ogImage, url }: SEOHeadProps) {
  const fullTitle = `${title} | FuturaHire`;
  const siteUrl = url || window.location.href;
  const defaultImage = ogImage || "/og-default.jpg";

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      
      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={defaultImage} />
      <meta property="og:url" content={siteUrl} />
      <meta property="og:type" content="website" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={defaultImage} />
      
      {/* Additional SEO */}
      <link rel="canonical" href={siteUrl} />
    </Helmet>
  );
}
