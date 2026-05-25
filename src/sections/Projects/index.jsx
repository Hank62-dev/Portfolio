import { useState } from 'react';
import { projects, projectCategories } from '../../data/projects';
import SectionTitle from '../../components/common/SectionTitle';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Button from '../../components/common/Button';
import styles from './Projects.module.css';

const ProjectCard = ({ project, onClick }) => (
  <div
    className={`${styles.card} ${project.featured ? styles.featured : ''} reveal`}
    onClick={() => onClick(project)}
    style={{ '--card-color': project.color }}
  >
    {/* Thumbnail */}
    <div className={styles.thumb}>
      {project.image ? (
        <img src={project.image} alt={project.title} className={styles.thumbImage} />
      ) : (
        <div className={styles.thumbPlaceholder}>
          <span className={styles.thumbInitial}>{project.title[0]}</span>
        </div>
      )}
      {project.featured && <span className={styles.featuredBadge}>Featured</span>}
      <div className={styles.overlay}>
        <span className={styles.viewBtn}>Xem chi tiết →</span>
      </div>
    </div>

    {/* Body */}
    <div className={styles.body}>
      <div className={styles.meta}>
        <span className={styles.year}>{project.year}</span>
        <span className={styles.category}>{project.category}</span>
      </div>
      <h3 className={styles.title}>{project.title}</h3>
      <p className={styles.desc}>{project.description}</p>
      <div className={styles.tags}>
        {project.tags.slice(0, 3).map((t) => (
          <Badge key={t} variant="tech">{t}</Badge>
        ))}
        {project.tags.length > 3 && (
          <Badge variant="tech">+{project.tags.length - 3}</Badge>
        )}
      </div>
    </div>
  </div>
);

const ProjectModal = ({ project, onClose }) => {
  if (!project) return null;
  return (
    <div className={styles.modalContent}>
      <div className={styles.modalThumb} style={{ '--card-color': project.color }}>
        {project.image ? (
          <img src={project.image} alt={`${project.title} screenshot`} className={styles.modalImage} />
        ) : (
          <span className={styles.thumbInitial} style={{ fontSize: 64 }}>{project.title[0]}</span>
        )}
      </div>
      <div className={styles.modalBody}>
        <div className={styles.modalMeta}>
          <span className={styles.year}>{project.year}</span>
          <span className={styles.category}>{project.category}</span>
        </div>
        <h2 className={styles.modalTitle}>{project.title}</h2>
        <p className={styles.modalDesc}>{project.longDescription}</p>

        <div className={styles.modalTags}>
          {project.tags.map((t) => (
            <Badge key={t} variant="tech">{t}</Badge>
          ))}
        </div>

        <div className={styles.modalActions}>
          {project.github && (
            <Button href={project.github} target="_blank" variant="secondary" size="md">
              GitHub
            </Button>
          )}
          {project.live && (
            <Button href={project.live} target="_blank" variant="primary" size="md">
              Live Demo
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

const Projects = () => {
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  const filtered = filter === 'all'
    ? projects
    : projects.filter((p) => p.category === filter);

  return (
    <section id="projects" className={styles.projects}>
      <div className="container">
        <SectionTitle
          label="Dự án"
          title="Những gì mình đã xây dựng"
          subtitle="Tuyển chọn các dự án nổi bật."
        />

        {/* Filter */}
        <div className={styles.filters}>
          {projectCategories.map((c) => (
            <button
              key={c.id}
              className={`${styles.filterBtn} ${filter === c.id ? styles.active : ''}`}
              onClick={() => setFilter(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className={styles.grid}>
          {filtered.map((p) => (
            <ProjectCard key={p.id} project={p} onClick={setSelected} />
          ))}
        </div>
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)}>
        <ProjectModal project={selected} onClose={() => setSelected(null)} />
      </Modal>
    </section>
  );
};

export default Projects;
