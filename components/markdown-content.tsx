import type {ReactNode} from 'react';

function InlineText({text}: {text: string}) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={index} className="rounded bg-slate-100 px-1 py-0.5 text-[.92em] text-slate-800">{part.slice(1, -1)}</code>;
    }
    return <span key={index}>{part}</span>;
  });
}

export function MarkdownContent({content}: {content: string}) {
  const rendered: ReactNode[] = [];
  const lines = content.replace(/\r/g, '').split('\n');

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) {
      rendered.push(<div key={`space-${index}`} className="h-2" aria-hidden="true" />);
      return;
    }
    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      rendered.push(<p key={index} className="mt-2 font-bold text-slate-900"><InlineText text={heading[1]} /></p>);
      return;
    }
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      rendered.push(<div key={index} className="flex gap-2 pl-1"><span aria-hidden="true" className="text-slate-400">•</span><p><InlineText text={bullet[1]} /></p></div>);
      return;
    }
    const numbered = line.match(/^(\d+)\.\s+(.+)$/);
    if (numbered) {
      rendered.push(<div key={index} className="flex gap-2 pl-1"><span className="min-w-5 font-semibold text-slate-500">{numbered[1]}.</span><p><InlineText text={numbered[2]} /></p></div>);
      return;
    }
    rendered.push(<p key={index}><InlineText text={line} /></p>);
  });

  return <div className="space-y-1">{rendered}</div>;
}
