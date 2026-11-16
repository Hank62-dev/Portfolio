import { useLang } from '../../i18n';
import { useGithub } from '../../hooks/useGithub';
import { usePageMeta } from '../../hooks/usePageMeta';
import Marquee from '../../components/Marquee';
import Interlude from '../../components/Interlude';
import Hero from '../../sections/Hero';
import Work from '../../sections/Work';
import Stack from '../../sections/Stack';
import Immersive from '../../sections/Immersive';
import Lab from '../../sections/Lab';
import About from '../../sections/About';
import Activity from '../../sections/Activity';
import Contact from '../../sections/Contact';
import Whispers from '../../sections/Whispers';
import ParticleField from '../../scene/particles/ParticleField';

const Home = () => {
  const { c } = useLang();
  const github = useGithub();
  usePageMeta({ title: c.meta.home, description: c.meta.homeDesc });

  return (
    <>
      <ParticleField />
      <Hero github={github} />
      <Marquee />
      <Work />
      <Interlude />
      <Stack />
      <Lab />
      <Immersive />
      <About />
      <Activity github={github} />
      <Whispers />
      <Contact />
    </>
  );
};

export default Home;
