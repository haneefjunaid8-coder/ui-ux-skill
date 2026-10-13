import Article, { type ArticleData } from '../components/Article';
import Reveal from '../components/Reveal';
import { MoonStar, Scale, Eye } from 'lucide-react';

const POSTS: ArticleData[] = [
  {
    date: 'Apr 12, 2026',
    tag: 'Safety',
    title: 'Why ROOT-X stops new deliveries at 9 PM, on purpose',
    blurb: 'Night-time is when campus logistics gets risky. Here is how the cutoff, the buffers and the safe-resolution paths work together.',
    Icon: MoonStar,
  },
  {
    date: 'Apr 08, 2026',
    tag: 'Money',
    title: 'Every naira accounted for: the two-person rule',
    blurb: 'Finance proposes, admin approves, the ledger invariant double-checks. A walk through the settlement flow nobody can game alone.',
    Icon: Scale,
  },
  {
    date: 'Apr 01, 2026',
    tag: 'Product',
    title: 'Honest by design: stale is stale, processing is processing',
    blurb: 'Most apps blur uncertainty into confidence. ROOT-X labels it instead — and why that single decision changes everything.',
    Icon: Eye,
  },
];

export default function Blog() {
  return (
    <section className="blog" id="blog">
      <div className="section__padding">
        <div className="blog__heading">
          <Reveal>
            <h1>
              A lot is happening, <span className="gradient__text">we&rsquo;re shipping notes about it.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p>Design and engineering notes from building a campus delivery network the careful way.</p>
          </Reveal>
        </div>
        <div className="blog__grid">
          {POSTS.map((p, i) => (
            <Article key={p.title} data={p} delay={i * 0.08} />
          ))}
        </div>
      </div>
    </section>
  );
}
