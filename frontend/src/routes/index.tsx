import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute, GuestRoute, OnboardingGuard } from './guards';
import { AppShell } from '@/components/AppShell';
import { Landing } from '@/pages/Landing';
import { Login } from '@/pages/Login';
import { Signup } from '@/pages/Signup';
import { Dashboard } from '@/pages/Dashboard';
import { QuizList } from '@/pages/QuizList';
import { QuizNew } from '@/pages/QuizNew';
import { AiCreate } from '@/pages/AiCreate';
import { QuizEditor } from '@/pages/QuizEditor';
import { QuizPreview } from '@/pages/QuizPreview';
import { ShareQuiz } from '@/pages/ShareQuiz';
import { QuizResults } from '@/pages/QuizResults';
import { QuestionBank } from '@/pages/QuestionBank';
import { Templates } from '@/pages/Templates';
import { Onboarding } from '@/pages/Onboarding';
import { Settings } from '@/pages/Settings';
import { JoinQuiz } from '@/pages/JoinQuiz';
import { TakeQuiz } from '@/pages/TakeQuiz';
import { StudentResult } from '@/pages/StudentResult';

// Route map mirrors the migration spec. Teacher routes are protected;
// student routes are public.
export const router = createBrowserRouter([
  // Auth (guest only)
  {
    element: <GuestRoute />,
    children: [
      { path: '/login', element: <Login /> },
      { path: '/signup', element: <Signup /> },
    ],
  },
  // Teacher app (protected)
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <OnboardingGuard />,
        children: [
      {
        path: '/app',
        element: <AppShell />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'quizzes', element: <QuizList /> },
          { path: 'quizzes/new', element: <QuizNew /> },
          { path: 'quizzes/new/ai', element: <AiCreate mode="prompt" /> },
          { path: 'quizzes/new/ai-upload', element: <AiCreate mode="upload" /> },
          { path: 'quizzes/:id', element: <QuizEditor /> },
          { path: 'quizzes/:id/edit', element: <QuizEditor /> },
          { path: 'quizzes/:id/preview', element: <QuizPreview /> },
          { path: 'quizzes/:id/share', element: <ShareQuiz /> },
          { path: 'quizzes/:id/results', element: <QuizResults /> },
          { path: 'question-bank', element: <QuestionBank /> },
          { path: 'templates', element: <Templates /> },
          { path: 'settings', element: <Settings /> },
        ],
      },
      {
        path: '/app/onboarding',
        element: <Onboarding />,
      },
        ],
      },
    ],
  },
  // Student (public). The share link contract is /q/:code (printed QR codes,
  // shared links, result bookmarks) — served by the SPA on production.
  { path: '/join', element: <JoinQuiz /> },
  { path: '/join/:code', element: <JoinQuiz /> },
  { path: '/q/:code', element: <TakeQuiz /> },
  { path: '/q/:code/r/:token', element: <StudentResult /> },
  // Fallbacks
  { path: '/', element: <Landing /> },
  { path: '*', element: <Navigate to="/" replace /> },
]);
