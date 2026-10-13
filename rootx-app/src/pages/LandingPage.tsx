import { ArrowRight } from 'lucide-react';
import { ButtonAnchor, ButtonLink } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/feedback/EmptyState';
import { Section } from '../components/layout/Section';
import { Container } from '../components/layout/Container';
import { howItWorksSteps, serviceArea, serviceHighlights } from '../content/site';

export function LandingPage() {
  return (
    <>
      <Hero />

      <Section id="about" title="What is ROOT-X?" eyebrow="About the service">
        <div className="stack" style={{ maxWidth: '46rem', fontSize: 'var(--text-lg)' }}>
          <p>
            ROOT-X is a delivery service for students, staff and local vendors in {serviceArea}. Our aim is
            dependable, clearly explained deliveries that fit campus life, without needing to leave your room,
            office or shop.
          </p>
          <p style={{ color: 'var(--color-text-muted)' }}>
            This website is the first stage of the build. Ordering, accounts and live tracking are not available yet.
          </p>
        </div>
      </Section>

      <Section id="services" title="Service highlights" eyebrow="Why ROOT-X" muted>
        <ServiceHighlights />
      </Section>

      <Section
        id="how-it-works"
        title="How ROOT-X will work"
        eyebrow="How it works"
        lead="A simple three-step outline of the planned experience. Details will be confirmed as each feature is built."
      >
        <ol className="step-list">
          {howItWorksSteps.map((step) => (
            <li key={step.id}>
              <div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Container>
        <section className="cta-band" aria-labelledby="cta-heading" style={{ marginBottom: 'var(--space-12)' }}>
          <div className="stack">
            <h2 id="cta-heading" style={{ fontSize: 'var(--text-2xl)' }}>
              Want to see how the foundation looks?
            </h2>
            <p style={{ color: 'var(--color-text-muted)' }}>
              Explore the ROOT-X design system: colours, type, buttons, forms, cards and feedback states.
            </p>
          </div>
          <div className="cluster">
            <ButtonLink to="/design-system" variant="primary">
              Open design system
              <ArrowRight size={18} aria-hidden="true" />
            </ButtonLink>
            <ButtonAnchor href="#services" variant="secondary">
              Back to services
            </ButtonAnchor>
          </div>
        </section>
      </Container>
    </>
  );
}

function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-heading">
      <Container>
        <div className="hero__inner">
          <div>
            <Badge className="hero__badge">Placeholder branding · Step 1 foundation</Badge>
            <h1 id="hero-heading" className="hero__title" style={{ marginTop: 'var(--space-5)' }}>
              Deliveries that keep campus moving.
            </h1>
            <p className="hero__lead">
              ROOT-X brings reliable deliveries to UNIOSUN and approved student-township areas, so you can
              get what you need without the trip.
            </p>
            <div className="cluster hero__actions">
              <ButtonAnchor href="#services" variant="accent" size="default">
                Explore services
                <ArrowRight size={18} aria-hidden="true" />
              </ButtonAnchor>
              <ButtonAnchor href="#how-it-works" variant="on-dark">
                How it works
              </ButtonAnchor>
            </div>
          </div>

          <aside className="hero__panel" aria-label="Service coverage">
            <p style={{ fontWeight: 600 }}>Coverage (planned)</p>
            <HeroRow label="UNIOSUN campus" />
            <HeroRow label="Hostels and student lodges" />
            <HeroRow label="Approved student-township areas" />
          </aside>
        </div>
      </Container>
    </section>
  );
}

function HeroRow({ label }: { label: string }) {
  return (
    <div className="hero__panel-row">
      <span className="hero__panel-dot" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

/** Renders service highlight cards, with an empty state if the list is ever empty. */
function ServiceHighlights() {
  if (serviceHighlights.length === 0) {
    return (
      <EmptyState
        title="No highlights to show yet"
        body="Service highlights will appear here once they are added."
      />
    );
  }
  return (
    <div className="grid grid--4">
      {serviceHighlights.map((item) => (
        <Card key={item.id} title={item.title} icon={item.icon}>
          <p>{item.body}</p>
        </Card>
      ))}
    </div>
  );
}
