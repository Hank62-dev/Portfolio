import { useState } from 'react';
import { personalInfo, socials } from '../../data/socials';
import SectionTitle from '../../components/common/SectionTitle';
import Button from '../../components/common/Button';
import { copyToClipboard } from '../../utils/helpers';
import styles from './Contact.module.css';

const Contact = () => {
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(personalInfo.email);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    await new Promise((r) => setTimeout(r, 1500));
    setSending(false);
    setSent(true);
    setForm({ name: '', email: '', message: '' });
    setTimeout(() => setSent(false), 5000);
  };

  return (
    <section id="contact" className={styles.contact}>
      <div className="container">
        <div className={styles.layout}>
          {/* Left */}
          <div className={`${styles.left} reveal-left`}>
            <SectionTitle
              label="Liên hệ"
              title={<>Hãy cùng nhau<br /><em className={styles.italic}>làm gì đó cool</em></>}
              subtitle="Mình luôn sẵn sàng cho những dự án thú vị, collaborations hay chỉ đơn giản là một buổi coffee chat."
            />

            <div className={styles.contactItems}>
              <div className={styles.contactItem} onClick={handleCopy}>
                <div className={styles.contactIcon}>✉</div>
                <div>
                  <div className={styles.contactLabel}>Email</div>
                  <div className={styles.contactValue}>{personalInfo.email}</div>
                </div>
                <span className={styles.copyHint}>{copied ? '✓ Đã copy!' : 'Click để copy'}</span>
              </div>

              <div className={styles.contactItem}>
                <div className={styles.contactIcon}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>

                <div>
                  <div className={styles.contactLabel}>Địa điểm</div>
                  <div className={styles.contactValue}>
                    {personalInfo.location}
                  </div>
                </div>
              </div>

              <div className={styles.contactItem}>
                <div className={styles.contactIcon}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                </div>

                <div>
                  <div className={styles.contactLabel}>Trạng thái</div>
                  <div className={styles.contactValue}>
                    Sẵn sàng nhận dự án mới
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.socialRow}>
              {socials.map((s) => (
                <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                  <span className={styles.socialIcon}>{s.icon}</span>
                  <span>{s.label}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Right: form */}
          <div className={`${styles.right} reveal-right`}>
            <div className={styles.formCard}>
              <h3 className={styles.formTitle}>Gửi tin nhắn</h3>

              {sent ? (
                <div className={styles.success}>
                  <span className={styles.successIcon}>✓</span>
                  <div>
                    <strong>Tin nhắn đã gửi!</strong>
                    <p>Mình sẽ phản hồi trong vòng 24h. Cảm ơn bạn!</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className={styles.form}>
                  <div className={styles.row}>
                    <div className={styles.field}>
                      <label className={styles.label}>Tên của bạn</label>
                      <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Nguyen Van A"
                        className={styles.input}
                        required
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Email</label>
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="you@example.com"
                        className={styles.input}
                        required
                      />
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Tin nhắn</label>
                    <textarea
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      placeholder="Mình muốn làm việc cùng bạn về..."
                      className={styles.textarea}
                      rows={5}
                      required
                    />
                  </div>
                  <Button
                    variant="primary"
                    size="lg"
                    disabled={sending}
                    className={styles.submitBtn}
                  >
                    {sending ? 'Đang gửi...' : 'Gửi tin nhắn'}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
