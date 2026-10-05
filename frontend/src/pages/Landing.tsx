import { Link, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthContext';

// Public marketing landing page — mirrors the existing public/index.html
// content and minimal design. Teachers see what Qwizo is before signing up.

function Nav() {
  return (
    <header className="border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <span className="text-lg font-bold tracking-tight">Qwizo</span>
        <nav className="hidden md:flex items-center gap-8 text-sm text-gray-500">
          <a href="#features" className="hover:text-ink">Features</a>
          <a href="#how" className="hover:text-ink">How it works</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-ink">
            Log in
          </Link>
          <Link to="/signup">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
      <div className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-4">
        For teachers
      </div>
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
        Create better quizzes.<br />In minutes, not hours.
      </h1>
      <p className="text-gray-500 text-lg max-w-xl mx-auto mb-8">
        AI-powered quiz creation for teachers. Generate, edit and share
        high-quality quizzes for any subject, topic or level.
      </p>
      <div className="flex items-center justify-center gap-3">
        <Link to="/signup">
          <Button>Create with AI →</Button>
        </Link>
        <Link to="/signup">
          <Button variant="secondary">Create manually</Button>
        </Link>
      </div>
      <div className="flex items-center justify-center gap-6 mt-8 text-sm text-gray-400">
        <span>Save hours of prep time</span>
        <span>·</span>
        <span>Any subject or level</span>
        <span>·</span>
        <span>Fully editable</span>
      </div>
    </section>
  );
}

function Features() {
  const items = [
    { n: '01', title: 'Create with AI', body: 'Generate quizzes from a topic, curriculum or your own material.' },
    { n: '02', title: 'Edit and customise', body: 'Edit every question, adjust difficulty and add explanations.' },
    { n: '03', title: 'Share with students', body: 'Share using a link, code or QR code.' },
    { n: '04', title: 'View results', body: 'See scores, identify strengths and gaps, and track performance.' },
  ];
  return (
    <section id="features" className="bg-bg-soft py-20">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-2xl font-bold tracking-tight mb-2">Everything you need</h2>
        <p className="text-gray-500 mb-10 max-w-lg">
          A complete quiz creation tool for teachers. Simple, powerful tools to
          create, customise and share quizzes that work for your class.
        </p>
        <div className="grid md:grid-cols-4 gap-6">
          {items.map(i => (
            <div key={i.n} className="bg-white rounded-xl border border-gray-100 p-6">
              <div className="text-xs font-mono text-gray-300 mb-3">{i.n}</div>
              <h3 className="font-bold mb-1.5">{i.title}</h3>
              <p className="text-sm text-gray-500">{i.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AiSection() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-20">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight mb-3">AI quiz creation</h2>
          <p className="text-gray-500 mb-6">
            Turn any topic into a ready-to-edit quiz with AI. Describe what you
            need, choose your settings, and let AI generate high-quality
            questions in seconds.
          </p>
          <Link to="/signup">
            <Button>Try it now →</Button>
          </Link>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <div className="text-sm font-bold mb-4">Generate a quiz</div>
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-xs text-gray-400 mb-1">Topic</div>
              <div className="bg-bg-soft rounded-lg px-3 py-2.5 text-gray-600">
                Create a Year 8 Cambridge Mathematics quiz on linear equations.
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-gray-400 mb-1">Curriculum</div>
                <div className="bg-bg-soft rounded-lg px-3 py-2.5 text-gray-600">Cambridge</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Questions</div>
                <div className="bg-bg-soft rounded-lg px-3 py-2.5 text-gray-600">15</div>
              </div>
            </div>
            <div className="text-xs text-gray-400 pt-1">
              Free for teachers. Your first AI quiz takes about 30 seconds.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Benefits() {
  const items = [
    { title: 'Any subject or curriculum', body: 'From mathematics to history, at any level.' },
    { title: 'Multiple question types', body: 'Multiple choice, short answer and more.' },
    { title: 'Flexible and time-saving', body: 'Reuse, duplicate and adapt in seconds.' },
    { title: 'Insightful results', body: 'Spot strengths and gaps the moment results arrive.' },
  ];
  return (
    <section className="bg-bg-soft py-20">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-2xl font-bold tracking-tight mb-2">Designed for the way you work.</h2>
        <p className="text-gray-500 mb-10">Everything you need, nothing you don't.</p>
        <div className="grid md:grid-cols-4 gap-6">
          {items.map(i => (
            <div key={i.title}>
              <h3 className="font-bold mb-1.5 text-[15px]">{i.title}</h3>
              <p className="text-sm text-gray-500">{i.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: '01', title: 'Choose a topic', body: 'Pick any subject, level or curriculum you teach.' },
    { n: '02', title: 'Generate with AI', body: 'Get a full set of questions in seconds.' },
    { n: '03', title: 'Edit and refine', body: 'Tweak wording, difficulty and explanations.' },
    { n: '04', title: 'Share with students', body: 'Send a link, code or QR code to your class.' },
  ];
  return (
    <section id="how" className="max-w-6xl mx-auto px-6 py-20">
      <h2 className="text-2xl font-bold tracking-tight mb-10 text-center">
        Create and share a quiz in four simple steps.
      </h2>
      <div className="grid md:grid-cols-4 gap-6">
        {steps.map(s => (
          <div key={s.n} className="text-center">
            <div className="text-xs font-mono text-gray-300 mb-3">{s.n}</div>
            <h3 className="font-bold mb-1.5">{s.title}</h3>
            <p className="text-sm text-gray-500">{s.body}</p>
          </div>
        ))}
      </div>
      <div className="text-center mt-12">
        <Link to="/signup">
          <Button>Get started — it's free</Button>
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-gray-100">
      <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
        <span className="text-sm font-bold">Qwizo</span>
        <div className="flex items-center gap-6 text-sm text-gray-400">
          <Link to="/login" className="hover:text-ink">Log in</Link>
          <Link to="/signup" className="hover:text-ink">Sign up</Link>
        </div>
      </div>
    </footer>
  );
}

export function Landing() {
  const { user, loading } = useAuth();

  // Signed-in teachers go straight to the app.
  if (!loading && user) return <Navigate to="/app" replace />;

  return (
    <div className="min-h-screen bg-white text-ink">
      <Nav />
      <Hero />
      <Features />
      <AiSection />
      <Benefits />
      <HowItWorks />
      <Footer />
    </div>
  );
}
