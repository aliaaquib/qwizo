import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api/client';
import { useAuth } from '@/features/auth/AuthContext';
import { QwizoLogo } from '@/components/QwizoLogo';
import { Button } from '@/components/ui';
import { useToast } from '@/components/shared';

// Onboarding — 4-step wizard shown once right after signup.
// Step 1: org type · Step 2: job role · Step 3: specialization ·
// Step 4: subjects + grades. Same card design throughout.

interface CardOpt {
  id: string;
  title: string;
  sub: string;
  icon?: React.ReactNode;
}

const ICON_CLS = 'w-9 h-9';
function strokeIcon(paths: React.ReactNode) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" className={ICON_CLS}>
      {paths}
    </svg>
  );
}

const STEP1: CardOpt[] = [
  {
    id: 'k12', title: 'K-12 School', sub: 'Teachers and school staff',
    icon: strokeIcon(<><path d="M8 20 L24 10 L40 20" /><path d="M12 18 V38" /><path d="M36 18 V38" /><path d="M8 38 H40" /><path d="M24 26 V34" /></>),
  },
  {
    id: 'higher-ed', title: 'College / University', sub: 'Professors and lecturers',
    icon: strokeIcon(<><path d="M24 8 L42 16 L24 24 L6 16 Z" /><path d="M12 20 V32" /><path d="M36 20 V32" /><path d="M8 36 H40" /></>),
  },
  {
    id: 'tutor', title: 'Private Tutor', sub: 'Tutors and coaching centers',
    icon: strokeIcon(<><circle cx="24" cy="16" r="7" /><path d="M10 40 C10 31 16 27 24 27 C32 27 38 31 38 40" /></>),
  },
  {
    id: 'homeschool', title: 'Homeschool', sub: 'Parents and guardians',
    icon: strokeIcon(<><path d="M8 22 L24 10 L40 22" /><path d="M13 20 V38 H35 V20" /><path d="M21 38 V28 H27 V38" /></>),
  },
];

// Step 2: job role within the org type.
const STEP2: Record<string, CardOpt[]> = {
  k12: [
    { id: 'teacher', title: 'Teacher', sub: 'Classroom teacher' },
    { id: 'admin', title: 'School Administrator', sub: 'Principal, coordinator, head of department' },
    { id: 'assistant', title: 'Teaching Assistant', sub: 'Support classroom teaching' },
  ],
  'higher-ed': [
    { id: 'professor', title: 'Professor', sub: 'University professor' },
    { id: 'lecturer', title: 'Lecturer / Instructor', sub: 'College lecturer' },
    { id: 'ta', title: 'Teaching Assistant', sub: 'Graduate teaching assistant' },
  ],
  tutor: [
    { id: 'freelance', title: 'Freelance Tutor', sub: 'Independent tutor' },
    { id: 'center', title: 'Coaching Center Teacher', sub: 'Teach at a tutoring center' },
    { id: 'testprep', title: 'Test Prep Instructor', sub: 'Exam preparation courses' },
  ],
  homeschool: [
    { id: 'parent', title: 'Parent', sub: 'Homeschooling parent' },
    { id: 'guardian', title: 'Guardian', sub: 'Homeschooling guardian' },
  ],
  other: [
    { id: 'educator', title: 'Educator', sub: 'Education professional' },
    { id: 'admin', title: 'Administrator', sub: 'Admin or manager' },
  ],
};

// Step 3: specialization based on the job role.
const STEP3: Record<string, { question: string; options: CardOpt[] }> = {
  teacher: {
    question: 'Which level do you teach?',
    options: [
      { id: 'primary', title: 'Primary School', sub: 'Grades 1–4' },
      { id: 'middle', title: 'Middle School', sub: 'Grades 5–9' },
      { id: 'high', title: 'High School', sub: 'Grades 10–12' },
    ],
  },
  admin: {
    question: 'Which school level?',
    options: [
      { id: 'primary', title: 'Primary School', sub: 'Grades 1–4' },
      { id: 'middle', title: 'Middle School', sub: 'Grades 5–9' },
      { id: 'high', title: 'High School', sub: 'Grades 10–12' },
    ],
  },
  assistant: {
    question: 'Which level do you assist?',
    options: [
      { id: 'primary', title: 'Primary School', sub: 'Grades 1–4' },
      { id: 'middle', title: 'Middle School', sub: 'Grades 5–9' },
      { id: 'high', title: 'High School', sub: 'Grades 10–12' },
    ],
  },
  professor: {
    question: 'Which level do you teach?',
    options: [
      { id: 'undergrad', title: 'Undergraduate', sub: "Bachelor's programs" },
      { id: 'postgrad', title: 'Postgraduate', sub: "Master's and PhD programs" },
      { id: 'both', title: 'Both', sub: 'Undergraduate and postgraduate' },
    ],
  },
  lecturer: {
    question: 'Which level do you teach?',
    options: [
      { id: 'undergrad', title: 'Undergraduate', sub: "Bachelor's programs" },
      { id: 'postgrad', title: 'Postgraduate', sub: "Master's and PhD programs" },
      { id: 'both', title: 'Both', sub: 'Undergraduate and postgraduate' },
    ],
  },
  ta: {
    question: 'Which level do you assist?',
    options: [
      { id: 'undergrad', title: 'Undergraduate', sub: "Bachelor's programs" },
      { id: 'postgrad', title: 'Postgraduate', sub: "Master's and PhD programs" },
    ],
  },
  freelance: {
    question: 'How do you tutor?',
    options: [
      { id: 'online', title: 'Online', sub: 'Video calls and online platforms' },
      { id: 'inperson', title: 'In person', sub: 'Face-to-face sessions' },
      { id: 'both', title: 'Both', sub: 'Online and in person' },
    ],
  },
  center: {
    question: 'Which level do you teach?',
    options: [
      { id: 'primary', title: 'Primary School', sub: 'Grades 1–4' },
      { id: 'middle', title: 'Middle School', sub: 'Grades 5–9' },
      { id: 'high', title: 'High School', sub: 'Grades 10–12' },
    ],
  },
  testprep: {
    question: 'Which exams do you prepare students for?',
    options: [
      { id: 'sat', title: 'SAT / ACT', sub: 'US college admissions' },
      { id: 'gre', title: 'GRE / GMAT', sub: 'Graduate admissions' },
      { id: 'local', title: 'Local Exams', sub: 'National and regional exams' },
    ],
  },
  parent: {
    question: "Which level is your child?",
    options: [
      { id: 'primary', title: 'Primary School', sub: 'Grades 1–4' },
      { id: 'middle', title: 'Middle School', sub: 'Grades 5–9' },
      { id: 'high', title: 'High School', sub: 'Grades 10–12' },
    ],
  },
  guardian: {
    question: "Which level is the student?",
    options: [
      { id: 'primary', title: 'Primary School', sub: 'Grades 1–4' },
      { id: 'middle', title: 'Middle School', sub: 'Grades 5–9' },
      { id: 'high', title: 'High School', sub: 'Grades 10–12' },
    ],
  },
  educator: {
    question: 'Which level do you work with?',
    options: [
      { id: 'primary', title: 'Primary School', sub: 'Grades 1–4' },
      { id: 'middle', title: 'Middle School', sub: 'Grades 5–9' },
      { id: 'high', title: 'High School', sub: 'Grades 10–12' },
      { id: 'university', title: 'University', sub: 'Higher education' },
    ],
  },
};

const SUBJECTS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science',
  'English', 'Russian', 'Kyrgyz', 'Turkish', 'History', 'Geography',
  'Economics', 'Art', 'Music', 'Physical Education',
];

const GRADES = Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`);

const STEP_TITLES = [
  'How will you use Qwizo?',
  'What is your role?',
  '',
  'What do you teach?',
];
const STEP_SUBS = [
  "Tell us who you teach — we'll tailor your experience.",
  '',
  '',
  'Select your subjects and grades. You can change these later.',
];

export function Onboarding() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const { show, el: toastEl } = useToast();
  const [step, setStep] = useState(1);
  const [org, setOrg] = useState('');
  const [orgLabel, setOrgLabel] = useState('');
  const [job, setJob] = useState('');
  const [jobLabel, setJobLabel] = useState('');
  const [specLabel, setSpecLabel] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && user.onboarding_done) navigate('/app', { replace: true });
  }, [user, navigate]);

  const pickStep1 = (id: string, label: string) => {
    setOrg(id);
    setOrgLabel(label);
    setStep(2);
  };

  const pickStep2 = (id: string, label: string) => {
    setJob(id);
    setJobLabel(label);
    setStep(3);
  };

  const pickStep3 = (_id: string, label: string) => {
    setSpecLabel(label);
    setStep(4);
  };

  const toggle = (list: string[], v: string, set: (x: string[]) => void) => {
    set(list.includes(v) ? list.filter(x => x !== v) : [...list, v]);
  };

  const finish = async () => {
    setSaving(true);
    try {
      const d = await api.saveOnboarding({
        role: orgLabel,
        job_title: jobLabel,
        specialization: specLabel,
        subjects,
        grades,
      });
      setUser(d.user);
      navigate('/app', { replace: true });
    } catch (e) {
      show(e instanceof Error ? e.message : 'Could not save. Try again.', true);
      setSaving(false);
    }
  };

  const skipStep4 = async () => {
    setSaving(true);
    try {
      const d = await api.saveOnboarding({
        role: orgLabel,
        job_title: jobLabel,
        specialization: specLabel,
        subjects: [],
        grades: [],
      });
      setUser(d.user);
      navigate('/app', { replace: true });
    } catch (e) {
      show(e instanceof Error ? e.message : 'Could not save. Try again.', true);
      setSaving(false);
    }
  };

  const step3 = STEP3[job];

  return (
    <div className="min-h-screen bg-paper flex flex-col items-center px-6 py-10">
      <QwizoLogo badge badgeSize={44} />

      {/* progress */}
      <div className="flex gap-2 mt-8" aria-hidden="true">
        {[1, 2, 3, 4].map(n => (
          <span
            key={n}
            className={`h-1.5 w-10 rounded-full transition-colors ${n <= step ? 'bg-lime' : 'bg-line'}`}
          />
        ))}
      </div>

      <h1 className="mt-6 text-[28px] md:text-[32px] font-bold text-ink tracking-tight text-center">
        {step === 3 && step3 ? step3.question : STEP_TITLES[step - 1]}
      </h1>
      {(step === 1 || step === 4) && (
        <p className="mt-2 text-ink/60 text-[15px] text-center max-w-md">
          {STEP_SUBS[step - 1]}
        </p>
      )}
      {step === 2 && orgLabel && (
        <p className="mt-2 text-ink/60 text-[15px] text-center max-w-md">
          You selected <span className="font-medium text-ink">{orgLabel}</span>
        </p>
      )}
      {step === 3 && jobLabel && (
        <p className="mt-2 text-ink/60 text-[15px] text-center max-w-md">
          You are a <span className="font-medium text-ink">{jobLabel}</span>
        </p>
      )}

      <div className="w-full max-w-xl mt-8 flex flex-col gap-3">
        {step === 1 && STEP1.map(r => (
          <Card key={r.id} opt={r} onClick={() => pickStep1(r.id, r.title)} />
        ))}

        {step === 2 && (STEP2[org] || []).map(r => (
          <Card key={r.id} opt={r} onClick={() => pickStep2(r.id, r.title)} />
        ))}

        {step === 3 && step3 && step3.options.map(r => (
          <Card key={r.id} opt={r} onClick={() => pickStep3(r.id, r.title)} />
        ))}

        {step === 4 && (
          <>
            <p className="text-[14px] font-semibold text-ink mt-2">Subjects</p>
            <div className="flex flex-wrap gap-2">
              {SUBJECTS.map(s => (
                <Chip
                  key={s}
                  label={s}
                  active={subjects.includes(s)}
                  onClick={() => toggle(subjects, s, setSubjects)}
                />
              ))}
            </div>
            <p className="text-[14px] font-semibold text-ink mt-4">Grades</p>
            <div className="flex flex-wrap gap-2">
              {GRADES.map(g => (
                <Chip
                  key={g}
                  label={g}
                  active={grades.includes(g)}
                  onClick={() => toggle(grades, g, setGrades)}
                />
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <Button onClick={finish} disabled={saving} className="flex-1">
                {saving ? 'Saving…' : 'Finish'}
              </Button>
              <Button variant="secondary" onClick={skipStep4} disabled={saving}>
                Skip
              </Button>
            </div>
          </>
        )}
      </div>

      {step === 1 && (
        <button
          onClick={() => { setOrg('other'); setOrgLabel('Other'); setStep(2); }}
          className="mt-6 text-[15px] font-medium text-ink/55 hover:text-ink transition-colors
            focus-visible:outline-2 focus-visible:outline-lime rounded"
        >
          Other
        </button>
      )}

      {step > 1 && step < 4 && (
        <button
          onClick={() => setStep(step - 1)}
          className="mt-6 text-[15px] font-medium text-ink/55 hover:text-ink transition-colors
            focus-visible:outline-2 focus-visible:outline-lime rounded"
        >
          ← Back
        </button>
      )}
      {step === 4 && (
        <button
          onClick={() => setStep(3)}
          disabled={saving}
          className="mt-6 text-[15px] font-medium text-ink/55 hover:text-ink transition-colors
            focus-visible:outline-2 focus-visible:outline-lime rounded disabled:opacity-50"
        >
          ← Back
        </button>
      )}
      {toastEl}
    </div>
  );
}

function Card({ opt, onClick }: { opt: CardOpt; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-5 rounded-2xl border border-line bg-white px-6 py-5 text-left
        transition-all duration-180 hover:border-lime hover:shadow-soft hover:-translate-y-0.5
        focus-visible:outline-2 focus-visible:outline-lime"
    >
      {opt.icon && (
        <span className="text-ink/70 group-hover:text-ink transition-colors shrink-0">
          {opt.icon}
        </span>
      )}
      <span className="flex-1">
        <span className="block font-semibold text-ink text-[17px]">{opt.title}</span>
        <span className="block text-ink/55 text-[14px] mt-0.5">{opt.sub}</span>
      </span>
    </button>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-4 py-2 text-[14px] font-medium border transition-all
        focus-visible:outline-2 focus-visible:outline-lime ${
        active
          ? 'bg-lime border-lime text-ink'
          : 'bg-white border-line text-ink/70 hover:border-lime'
      }`}
    >
      {label}
    </button>
  );
}
