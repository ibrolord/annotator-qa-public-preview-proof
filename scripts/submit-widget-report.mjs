import { chromium } from '@playwright/test';

const targetUrl = process.env.PROOF_TARGET_URL;
if (!targetUrl) {
  throw new Error('PROOF_TARGET_URL is required.');
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });

let submittedReportId = '';
page.on('response', async (response) => {
  if (response.request().method() !== 'POST' || !/\/reports\b/.test(response.url()) || !response.ok()) return;
  try {
    const body = await response.json();
    if (body?.id) submittedReportId = body.id;
  } catch {
    // Ignore non-JSON responses.
  }
});

await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => Boolean(window.openAnnotatorProof), null, { timeout: 30000 });
await page.getByRole('button', { name: 'Annual' }).click();
await page.locator('button[data-plan="annual"]').click();
await page.evaluate(() => window.openAnnotatorProof?.());
await page.locator('button[data-plan="annual"]').click({ position: { x: 24, y: 16 } });

await page.waitForFunction(() => {
  const root = document.querySelector('#__annotate-root')?.shadowRoot;
  return Boolean(root?.querySelector('#annotate-comment'));
});

await page.evaluate(() => {
  const root = document.querySelector('#__annotate-root')?.shadowRoot;
  const comment = root?.querySelector('#annotate-comment');
  const priority = root?.querySelector('#annotate-priority');
  const email = root?.querySelector('#annotate-email');
  if (!(comment instanceof HTMLTextAreaElement)) throw new Error('Annotate comment field not found.');
  if (!(priority instanceof HTMLSelectElement)) throw new Error('Annotate priority field not found.');
  if (!(email instanceof HTMLInputElement)) throw new Error('Annotate email field not found.');
  comment.value = 'Annual checkout never opens the Stripe modal from the public preview URL';
  comment.dispatchEvent(new Event('input', { bubbles: true }));
  priority.value = 'critical';
  priority.dispatchEvent(new Event('change', { bubbles: true }));
  email.value = 'public-preview-proof@annotate.test';
  email.dispatchEvent(new Event('input', { bubbles: true }));
});

await page.evaluate(() => {
  const root = document.querySelector('#__annotate-root')?.shadowRoot;
  const submit = root?.querySelector('#annotate-submit');
  if (!(submit instanceof HTMLButtonElement)) throw new Error('Annotate submit button not found.');
  submit.click();
});

await page.waitForFunction(() => {
  const root = document.querySelector('#__annotate-root')?.shadowRoot;
  return root?.textContent?.includes('Report sent. Thank you!');
}, null, { timeout: 30000 });

await page.waitForTimeout(1000);
await browser.close();

if (!/^[a-f0-9]{32}$/i.test(submittedReportId)) {
  throw new Error(`Report was submitted but no 32-character report ID was observed. Value: ${submittedReportId || '<empty>'}`);
}

console.log(JSON.stringify({ report_id: submittedReportId }, null, 2));
