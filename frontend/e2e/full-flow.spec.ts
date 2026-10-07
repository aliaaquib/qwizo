import { test, expect } from '@playwright/test';

// Full teacher → student → results loop against the real local stack.
// Teacher: signup → blank quiz → add MCQ → publish → share code.
// Student (fresh context): /q/:code → name → answer → submit → result.
// Teacher: results page shows the submission.

test('teacher creates, publishes; student takes; teacher sees results', async ({ browser }) => {
  const teacher = await browser.newContext();
  const page = await teacher.newPage();
  const stamp = Date.now();
  const email = `e2e-${stamp}@qwizo.local`;

  // --- signup ---
  await page.goto('/signup');
  await page.getByPlaceholder('Aiza Toktogulova').fill('E2E Teacher');
  await page.getByPlaceholder('you@school.edu').fill(email);
  await page.getByPlaceholder('At least 8 characters').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/app\/onboarding/, { timeout: 15_000 });
  // complete onboarding: 4 steps
  await page.getByRole('button', { name: /K-12 School/ }).click(); // step 1
  await page.getByRole('button', { name: /^Teacher/ }).click(); // step 2
  await page.getByRole('button', { name: /High School/ }).click(); // step 3
  await page.getByRole('button', { name: 'Mathematics', exact: true }).click(); // step 4
  await page.getByRole('button', { name: 'Finish' }).click();
  await page.waitForURL('**/app', { timeout: 15_000 });

  // --- blank quiz ---
  await page.goto('/app/quizzes/new');
  await page.getByRole('button', { name: 'Blank quiz' }).click();
  // (?!new) — /app/quizzes/new itself matches [^/]+, so exclude it
  await expect(page).toHaveURL(/\/app\/quizzes\/(?!new$)[^/]+$/, { timeout: 15_000 });
  const quizId = page.url().split('/app/quizzes/')[1];

  // --- title + one MCQ ---
  await page.getByLabel('Quiz title').fill('E2E Capitals');
  await page.getByRole('button', { name: '+ Multiple choice' }).click();
  const card = page.locator('[data-qcard]').last();
  await expect(card).toBeVisible();
  await card.locator('textarea').first().fill('What is 2+2?');
  await card.getByPlaceholder('Option 1').fill('4');
  await card.getByPlaceholder('Option 2').fill('3');

  // wait for debounced autosave to land
  await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 15_000 });

  // --- publish → share page ---
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page).toHaveURL(/\/share$/, { timeout: 15_000 });
  const code = (await page.getByText(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/).textContent())?.trim();
  expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);

  // --- student takes the quiz (no auth) ---
  const student = await browser.newContext();
  const sp = await student.newPage();
  await sp.goto(`/q/${code}`);
  await expect(sp.getByText('E2E Capitals')).toBeVisible({ timeout: 15_000 });
  await sp.getByLabel('Your name').fill('E2E Student');
  await sp.getByRole('button', { name: 'Start quiz' }).click();
  await expect(sp.getByText('What is 2+2?')).toBeVisible({ timeout: 15_000 });
  await sp.getByText('4', { exact: true }).click();
  await sp.getByRole('button', { name: 'Review & submit' }).click();
  await expect(sp.getByText('Submit quiz?')).toBeVisible();
  await sp.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(sp).toHaveURL(/\/r\//, { timeout: 15_000 });
  await expect(sp.getByText('SUBMITTED')).toBeVisible();
  await expect(sp.getByText('100%')).toBeVisible();
  await student.close();

  // --- teacher sees the submission ---
  await page.goto(`/app/quizzes/${quizId}/results`);
  await expect(page.getByText('E2E Student')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('1 submission')).toBeVisible();

  await teacher.close();
});
