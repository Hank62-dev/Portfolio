import { useParams, useNavigate } from 'react-router-dom';
import { projects } from '../../data/projects';
import Button from '../../components/common/Button';
import Badge from '../../components/ui/Badge';
import styles from './ProjectDetail.module.css';

const ProjectDetail = () => {
  const { id } = useParams();
  const nav = useNavigate();
  const project = projects.find((p) => p.id === Number(id));

  if (!project) {
    return (
      <div className={styles.notFound}>
        <p>Dự án không tồn tại.</p>
        <Button onClick={() => nav('/#projects')} variant="primary">← Xem tất cả dự án</Button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className="container">
        <button className={styles.back} onClick={() => nav(-1)}>← Quay lại</button>

        <div className={styles.hero} style={{ '--pd-color': project.color }}>
          <div className={styles.heroThumb}>
            <span className={styles.heroInitial}>{project.title[0]}</span>
          </div>
        </div>

        <div className={styles.content}>
          <div className={styles.main}>
            <div className={styles.meta}>
              <span className={styles.year}>{project.year}</span>
              <span className={styles.category}>{project.category}</span>
              {project.featured && <span className={styles.featured}>Featured</span>}
            </div>
            <h1 className={styles.title}>{project.title}</h1>
            <p className={styles.desc}>{project.longDescription}</p>

            <div className={styles.tags}>
              {project.tags.map((t) => (
                <Badge key={t} variant="tech">{t}</Badge>
              ))}
            </div>

            <div className={styles.actions}>
              {project.github && (
                <Button href={project.github} target="_blank" variant="secondary">GitHub →</Button>
              )}
              {project.live && (
                <Button href={project.live} target="_blank" variant="primary">Live Demo →</Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetail;
