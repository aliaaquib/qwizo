import { Link, Navigate } from 'react-router-dom';
import { Button, Card, Badge } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthContext';

// Qwizo homepage — follows DESIGN_SYSTEM.md permanently.
// 8-section structure. Product UI is the visual, never generic illustrations.
// No fake metrics, no invented stats.

const CONTAINER = 'max-w-[1280px] mx-auto px-8 md:px-12';

/* ---------------- 00 · Navigation ---------------- */

function Nav() {
  return (
    <div className="absolute top-0 inset-x-0 z-20">
      <div className={`${CONTAINER} pt-5`}>
        <nav className="bg-paper/90 backdrop-blur border border-line rounded-full shadow-soft px-6 h-14 flex items-center justify-between">
          <span className="text-[17px] font-semibold tracking-tight">Qwizo</span>
          <div className="hidden md:flex items-center gap-7 text-[15px] text-ink/70">
            <a href="#features" className="hover:text-ink transition-colors">Features</a>
            <a href="#how" className="hover:text-ink transition-colors">How it works</a>
            <a href="#results" className="hover:text-ink transition-colors">Results</a>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login" className="text-[15px] font-medium text-ink/70 hover:text-ink px-4 py-2 transition-colors">
              Log in
            </Link>
            <Link to="/signup">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </nav>
      </div>
    </div>
  );
}

/* ---------------- 01 · Hero ---------------- */

// Realistic Qwizo editor preview — the product is the visual.
function EditorPreview() {
  return (
    <Card className="overflow-hidden text-left">
      <div className="flex items-center justify-between px-6 py-4 border-b border-line">
        <div>
          <div className="font-medium">Linear Equations</div>
          <div className="text-[13px] text-ink/50">Mathematics · Year 8 · 15 questions · Draft</div>
        </div>
        <div className="flex gap-2">
          <span className="px-4 py-2 text-[13px] font-medium border border-line rounded-full">Preview</span>
          <span className="px-4 py-2 text-[13px] font-medium bg-ink text-white rounded-full">Share</span>
        </div>
      </div>
      <div className="px-6 py-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[13px] text-ink/50">Question 3 of 15</span>
          <Badge tone="lime">Multiple choice</Badge>
        </div>
        <p className="text-lg font-medium mb-4">Solve the equation: 3x + 5 = 20</p>
        <div className="space-y-2.5">
          {['x = 3', 'x = 5', 'x = 7', 'x = 9'].map((opt, i) => (
            <div
              key={opt}
              className={`flex items-center justify-between px-4 py-3 rounded-control border ${
                i === 1 ? 'border-lime bg-lime/20' : 'border-line'
              }`}
            >
              <span className="text-[15px]">{opt}</span>
              {i === 1 && <span className="text-[13px] font-medium text-ink/60">Correct</span>}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-line">
          <span className="text-[13px] text-ink/50">← Previous</span>
          <span className="text-[13px] font-medium">Next →</span>
        </div>
      </div>
    </Card>
  );
}

function Hero() {
  return (
    <section className="bg-sky pt-36 pb-24 md:pb-32 relative overflow-hidden">
      <div className={CONTAINER}>
        <div className="text-center max-w-3xl mx-auto">
          <div className="text-[13px] font-medium tracking-[0.18em] text-ink/50 mb-6">
            BUILT FOR TEACHERS
          </div>
          <h1 className="display text-5xl md:text-7xl mb-6">
            Create better quizzes.<br />In minutes, not hours.
          </h1>
          <p className="text-lg md:text-xl text-ink/65 max-w-xl mx-auto mb-9">
            Create, edit and share high-quality quizzes with AI — while keeping
            complete control over every question.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link to="/signup">
              <Button size="lg">Create a quiz →</Button>
            </Link>
            <a href="#how">
              <Button size="lg" variant="secondary">See how it works</Button>
            </a>
          </div>
        </div>
        <div className="max-w-3xl mx-auto mt-16 md:mt-20">
          <EditorPreview />
        </div>
      </div>
    </section>
  );
}

/* ---------------- 02 · Trust ---------------- */

function Trust() {
  return (
    <section className="py-24">
      <div className={`${CONTAINER} text-center`}>
        <p className="text-lg text-ink/60 max-w-xl mx-auto">
          Built for teachers who want more time to teach — and less time
          formatting quizzes.
        </p>
      </div>
    </section>
  );
}

/* ---------------- 03 · Problem ---------------- */

function Problem() {
  return (
    <section className="pb-28">
      <div className={`${CONTAINER} max-w-3xl`}>
        <h2 className="h-section text-4xl md:text-5xl mb-6">
          Creating a good quiz shouldn't take your entire evening.
        </h2>
        <p className="text-lg text-ink/65 leading-relaxed">
          Writing questions, balancing difficulty, formatting answer keys,
          building a shareable version for students — it adds up. Qwizo takes
          the repetitive work off your plate so you can focus on the part
          only you can do: knowing what your students need.
        </p>
      </div>
    </section>
  );
}

/* ---------------- 04 · AI quiz creation ---------------- */

function AiCreation() {
  const fields = [
    { label: 'Topic', value: 'Linear equations' },
    { label: 'Subject', value: 'Mathematics' },
    { label: 'Level', value: 'Year 8' },
    { label: 'Questions', value: '15' },
    { label: 'Difficulty', value: 'Medium' },
    { label: 'Types', value: 'Multiple choice · Short answer' },
  ];
  return (
    <section id="features" className="bg-sky/50 py-28">
      <div className={CONTAINER}>
        <div className="grid md:grid-cols-2 gap-14 items-center">
          <div>
            <div className="text-[13px] font-medium tracking-[0.18em] text-ink/50 mb-4">
              AI QUIZ CREATION
            </div>
            <h2 className="h-section text-4xl md:text-5xl mb-5">
              Describe it. Generate it. Teach it.
            </h2>
            <p className="text-lg text-ink/65 mb-8">
              Tell Qwizo the topic, subject, level and difficulty — or upload
              your own material. Get a full set of questions in seconds, ready
              for your review.
            </p>
            <Link to="/signup">
              <Button>Try the generator →</Button>
            </Link>
          </div>
          <Card className="p-7">
            <div className="text-[15px] font-medium mb-5">Generate a quiz</div>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {fields.map(f => (
                <div key={f.label} className="bg-neutral rounded-control px-4 py-3">
                  <div className="text-[12px] text-ink/45 mb-0.5">{f.label}</div>
                  <div className="text-[14px] font-medium">{f.value}</div>
                </div>
              ))}
            </div>
            <div className="bg-ink text-white text-center font-medium rounded-full py-3.5">
              Generate quiz
            </div>
            <p className="text-[13px] text-ink/50 text-center mt-4">
              Free for teachers. Your first AI quiz takes about 30 seconds.
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
}

/* ---------------- 05 · Teacher control ---------------- */

function TeacherControl() {
  const controls = [
    'Edit', 'Reorder', 'Duplicate', 'Delete',
    'Change answers', 'Change marks', 'Add explanations', 'Adjust difficulty',
  ];
  return (
    <section className="py-28">
      <div className={CONTAINER}>
        <div className="max-w-3xl">
          <div className="text-[13px] font-medium tracking-[0.18em] text-ink/50 mb-4">
            TEACHER CONTROL
          </div>
          <h2 className="h-section text-4xl md:text-5xl mb-5">
            AI does the first draft. You make it yours.
          </h2>
          <p className="text-lg text-ink/65 mb-10">
            Nothing is published without your review. Every question, answer
            and mark stays editable — because you know your students better
            than any model.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {controls.map((c, i) => (
            <span
              key={c}
              className={`px-5 py-3 rounded-full text-[15px] font-medium border ${
                i === 0 ? 'bg-lime border-lime' : 'bg-paper border-line'
              }`}
            >
              {c}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- 06 · Share ---------------- */

function Share() {
  return (
    <section className="bg-neutral py-28">
      <div className={CONTAINER}>
        <div className="grid md:grid-cols-2 gap-14 items-center">
          <Card className="p-7 order-2 md:order-1">
            <div className="text-[15px] font-medium mb-5">Share "Linear Equations"</div>
            <div className="flex items-center justify-between bg-neutral rounded-control px-5 py-4 mb-3">
              <span className="font-mono text-lg tracking-widest">BKCJ-8575</span>
              <span className="text-[13px] font-medium text-ink/60">Copy code</span>
            </div>
            <div className="flex gap-3">
              <div className="flex-1 text-center border border-line rounded-control py-3 text-[14px] font-medium">
                Copy link
              </div>
              <div className="flex-1 text-center border border-line rounded-control py-3 text-[14px] font-medium">
                QR code
              </div>
            </div>
            <p className="text-[13px] text-ink/50 text-center mt-4">
              Students join from any device — no account needed.
            </p>
          </Card>
          <div className="order-1 md:order-2">
            <div className="text-[13px] font-medium tracking-[0.18em] text-ink/50 mb-4">
              SHARE
            </div>
            <h2 className="h-section text-4xl md:text-5xl mb-5">
              Publish → share code → students join.
            </h2>
            <p className="text-lg text-ink/65">
              One click to publish. Share a short code, a link, or a QR code.
              Students start in seconds — no sign-up, no friction.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- 07 · Results ---------------- */

function Results() {
  const rows = [
    { q: 'Q1 · Solve 2x = 10', pct: 92 },
    { q: 'Q2 · Graph y = 3x + 1', pct: 74 },
    { q: 'Q3 · 3x + 5 = 20', pct: 61 },
  ];
  return (
    <section id="results" className="py-28">
      <div className={CONTAINER}>
        <div className="grid md:grid-cols-2 gap-14 items-center">
          <div>
            <div className="text-[13px] font-medium tracking-[0.18em] text-ink/50 mb-4">
              RESULTS
            </div>
            <h2 className="h-section text-4xl md:text-5xl mb-5">
              See what landed — and what didn't.
            </h2>
            <p className="text-lg text-ink/65 mb-8">
              Scores, completion and per-question accuracy the moment students
              submit. Spot the hardest questions and reteach with confidence.
            </p>
            <div className="flex gap-8">
              <div>
                <div className="display text-4xl">78%</div>
                <div className="text-[13px] text-ink/50 mt-1">Average score</div>
              </div>
              <div>
                <div className="display text-4xl">24/26</div>
                <div className="text-[13px] text-ink/50 mt-1">Completed</div>
              </div>
            </div>
          </div>
          <Card className="p-7">
            <div className="text-[15px] font-medium mb-5">Question accuracy</div>
            <div className="space-y-4">
              {rows.map(r => (
                <div key={r.q}>
                  <div className="flex justify-between text-[14px] mb-1.5">
                    <span className="text-ink/70">{r.q}</span>
                    <span className="font-medium">{r.pct}%</span>
                  </div>
                  <div className="h-2 bg-neutral rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${r.pct < 70 ? 'bg-lime' : 'bg-ink/70'}`}
                      style={{ width: `${r.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

/* ---------------- 08 · Final CTA ---------------- */

function FinalCta() {
  return (
    <section className="pb-28">
      <div className={CONTAINER}>
        <div className="bg-ink text-white rounded-surface px-8 py-20 md:py-24 text-center relative overflow-hidden">
          <div className="absolute top-8 right-10 w-16 h-16 bg-lime rounded-2xl rotate-12 opacity-90 hidden md:block" />
          <div className="absolute bottom-10 left-12 w-10 h-10 bg-lime rounded-xl -rotate-12 opacity-60 hidden md:block" />
          <h2 className="h-section text-4xl md:text-6xl mb-5 relative">
            Your next quiz is closer<br />than you think.
          </h2>
          <p className="text-lg text-white/60 mb-9 relative">
            Free for teachers. Your first quiz takes minutes.
          </p>
          <Link to="/signup" className="relative">
            <Button variant="accent" size="lg">Create your first quiz →</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Footer ---------------- */

function Footer() {
  return (
    <footer className="border-t border-line">
      <div className={`${CONTAINER} py-10 flex items-center justify-between`}>
        <span className="font-semibold tracking-tight">Qwizo</span>
        <div className="flex items-center gap-6 text-[15px] text-ink/60">
          <a href="#features" className="hover:text-ink transition-colors">Features</a>
          <a href="#how" className="hover:text-ink transition-colors">How it works</a>
          <Link to="/login" className="hover:text-ink transition-colors">Log in</Link>
          <Link to="/signup" className="hover:text-ink transition-colors">Sign up</Link>
        </div>
      </div>
    </footer>
  );
}

/* ---------------- Page ---------------- */

export function Landing() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/app" replace />;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Nav />
      <Hero />
      <Trust />
      <Problem />
      <AiCreation />
      <TeacherControl />
      <Share />
      <Results />
      <div id="how" />
      <FinalCta />
      <Footer />
    </div>
  );
}
