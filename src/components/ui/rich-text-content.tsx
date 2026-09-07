import DOMPurify from 'isomorphic-dompurify';

export function RichTextContent({ html, className = '' }: { html: string; className?: string }): React.ReactNode {
  const clean = DOMPurify.sanitize(html);
  return <div className={`prose prose-sm dark:prose-invert max-w-none ${className}`} dangerouslySetInnerHTML={{ __html: clean }} />;
}
