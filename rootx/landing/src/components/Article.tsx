import { ArrowRight, type LucideIcon } from 'lucide-react';
import Tilt from './Tilt';
import Reveal from './Reveal';

export type ArticleData = {
  date: string;
  tag: string;
  title: string;
  blurb: string;
  Icon: LucideIcon;
};

export default function Article({ data, delay = 0 }: { data: ArticleData; delay?: number }) {
  const { Icon } = data;
  return (
    <Reveal delay={delay} className="blog__cell">
      <Tilt className="article">
        <div className="article__art" aria-hidden>
          <Icon size={52} strokeWidth={1.4} />
        </div>
        <div className="article__body">
          <div className="article__meta">
            <span>{data.date}</span>
            <span className="tag">{data.tag}</span>
          </div>
          <h3>{data.title}</h3>
          <p>{data.blurb}</p>
          <a className="article__more" href="#blog" onClick={(e) => e.preventDefault()}>
            Read full article
            <ArrowRight size={14} />
          </a>
        </div>
      </Tilt>
    </Reveal>
  );
}
