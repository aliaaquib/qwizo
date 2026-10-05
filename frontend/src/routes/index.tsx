import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute, GuestRoute } from './guards';
import { AppShell } from '@/components/AppShell';
import { Login } from '@/pages/Login';
import { Signup } from '@/pages/Signup';
import { Dashboard } from '@/pages/Dashboard';
import { QuizList } from '@/pages/QuizList';
import { QuizNew } from '@/pages/QuizNew';
import { QuizEditor } from '@/pages/QuizEditor';
import { QuizPreview } from '@/pages/QuizPreview';
import { QuizResults } from '@/pages/QuizResults';
import { QuestionBank } from '@/pages/QuestionBank';
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
        path: '/app',
        element: <AppShell />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'quizzes', element: <QuizList /> },
          { path: 'quizzes/new', element: <QuizNew /> },
          { path: 'quizzes/:id', element: <QuizEditor /> },
          { path: 'quizzes/:id/edit', element: <QuizEditor /> },
          { path: 'quizzes/:id/preview', element: <QuizPreview /> },
          { path: 'quizzes/:id/results', element: <QuizResults /> },
          { path: 'question-bank', element: <QuestionBank /> },
          { path: 'settings', element: <Settings /> },
        ],
      },
    ],
  },
  // Student (public)
  { path: '/join/:code', element: <JoinQuiz /> },
  { path: '/quiz/:id', element: <TakeQuiz /> },
  { path: '/quiz/:id/results', element: <StudentResult /> },
  // Fallbacks
  { path: '/', element: <Navigate to="/app" replace /> },
  { path: '*', element: <Navigate to="/app" replace /> },
]);
