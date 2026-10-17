import { useLang } from '../../lib/i18n';
import { useGithub } from '../../hooks/useGithub';
import { usePageMeta } from '../../hooks/usePageMeta';
import Marquee from '../../components/ui/Marquee';
import Hero from '../../sections/Hero';
import Work from '../../sections/Work';
import Stack from '../../sections/Stack';
import Lab from '../../sections/Lab';
import About from '../../sections/About';
import Activity from '../../sections/Activity';
import Contact from '../../sections/Contact';

const Home = () => {
  const { c } = useLang();
  const github = useGithub();
  usePageMeta({ title: c.meta.home, description: c.meta.homeDesc });

  return (
    <>
      <Hero github={github} />
      <Marquee />
      <Work />
      <Stack />
      <Lab />
      <About />
      <Activity github={github} />
      <Contact />
    </>
  );
};

export default Home;
