'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ApiError, api } from '@/lib/api';
import { fetchDomains } from '@/lib/domains';
import { useStudentContext } from './StudentContext';
import {
  MailIcon,
  BookIcon,
  UserIcon,
  CalendarIcon,
  MapPinIcon,
  CheckCircleIcon,
  ArrowRightIcon,
} from './icons';
import styles from './ProfilePageContent.module.css';

type ProfilePageContentProps = {
  mode?: 'default' | 'setup';
};

type FormState = {
  education: string;
  skills: string;
  careerGoals: string;
  domainId: string;
};

type DomainOption = {
  id: string;
  name: string;
  description: string | null;
};

function toSkillArray(value: string) {
  return value
    .split(',')
    .map((skill) => skill.trim())
    .filter(Boolean);
}

function buildFormState(profile: {
  education: string;
  skills: string[];
  careerGoals: string;
  domainId: string;
}): FormState {
  return {
    education: profile.education,
    skills: profile.skills.join(', '),
    careerGoals: profile.careerGoals,
    domainId: profile.domainId,
  };
}

export default function ProfilePageContent({
  mode = 'default',
}: ProfilePageContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getToken } = useAuth();
  const { student, profile, refresh, needsProfileSetup } = useStudentContext();
  const [domains, setDomains] = useState<DomainOption[]>([]);
  const [draftForm, setDraftForm] = useState<FormState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    void fetchDomains()
      .then((nextDomains) => {
        if (cancelled) {
          return;
        }
        setDomains(
          nextDomains.map((domain) => ({
            id: domain.id,
            name: domain.name,
            description: domain.description,
          }))
        );
      })
      .catch(() => {
        if (!cancelled) {
          setDomains([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const form = draftForm ?? buildFormState(profile);

  const pageCopy = useMemo(() => {
    if (mode === 'setup' || needsProfileSetup) {
      return {
        eyebrow: 'Profile Setup',
        title: 'Complete your student profile.',
        subtitle:
          'Add your background and preferred domain so Promethean can unlock batch discovery and the rest of your workspace.',
        submitLabel: 'Save profile and continue',
      };
    }

    return {
      eyebrow: 'My Profile',
      title: 'Your student profile.',
      subtitle:
        'Keep your learning profile current so mentors and future batch workflows stay accurate.',
      submitLabel: 'Save profile changes',
    };
  }, [mode, needsProfileSetup]);

  const selectedDomainDescription =
    domains.find((domain) => domain.id === form.domainId)?.description ?? null;
  const showSetupPriorityForm = mode === 'setup' || needsProfileSetup;
  const justCompletedProfile = searchParams.get('updated') === '1';
  const skillPreview = toSkillArray(form.skills);
  const profileChecklist = [
    {
      label: 'Education',
      description: 'Tell mentors where you are academically or professionally.',
      complete: form.education.trim().length > 0,
    },
    {
      label: 'Preferred domain',
      description: 'Needed to unlock the right batch recommendations.',
      complete: form.domainId.trim().length > 0,
    },
    {
      label: 'Career goals',
      description: 'Used to personalize your workspace and mentor guidance.',
      complete: form.careerGoals.trim().length > 0,
    },
    {
      label: 'Skills',
      description: 'Optional, but helps mentors understand your current level.',
      complete: skillPreview.length > 0,
    },
  ];
  const completedChecklistCount = profileChecklist.filter((item) => item.complete).length;

  // Start in edit mode for new users (setup) or incomplete profiles.
  // For a complete profile the user explicitly clicks "Edit profile" to enter edit mode.
  const [isEditing, setIsEditing] = useState<boolean>(
    mode === 'setup' || !profile.profileComplete
  );

  // Domain description for the current *saved* profile (used in view mode).
  const currentDomainDescription =
    domains.find((d) => d.id === profile.domainId)?.description ?? null;

  const updateField = (key: keyof FormState, value: string) => {
    setDraftForm((current) => ({
      ...(current ?? form),
      [key]: value,
    }));
    setErrorMessage('');
    setSuccessMessage('');
    setFieldErrors((current) => {
      if (!(key in current)) {
        return current;
      }

      const nextErrors = { ...current };
      delete nextErrors[key];
      return nextErrors;
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setDraftForm(null);
    setErrorMessage('');
    setSuccessMessage('');
    setFieldErrors({});
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');
    setFieldErrors({});

    try {
      const authToken = (await getToken({ skipCache: true })) ?? (await getToken());
      if (!authToken) {
        throw new Error('Missing auth token');
      }

      const updated = await api.put<{
        education: string | null;
        skills: string[];
        career_goals: string | null;
        domain_id: string | null;
        profile_complete: boolean;
      }>(
        '/api/v1/me/student-profile',
        {
          education: form.education.trim() || null,
          skills: toSkillArray(form.skills),
          career_goals: form.careerGoals.trim() || null,
          domain_id: form.domainId || null,
        },
        { authToken }
      );

      await refresh();
      setDraftForm(null);

      if (updated.profile_complete && showSetupPriorityForm) {
        router.replace('/dashboard/profile?updated=1');
        return;
      }

      // Exit edit mode and surface success feedback in view mode.
      setIsEditing(false);
      setSuccessMessage(
        updated.profile_complete
          ? 'Profile saved and synced across your Promethean workspace.'
          : 'Profile saved. Add the remaining required fields to unlock the full dashboard.'
      );
    } catch (error) {
      if (error instanceof ApiError && Array.isArray(error.detail)) {
        const nextFieldErrors: Record<string, string> = {};

        for (const issue of error.detail) {
          if (
            issue &&
            typeof issue === 'object' &&
            Array.isArray((issue as { loc?: unknown[] }).loc) &&
            typeof (issue as { msg?: unknown }).msg === 'string'
          ) {
            const location = (issue as { loc: unknown[] }).loc.at(-1);
            if (typeof location === 'string') {
              nextFieldErrors[location] = (issue as { msg: string }).msg;
            }
          }
        }

        if (Object.keys(nextFieldErrors).length > 0) {
          setFieldErrors(nextFieldErrors);
        } else {
          setErrorMessage(error.message);
        }
      } else if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('We could not save your profile right now. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className={styles.header}>
        <p className={styles.eyebrow}>{pageCopy.eyebrow}</p>
        <h1 className={styles.title}>{pageCopy.title}</h1>
        <p className={styles.subtitle}>{pageCopy.subtitle}</p>
      </div>

      <div className={styles.heroCard}>
        <span className={styles.avatar}>{student.initials}</span>
        <div className={styles.heroInfo}>
          <h2 className={styles.name}>{student.name}</h2>
          <p className={styles.role}>
            {student.domain} &middot; {student.program}
          </p>
        </div>
        <span className={styles.statusPill}>
          <span className={styles.statusDot} />
          {student.status}
        </span>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Student details</h3>
          <div className={styles.fieldList}>
            <div className={styles.field}>
              <span className={styles.fieldIcon}><MailIcon /></span>
              <div>
                <p className={styles.fieldLabel}>Email</p>
                <p className={styles.fieldValue}>{student.email}</p>
              </div>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldIcon}><BookIcon /></span>
              <div>
                <p className={styles.fieldLabel}>Program / Course</p>
                <p className={styles.fieldValue}>{student.domain} &mdash; {student.program}</p>
              </div>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldIcon}><UserIcon /></span>
              <div>
                <p className={styles.fieldLabel}>Mentor</p>
                <p className={styles.fieldValue}>{student.mentorName}</p>
              </div>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldIcon}><MapPinIcon /></span>
              <div>
                <p className={styles.fieldLabel}>Location</p>
                <p className={styles.fieldValue}>{student.location}</p>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Batch details</h3>
          <div className={styles.fieldList}>
            <div className={styles.field}>
              <span className={styles.fieldIcon}><CalendarIcon /></span>
              <div>
                <p className={styles.fieldLabel}>Batch</p>
                <p className={styles.fieldValue}>{student.batch} &middot; starts {student.batchStartDate}</p>
              </div>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldIcon}><CalendarIcon /></span>
              <div>
                <p className={styles.fieldLabel}>Joined Promethean</p>
                <p className={styles.fieldValue}>{student.joinedDate}</p>
              </div>
            </div>
          </div>

          <h3 className={`${styles.cardTitle} ${styles.aboutTitle}`}>About</h3>
          <p className={styles.bio}>{student.bio}</p>
        </div>
      </div>

      {/* ── View mode ─────────────────────────────────────────────────────── */}
      {!isEditing && (
        <div className={styles.formSection}>
          <div className={styles.card}>
            <div className={styles.profileViewHeader}>
              <div>
                <h3 className={styles.cardTitle}>Academic &amp; career profile</h3>
                <p className={styles.formIntro}>
                  Your learning identity across Promethean — shared with mentors and used for batch matching.
                </p>
              </div>
              <button
                type="button"
                className={styles.editBtn}
                onClick={() => {
                  setIsEditing(true);
                  setSuccessMessage('');
                }}
              >
                Edit profile
                <ArrowRightIcon />
              </button>
            </div>

            {successMessage && (
              <p className={styles.successBanner} role="status">
                {successMessage}
              </p>
            )}

            <div className={styles.profileViewFields}>
              <div className={styles.profileViewField}>
                <span className={styles.fieldIcon}><BookIcon /></span>
                <div>
                  <p className={styles.fieldLabel}>Education</p>
                  <p className={profile.education?.trim() ? styles.fieldValue : styles.profileViewEmpty}>
                    {profile.education?.trim() || 'Not set'}
                  </p>
                </div>
              </div>

              <div className={styles.profileViewField}>
                <span className={styles.fieldIcon}><MapPinIcon /></span>
                <div>
                  <p className={styles.fieldLabel}>Preferred domain</p>
                  <p className={profile.domainId ? styles.fieldValue : styles.profileViewEmpty}>
                    {profile.domainId
                      ? (domains.find((d) => d.id === profile.domainId)?.name ?? '…')
                      : 'Not set'}
                  </p>
                  {currentDomainDescription && (
                    <p className={styles.helperText}>{currentDomainDescription}</p>
                  )}
                </div>
              </div>

              <div className={styles.profileViewField}>
                <span className={styles.fieldIcon}><UserIcon /></span>
                <div>
                  <p className={styles.fieldLabel}>Career goals</p>
                  <p className={profile.careerGoals?.trim() ? styles.fieldValue : styles.profileViewEmpty}>
                    {profile.careerGoals?.trim() || 'Not set'}
                  </p>
                </div>
              </div>

              <div className={styles.profileViewField}>
                <span className={styles.fieldIcon}><CheckCircleIcon /></span>
                <div>
                  <p className={styles.fieldLabel}>Skills</p>
                  {profile.skills.length > 0 ? (
                    <div className={styles.skillChips}>
                      {profile.skills.map((skill) => (
                        <span key={skill} className={styles.skillChip}>{skill}</span>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.profileViewEmpty}>Not set</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit mode ─────────────────────────────────────────────────────── */}
      {isEditing && (
        <div className={styles.formSection}>
          <div className={styles.card}>
            <div className={styles.formHeader}>
              <div>
                <h3 className={styles.cardTitle}>
                  {showSetupPriorityForm ? 'Complete your profile' : 'Edit profile details'}
                </h3>
                <p className={styles.formIntro}>
                  {showSetupPriorityForm
                    ? 'Education, career goals, and your preferred domain unlock batch discovery and the rest of the student workspace.'
                    : 'Keep your profile current so batch matching, mentor context, and your workspace identity stay aligned.'}
                </p>
              </div>
              <div className={styles.formHeaderMeta}>
                {justCompletedProfile && !showSetupPriorityForm && (
                  <span className={styles.syncedPill}>Profile synced</span>
                )}
                <span className={styles.completionPill}>
                  {profile.profileComplete ? 'Profile complete' : 'Profile incomplete'}
                </span>
              </div>
            </div>

            <div className={showSetupPriorityForm ? styles.editorLayout : styles.editorLayoutCompleted}>
              {showSetupPriorityForm ? (
                <aside className={styles.readinessPanel}>
                  <div className={styles.readinessHero}>
                    <span className={styles.readinessIcon}>
                      <CheckCircleIcon />
                    </span>
                    <div>
                      <p className={styles.readinessEyebrow}>Profile readiness</p>
                      <h4 className={styles.readinessTitle}>
                        {completedChecklistCount} of {profileChecklist.length} signals in place
                      </h4>
                    </div>
                  </div>

                  <div className={styles.readinessMeter}>
                    <span
                      className={styles.readinessMeterFill}
                      style={{
                        width: `${(completedChecklistCount / profileChecklist.length) * 100}%`,
                      }}
                    />
                  </div>
                  <p className={styles.readinessCaption}>
                    Finish the required fields to unlock batch discovery, mentor matching, and the full workspace.
                  </p>

                  <div className={styles.readinessList}>
                    {profileChecklist.map((item) => (
                      <div key={item.label} className={styles.readinessItem}>
                        <span
                          className={`${styles.readinessCheck} ${item.complete ? styles.readinessCheckComplete : ''}`}
                        >
                          <CheckCircleIcon />
                        </span>
                        <div className={styles.readinessBody}>
                          <p className={styles.readinessItemTitle}>{item.label}</p>
                          <p className={styles.readinessItemCopy}>{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className={styles.previewCard}>
                    <p className={styles.previewLabel}>Selected domain</p>
                    <p className={styles.previewValue}>
                      {domains.find((domain) => domain.id === form.domainId)?.name ?? 'Not selected yet'}
                    </p>
                    <p className={styles.previewCopy}>
                      {selectedDomainDescription ??
                        'Choose a domain to tailor your track, mentors, and batch discovery experience.'}
                    </p>
                  </div>
                </aside>
              ) : (
                <div className={styles.completedOverview}>
                  <div className={styles.completedHero}>
                    <span className={styles.completedHeroIcon}>
                      <CheckCircleIcon />
                    </span>
                    <div>
                      <p className={styles.completedEyebrow}>Workspace identity</p>
                      <h4 className={styles.completedTitle}>Your profile is active across Promethean</h4>
                      <p className={styles.completedCopy}>
                        Changes here update the context mentors see, keep your domain alignment accurate, and shape the rest of your student workspace.
                      </p>
                    </div>
                  </div>

                  <div className={styles.completedChips}>
                    <span className={styles.completedChip}>{student.domain}</span>
                    <span className={styles.completedChip}>{student.batch}</span>
                    <span className={styles.completedChip}>{student.mentorName}</span>
                  </div>
                </div>
              )}

              <form
                className={`${styles.form} ${showSetupPriorityForm ? '' : styles.formCompleted}`}
                onSubmit={(event) => void handleSubmit(event)}
                noValidate
              >
                <div className={styles.formGrid}>
                  <div className={styles.inputGroup}>
                    <div className={styles.fieldTop}>
                      <label className={styles.inputLabel} htmlFor="education">
                        Education
                      </label>
                      <span className={styles.fieldBadge}>Required</span>
                    </div>
                    <p className={styles.fieldDescription}>
                      Add the school, degree, or work context mentors should know before reviewing your work.
                    </p>
                    <textarea
                      id="education"
                      className={styles.textarea}
                      value={form.education}
                      onChange={(event) => updateField('education', event.target.value)}
                      placeholder="B.Tech CS, VIT 2024"
                      rows={3}
                    />
                    {fieldErrors.education && <p className={styles.errorText}>{fieldErrors.education}</p>}
                  </div>

                  <div className={styles.inputGroup}>
                    <div className={styles.fieldTop}>
                      <label className={styles.inputLabel} htmlFor="domain">
                        Preferred domain
                      </label>
                      <span className={styles.fieldBadge}>Required</span>
                    </div>
                    <p className={styles.fieldDescription}>
                      This controls which batches and mentors Promethean prioritizes for you.
                    </p>
                    <select
                      id="domain"
                      className={styles.select}
                      value={form.domainId}
                      onChange={(event) => updateField('domainId', event.target.value)}
                    >
                      <option value="">Choose a domain</option>
                      {domains.map((domain) => (
                        <option key={domain.id} value={domain.id}>
                          {domain.name}
                        </option>
                      ))}
                    </select>
                    {selectedDomainDescription && (
                      <p className={styles.helperText}>{selectedDomainDescription}</p>
                    )}
                    {fieldErrors.domain_id && <p className={styles.errorText}>{fieldErrors.domain_id}</p>}
                  </div>

                  <div className={styles.inputGroup}>
                    <div className={styles.fieldTop}>
                      <label className={styles.inputLabel} htmlFor="skills">
                        Skills
                      </label>
                      <span className={styles.fieldBadgeMuted}>Optional</span>
                    </div>
                    <p className={styles.fieldDescription}>
                      Mention your current stack so mentors can calibrate sessions and code reviews faster.
                    </p>
                    <input
                      id="skills"
                      className={styles.input}
                      value={form.skills}
                      onChange={(event) => updateField('skills', event.target.value)}
                      placeholder="Python, FastAPI, PostgreSQL"
                    />
                    <p className={styles.helperText}>
                      Use comma-separated skills so we can save them as a structured list.
                    </p>
                    {skillPreview.length > 0 && (
                      <div className={styles.skillChips}>
                        {skillPreview.map((skill) => (
                          <span key={skill} className={styles.skillChip}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                    {fieldErrors.skills && <p className={styles.errorText}>{fieldErrors.skills}</p>}
                  </div>

                  <div className={styles.inputGroup}>
                    <div className={styles.fieldTop}>
                      <label className={styles.inputLabel} htmlFor="career-goals">
                        Career goals
                      </label>
                      <span className={styles.fieldBadge}>Required</span>
                    </div>
                    <p className={styles.fieldDescription}>
                      Share what role or capability you are targeting so the workspace can stay aligned with it.
                    </p>
                    <textarea
                      id="career-goals"
                      className={styles.textarea}
                      value={form.careerGoals}
                      onChange={(event) => updateField('careerGoals', event.target.value)}
                      placeholder="Backend SDE building systems that ship to production."
                      rows={4}
                    />
                    {fieldErrors.career_goals && <p className={styles.errorText}>{fieldErrors.career_goals}</p>}
                  </div>
                </div>

                {errorMessage && (
                  <p className={styles.errorBanner} role="status">
                    {errorMessage}
                  </p>
                )}

                <div className={styles.formFooter}>
                  <div className={styles.formFooterCopy}>
                    <p className={styles.formFooterTitle}>Save when you&apos;re ready</p>
                    <p className={styles.formFooterText}>
                      Your changes update the backend immediately and refresh the dashboard state after save.
                    </p>
                  </div>
                  <div className={styles.formFooterActions}>
                    {!showSetupPriorityForm && (
                      <button
                        type="button"
                        className={styles.cancelBtn}
                        onClick={handleCancel}
                        disabled={submitting}
                      >
                        Cancel
                      </button>
                    )}
                    <button type="submit" className={styles.submitButton} disabled={submitting}>
                      {submitting ? 'Saving profile…' : pageCopy.submitLabel}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
