import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { checkoutFixed } from './checkoutState';
import './styles.css';

declare global {
  interface Window {
    Annotate?: {
      ready?: (callback?: () => void) => boolean;
      init?: (options: Record<string, unknown>) => unknown;
      identify?: (user: Record<string, unknown>) => void;
    };
    proofAnnotateSdk?: {
      startAnnotation?: () => void;
    };
    openAnnotatorProof?: () => void;
  }
}

function configureAnnotator() {
  const projectKey = import.meta.env.VITE_ANNOTATE_PROJECT_KEY;
  const buildSha = import.meta.env.VITE_PUBLIC_BUILD_SHA;
  const init = () => {
    const sdk = window.Annotate?.init?.({
      projectKey,
      apiUrl: 'https://annotate-api-production.up.railway.app',
      appVersion: 'public-preview-proof-1.0.0',
      buildSha,
      reporterEmail: 'public-preview-proof@annotate.test',
      featureFlags: {
        annualCheckout: true,
        publicPreviewProof: true,
      },
      appState: () => ({
        checkout: {
          billing: 'annual',
          expectedDialog: 'Stripe checkout',
          fixed: checkoutFixed,
        },
      }),
    }) as Window['proofAnnotateSdk'];
    window.proofAnnotateSdk = sdk;
    window.Annotate?.identify?.({
      userId: 'preview-proof-user',
      email: 'public-preview-proof@annotate.test',
      plan: 'growth',
    });
    window.openAnnotatorProof = () => window.proofAnnotateSdk?.startAnnotation?.();
  };

  if (window.Annotate?.ready?.(init)) return;
  window.addEventListener('annotate:ready', init, { once: true });
}

function App() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    configureAnnotator();
  }, []);

  const startCheckout = () => {
    if (!checkoutFixed) {
      console.error('Annual checkout failed: Stripe modal did not open for annual billing.');
      return;
    }
    setDialogOpen(true);
  };

  return (
    <main className="app-shell">
      <section className="pricing-panel" aria-label="Pricing checkout proof">
        <div className="eyebrow">Annotator QA public preview proof</div>
        <div className="heading-row">
          <div>
            <h1>Growth plan checkout</h1>
            <p>Annual billing should open the Stripe checkout dialog from this public preview URL.</p>
          </div>
          <div className="status-pill" data-fixed={checkoutFixed ? 'true' : 'false'}>
            {checkoutFixed ? 'Fixed build' : 'Broken build'}
          </div>
        </div>

        <div className="billing-toggle" role="group" aria-label="Billing cycle">
          <button
            type="button"
            className={billing === 'monthly' ? 'active' : ''}
            data-billing="monthly"
            onClick={() => setBilling('monthly')}
          >
            Monthly
          </button>
          <button
            type="button"
            className={billing === 'annual' ? 'active' : ''}
            data-billing="annual"
            onClick={() => setBilling('annual')}
          >
            Annual
          </button>
        </div>

        <div className="price-card">
          <div>
            <h2>Growth</h2>
            <p className="price">{billing === 'annual' ? '$79' : '$99'}<span>/mo</span></p>
          </div>
          <ul>
            <li>Unlimited reports</li>
            <li>QA evidence package</li>
            <li>Stripe checkout</li>
          </ul>
          <button
            type="button"
            className="checkout-button"
            data-plan="annual"
            onClick={startCheckout}
          >
            Continue to checkout
          </button>
        </div>
      </section>

      {dialogOpen ? (
        <div className="checkout-dialog" role="dialog" aria-modal="true" aria-label="Stripe checkout">
          <div>
            <h2>Stripe checkout</h2>
            <p>Annual checkout session is ready.</p>
          </div>
          <button type="button" onClick={() => setDialogOpen(false)}>Close</button>
        </div>
      ) : null}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
