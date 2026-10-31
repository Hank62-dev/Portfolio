import { Link } from 'react-router-dom';
import { useLang } from '../../lib/i18n';
import { usePageMeta } from '../../hooks/usePageMeta';
import Button from '../../design-system/Button';

/** `variant="project"` is used by the project route when the slug/id is unknown. */
const NotFound = ({ variant }) => {
  const { c } = useLang();
  const isProject = variant === 'project';
  usePageMeta({
    title: isProject ? c.project.notFoundTitle : c.notFound.title,
    description: isProject ? c.project.notFoundBody : c.notFound.body,
  });

  return (
    <section className="flex min-h-[80vh] items-center pt-[calc(var(--spacing-header)+48px)] pb-20">
      <div className="wrap">
        <p className="serif-accent text-[clamp(5rem,3rem+12vw,12rem)] leading-[0.9]">{c.notFound.code}</p>
        <h1 className="mt-3 mb-4 max-w-[18ch] font-display text-h2">
          {isProject ? c.project.notFoundTitle : c.notFound.title}
        </h1>
        <p className="mb-8 max-w-[44ch] text-bone-dim">{isProject ? c.project.notFoundBody : c.notFound.body}</p>
        <Button to={isProject ? '/#work' : '/'} icon="→">
          {isProject ? c.project.back : c.notFound.home}
        </Button>
        <p className="sr-only">
          <Link to="/">{c.notFound.home}</Link>
        </p>
      </div>
    </section>
  );
};

export default NotFound;
