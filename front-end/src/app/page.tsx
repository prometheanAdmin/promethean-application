import HexagonCanvas from '@/components/HexagonCanvas';
import Nav from '@/components/Nav';
import MentorCard from '@/components/MentorCard';
import CourseCard from '@/components/CourseCard';
import LegacyTop from '@/components/LegacyTop';
import LegacyMiddle from '@/components/LegacyMiddle';
import LegacyBottom from '@/components/LegacyBottom';
import LegacyScripts from '@/components/LegacyScripts';
import Chatbot from '@/components/Chatbot';
import styles from './page.module.css';

export default function Home() {
  const mentors = [
    { name: 'Aisha Verma', role: 'Senior Engineer', company: 'Northwind Pay', imageSrc: '/mentor_aisha.png', tags: ['Payments', 'Ledgers', 'Risk'] },
    { name: 'Marcus Cole', role: 'Staff Data Eng', company: 'Vitalink Health', imageSrc: '/mentor_marcus.png', tags: ['Pipelines', 'FHIR', 'Analytics'] },
    { name: 'Diego Santos', role: 'Backend Lead', company: 'Cargologic', imageSrc: '/mentor_diego.png', tags: ['APIs', 'Routing', 'Scale'] },
    { name: 'Lena Hoffmann', role: 'Frontend Eng', company: 'Marketplace Co', imageSrc: '/mentor_lena.png', tags: ['Checkout', 'React', 'UX'] }
  ];

  const batches = [
    { domain: 'Fintech', domainColor: 'var(--accent)', title: 'Payments & ledgers', dateStr: 'Jul 14', duration: '8 weeks', mentorName: 'Aisha Verma', mentorRole: 'Senior Engineer', mentorAvatar: '/mentor_aisha.png' },
    { domain: 'Healthcare', domainColor: '#f43f5e', title: 'Patient pipelines', dateStr: 'Jul 28', duration: '8 weeks', mentorName: 'Marcus Cole', mentorRole: 'Staff Data Eng', mentorAvatar: '/mentor_marcus.png' },
    { domain: 'Logistics', domainColor: '#5b8cff', title: 'Fleet routing API', dateStr: 'Aug 11', duration: '8 weeks', mentorName: 'Diego Santos', mentorRole: 'Backend Lead', mentorAvatar: '/mentor_diego.png' },
    { domain: 'E-commerce', domainColor: '#e0529a', title: 'Checkout flow', dateStr: 'Aug 25', duration: '8 weeks', mentorName: 'Lena Hoffmann', mentorRole: 'Frontend Eng', mentorAvatar: '/mentor_lena.png' }
  ];

  return (
    <main className={styles.main}>
      <Nav />
      <HexagonCanvas />
      <LegacyScripts />

      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroContainer}>
          <div className={`${styles.heroPill} hero-anim hero-anim-1`}>
            <span className={styles.pulseDot}></span>
            The workplace, not the classroom
          </div>

          <h1 className={`${styles.heroTitle} hero-anim hero-anim-2`}>
            Learn from industry. <br/>Build <span className="grad-text">real experience.</span>
          </h1>

          <p className={`${styles.heroSubtitle} hero-anim hero-anim-3`}>
            Promethean is a live job simulation, taught by industry mentors, in your domain. Ship real code and launch your career.
          </p>

          <div className={`${styles.heroCtaGroup} hero-anim hero-anim-4`}>
            <a href="#batches" className={styles.heroPrimaryBtn}>Join a batch</a>
            <a href="#batches" className={styles.heroSecondaryBtn}>Browse batches</a>
          </div>
        </div>
      </section>

      {/* Legacy Top (Domains -> Upcoming Batches) */}
      <LegacyTop />

      {/* Batches Section (Rebuilt in React) */}
      <section id="batches" className={styles.sectionPadding}>
        <div className="container">
          <div className={styles.sectionHeader} data-rv>
            <p className={styles.sectionLabel}>Batches</p>
            <h2 className={styles.sectionTitle}>Upcoming batches.</h2>
          </div>
          <div className={styles.grid4} data-rv data-rv-stagger>
            {batches.map(b => (
              <CourseCard key={b.title} {...b} />
            ))}
          </div>
        </div>
      </section>

      {/* Legacy Middle (Reframe -> Mentors) */}
      <LegacyMiddle />

      {/* Mentors Section (Rebuilt in React) */}
      <section id="mentors" className={styles.sectionPadding}>
        <div className="container">
          <div className={styles.sectionHeader} data-rv>
            <p className={styles.sectionLabel}>Mentors</p>
            <h2 className={styles.sectionTitle}>Learn from the best.</h2>
          </div>
          <div className={styles.grid4} data-rv data-rv-stagger>
            {mentors.map(m => (
              <MentorCard key={m.name} {...m} />
            ))}
          </div>
        </div>
      </section>
      
      {/* Legacy Bottom (FAQ -> Footer) */}
      <LegacyBottom />

      <Chatbot />
    </main>
  );
}
