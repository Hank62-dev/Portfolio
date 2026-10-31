import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Each markdown element maps to design-system classes, so chat answers read like the rest of the app.
const components = {
  p: (props) => <p className="my-2 first:mt-0 last:mb-0" {...props} />,
  h1: (props) => <h3 className="mt-4 mb-2 font-display text-h3 text-bone" {...props} />,
  h2: (props) => <h3 className="mt-4 mb-2 font-display text-h3 text-bone" {...props} />,
  h3: (props) => <h4 className="mt-3 mb-1 font-medium text-bone" {...props} />,
  ul: (props) => <ul className="my-2 list-disc space-y-1 pl-5 marker:text-bone-faint" {...props} />,
  ol: (props) => <ol className="my-2 list-decimal space-y-1 pl-5 marker:text-bone-faint" {...props} />,
  a: (props) => (
    <a className="text-signal underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...props} />
  ),
  blockquote: (props) => <blockquote className="my-2 border-l-2 border-line-strong pl-3 text-bone-dim" {...props} />,
  pre: (props) => <pre className="my-2 overflow-x-auto rounded-sm border border-line bg-ink-0 p-3 text-fine" {...props} />,
  code: ({ className, ...props }) => (
    <code className={className || 'rounded-sm bg-ink-3 px-1 py-0.5 font-mono text-[0.9em]'} {...props} />
  ),
  table: (props) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-fine" {...props} />
    </div>
  ),
  th: (props) => <th className="border border-line bg-ink-2 px-2 py-1 text-left font-medium" {...props} />,
  td: (props) => <td className="border border-line px-2 py-1" {...props} />,
};

export default function Markdown({ children }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  );
}
