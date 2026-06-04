import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Renderiza la descripción de un evento como Markdown (negrita, cursiva,
 * títulos, listas, citas, links) con el estilo dark de NightPass.
 *
 * Seguridad: react-markdown NO renderiza HTML crudo por defecto (no usamos
 * rehype-raw), así que no hay riesgo de XSS aunque el texto venga de un
 * organizador. Los links se fuerzan a abrir en pestaña nueva con rel seguro y
 * react-markdown ya bloquea protocolos peligrosos (javascript:).
 */
export function EventDescription({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h2 className="mt-4 mb-2 font-display text-xl font-bold text-white first:mt-0">
              {children}
            </h2>
          ),
          h2: ({ children }) => (
            <h3 className="mt-4 mb-2 font-display text-lg font-bold text-white first:mt-0">
              {children}
            </h3>
          ),
          h3: ({ children }) => (
            <h4 className="mt-3 mb-1.5 font-display text-base font-semibold text-white first:mt-0">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="mb-3 text-sm leading-relaxed text-muted-foreground last:mb-0">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => (
            <ul className="mb-3 ml-1 space-y-1 text-sm text-muted-foreground last:mb-0">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 ml-5 list-decimal space-y-1 text-sm text-muted-foreground last:mb-0">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="flex gap-2 [ol_&]:list-item [ol_&]:gap-0">
              <span className="mt-2 hidden size-1 shrink-0 rounded-full bg-primary/60 [ul_&]:block" />
              <span className="min-w-0 flex-1">{children}</span>
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mb-3 border-l-2 border-primary/50 pl-3 text-sm italic text-white/80 last:mb-0">
              {children}
            </blockquote>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="font-medium text-primary underline underline-offset-2 hover:text-primary/80"
            >
              {children}
            </a>
          ),
          hr: () => <hr className="my-4 border-white/10" />,
          code: ({ children }) => (
            <code className="rounded bg-white/[0.08] px-1 py-0.5 text-xs text-foreground">
              {children}
            </code>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
