import { Link } from 'react-router-dom';
import { PageHead } from '@/components/shared';

// Playground — experiment with Qwizo's AI creation tools.

const TOOLS = [
  {
    to: '/app/quizzes/new/ai',
    title: 'Generate from a prompt',
    body: 'Describe your quiz — topic, level, question types — and Qwizo drafts the questions.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z" />
        <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9Z" />
      </svg>
    ),
  },
  {
    to: '/app/quizzes/new/ai-upload',
    title: 'Generate from a document',
    body: 'Upload notes, slides, or a PDF and Qwizo builds a quiz from your material.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M12 16V4" /><path d="M6 10l6-6 6 6" />
        <path d="M4 20h16" />
      </svg>
    ),
  },
  {
    to: '/app/question-bank',
    title: 'Question bank',
    body: 'Browse, reuse, and remix your saved questions across quizzes.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3Z" />
        <path d="M4 7v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7" />
        <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
      </svg>
    ),
  },
];

export function Playground() {
  return (
    <div>
      <PageHead
        title="Playground"
        subtitle="Experiment with AI-powered creation tools."
      />
      <div className="grid md:grid-cols-3 gap-4">
        {TOOLS.map(t => (
          <Link
            key={t.to}
            to={t.to}
            className="group bg-paper border border-line rounded-card p-6
              transition-all duration-180 hover:border-lime hover:shadow-soft hover:-translate-y-0.5
              focus-visible:outline-2 focus-visible:outline-lime"
          >
            <span className="w-12 h-12 rounded-2xl bg-lime/25 flex items-center justify-center text-ink mb-4
              group-hover:bg-lime transition-colors">
              {t.icon}
            </span>
            <h3 className="font-bold text-[16px] mb-1">{t.title}</h3>
            <p className="text-[14px] text-ink/55 leading-relaxed">{t.body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
