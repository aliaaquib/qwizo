import { test, expect } from '@playwright/test';

// Question bank reuse + join-by-code, against the real local stack.
// Teacher: signup → quiz with MCQ → save to bank → bank adds copy to a
// second draft → publish → student joins via /join with the code.

test('bank reuse and join by code', async ({ browser }) => {
  const teacher = await browser.newContext();
  const page = await teacher.newPage();
  const stamp = Date.now();
  const email = `e2e-bank-${stamp}@qwizo.local`;

  await page.goto('/signup');
  await page.getByPlaceholder('Aiza Toktogulova').fill('E2E Teacher');
  await page.getByPlaceholder('you@school.edu').fill(email);
  await page.getByPlaceholder('At least 8 characters').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/app/, { timeout: 15_000 });

  // quiz A with one MCQ
  await page.goto('/app/quizzes/new');
  await page.getByRole('button', { name: 'Blank quiz' }).click();
  await expect(page).toHaveURL(/\/app\/quizzes\/(?!new$)[^/]+$/, { timeout: 15_000 });
  const quizA = page.url().split('/app/quizzes/')[1];
  await page.getByLabel('Quiz title').fill('Bank source quiz');
  await page.getByRole('button', { name: '+ Multiple choice' }).click();
  const card = page.locator('[data-qcard]').last();
  await card.locator('textarea').first().fill('Banked question?');
  await card.getByPlaceholder('Option 1').fill('Yes');
  await card.getByPlaceholder('Option 2').fill('No');
  await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 15_000 });

  // save to bank
  await card.getByLabel('Save to question bank').click();
  await expect(page.getByText('Saved to question bank.')).toBeVisible({ timeout: 15_000 });

  // quiz B (draft destination)
  await page.goto('/app/quizzes/new');
  await page.getByRole('button', { name: 'Blank quiz' }).click();
  await expect(page).toHaveURL(/\/app\/quizzes\/(?!new$)[^/]+$/, { timeout: 15_000 });
  const quizB = page.url().split('/app/quizzes/')[1];
  await page.getByLabel('Quiz title').fill('Bank dest quiz');
  await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 15_000 });

  // bank → add to quiz B
  await page.goto('/app/question-bank');
  await expect(page.getByText('Banked question?')).toBeVisible({ timeout: 15_000 });
  await page.getByLabel('Add to a quiz').first().click();
  await expect(page.getByText('Add to quiz')).toBeVisible();
  await page.getByRole('button', { name: 'Add question' }).click();
  await expect(page.getByText('Added to quiz.')).toBeVisible({ timeout: 15_000 });

  // quiz B now has the copied question; publish it
  await page.goto(`/app/quizzes/${quizB}`);
  await expect(page.getByText('Banked question?')).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page).toHaveURL(/\/share$/, { timeout: 15_000 });
  const code = (await page.getByText(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/).textContent())?.trim();
  expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);

  // student joins by code via /join (no account)
  const student = await browser.newContext();
  const sp = await student.newPage();
  await sp.goto('/join');
  await sp.getByLabel('Quiz code').fill(code!);
  await sp.getByRole('button', { name: 'Join quiz' }).click();
  await expect(sp).toHaveURL(new RegExp(`/q/${code}$`));
  await expect(sp.getByText('Bank dest quiz')).toBeVisible({ timeout: 15_000 });
  await student.close();

  // bank original untouched by the quiz copy
  await page.goto('/app/question-bank');
  await expect(page.getByText('Banked question?')).toBeVisible({ timeout: 15_000 });

  await teacher.close();
  expect(quizA).toBeTruthy();
});
