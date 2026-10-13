import { Bell, Box, Package, Plus } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button, ButtonAnchor, ButtonLink } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { SelectField, TextareaField, TextField } from '../components/ui/Field';
import { EmptyState } from '../components/feedback/EmptyState';
import { ErrorState } from '../components/feedback/ErrorState';
import { LoadingState } from '../components/feedback/LoadingState';
import { Container } from '../components/layout/Container';
import { Section } from '../components/layout/Section';

const colourSwatches = [
  { name: 'Brand 600 (primary)', token: '--color-brand-600', value: '#0f4c3a' },
  { name: 'Brand 50', token: '--color-brand-50', value: '#e9f3ef' },
  { name: 'Accent 500', token: '--color-accent-500', value: '#f2a900' },
  { name: 'Neutral 50 (background)', token: '--color-neutral-50', value: '#f7f5ef' },
  { name: 'Neutral 600 (muted text)', token: '--color-neutral-600', value: '#5a574e' },
  { name: 'Neutral 900 (text)', token: '--color-neutral-900', value: '#1a1915' },
  { name: 'Danger 600', token: '--color-danger-600', value: '#b42318' },
  { name: 'Success 600', token: '--color-success-600', value: '#1f7a3a' },
];

const typeScale = [
  { label: 'Display (h1)', token: '--text-5xl', sample: 'Deliveries that keep campus moving', style: { fontSize: 'var(--text-4xl)', fontWeight: 700 } },
  { label: 'Heading 2', token: '--text-3xl', sample: 'Service highlights', style: { fontSize: 'var(--text-3xl)', fontWeight: 700 } },
  { label: 'Heading 3', token: '--text-xl', sample: 'Built for campus life', style: { fontSize: 'var(--text-xl)', fontWeight: 700 } },
  { label: 'Body large', token: '--text-lg', sample: 'Campus deliveries for UNIOSUN and approved areas.', style: { fontSize: 'var(--text-lg)' } },
  { label: 'Body', token: '--text-base', sample: 'Body copy is set at 16px with a 1.6 line height for comfortable reading.', style: {} },
  { label: 'Small', token: '--text-sm', sample: 'Secondary information and helper text.', style: { fontSize: 'var(--text-sm)' } },
];

/**
 * Reference page for the ROOT-X design system. Lazily loaded from the router.
 * It is a developer and reviewer tool and it does not perform real actions.
 */
export function DesignSystemPage() {
  return (
    <>
      <Container>
        <div className="page-intro">
          <Badge>Reference</Badge>
          <h1 style={{ marginTop: 'var(--space-4)' }}>ROOT-X design system</h1>
          <p>
            The shared building blocks used across ROOT-X. Values are placeholders until the brand is approved.
            Every colour and size is defined once in <code>src/styles/tokens.css</code>.
          </p>
        </div>
      </Container>

      <Section id="colour" title="Colour" eyebrow="Foundations">
        <div className="swatch-grid">
          {colourSwatches.map((swatch) => (
            <div className="swatch" key={swatch.token}>
              <div className="swatch__chip" style={{ background: swatch.value }} aria-hidden="true" />
              <strong style={{ color: 'var(--color-text)' }}>{swatch.name}</strong>
              <span>
                {swatch.value} · <code>{swatch.token}</code>
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section id="typography" title="Typography" eyebrow="Foundations" muted>
        <div className="type-sample">
          {typeScale.map((row) => (
            <div className="type-sample__row" key={row.token}>
              <span className="type-sample__meta">
                {row.label} · {row.token}
              </span>
              <p style={row.style}>{row.sample}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="buttons" title="Buttons" eyebrow="Components">
        <div className="stack" style={{ gap: 'var(--space-6)' }}>
          <div className="demo-row">
            <Button variant="primary">Primary</Button>
            <Button variant="accent">Accent</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="primary" disabled>
              Disabled
            </Button>
            <Button variant="primary" loading>
              Saving
            </Button>
          </div>
          <div className="demo-row">
            <Button variant="primary" size="small">
              <Plus size={16} aria-hidden="true" /> Small
            </Button>
            <ButtonLink to="/" variant="secondary">
              Link button
            </ButtonLink>
            <ButtonAnchor href="#forms" variant="ghost">
              Anchor button
            </ButtonAnchor>
          </div>
          <p className="field__hint">
            Buttons in this page are visual examples. Only links navigate; the others have no action yet.
          </p>
        </div>
      </Section>

      <Section id="forms" title="Form fields" eyebrow="Components" muted>
        <div className="form-demo">
          <TextField label="Full name" hint="As it appears on your student ID." placeholder="e.g. Adeola Okeowo" />
          <TextField label="Phone number" error="Enter a valid phone number." defaultValue="08012" />
          <SelectField
            label="Delivery area"
            placeholder="Choose an area"
            defaultValue=""
            options={[
              { value: 'campus', label: 'UNIOSUN campus' },
              { value: 'township', label: 'Approved student township' },
            ]}
          />
          <TextareaField label="Delivery notes" hint="Landmarks or instructions for the rider." />
        </div>
      </Section>

      <Section id="cards" title="Cards" eyebrow="Components">
        <div className="grid grid--3">
          <Card title="Standard card" icon={Package}>
            <p>Used for highlights and summaries. Includes an optional icon.</p>
          </Card>
          <Card title="Card without icon">
            <p>Titles keep a logical heading level through the headingLevel prop.</p>
          </Card>
          <Card title="Notice card" icon={Bell} headingLevel={4}>
            <p>Use notices for information that does not need an action.</p>
          </Card>
        </div>
      </Section>

      <Section id="states" title="Feedback states" eyebrow="Patterns" muted>
        <div className="grid grid--2">
          <LoadingState title="Loading delivery areas…" />
          <LoadingState variant="skeleton" title="Loading summary" />
          <EmptyState
            icon={Box}
            title="No deliveries yet"
            body="When you place a delivery, it will show up here."
          />
          <ErrorState
            title="Could not load this section"
            body="Check your connection, then refresh the page."
            actions={<ButtonLink to="/" variant="secondary">Go to home</ButtonLink>}
          />
        </div>
      </Section>

      <Section id="layout" title="Layout and navigation" eyebrow="Patterns">
        <div className="stack">
          <p>
            Pages use a shared shell: a sticky header with a menu that collapses below 900px, a main landmark, and a
            footer. Content sits in a centred container with 20px padding on mobile and 32px from 768px. Sections
            stack in a single column on mobile, then two to four columns on wider screens.
          </p>
          <p className="field__hint">
            Breakpoints: 640px (2 columns), 768px (larger padding), 900px (desktop navigation), 960px (3 to 4 columns).
          </p>
        </div>
      </Section>
    </>
  );
}
