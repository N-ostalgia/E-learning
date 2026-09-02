import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGraduationCap, faTrophy, faUser } from "@fortawesome/free-solid-svg-icons";
import { Navbar } from "@/components/Navbar";
import { HeroGraphic } from "@/components/HeroGraphic";

const features = [
  {
    title: "Shared knowledge",
    description:
      "Post questions, share wins, and learn from members who've solved the same problems you're facing.",
    icon: <FontAwesomeIcon icon={faUser} className="h-5 w-5 text-[#059669]" />,
  },
  {
    title: "Structured courses",
    description:
      "Follow guided learning paths with clear milestones, so you always know your next step.",
    icon: <FontAwesomeIcon icon={faGraduationCap} className="h-5 w-5 text-[#059669]" />,
  },
  {
    title: "Growth leaderboard",
    description:
      "Track your progress against the community and earn badges as you level up your skills.",
    icon: <FontAwesomeIcon icon={faTrophy} className="h-5 w-5 text-[#059669]" />,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Navbar />

      {/* Hero */}
      <section className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
        <div>
          <h1 className="font-display text-5xl font-extrabold leading-[1.08] tracking-tight text-[var(--color-text-primary)] sm:text-6xl">
            Learn together.
            <br />
            Grow as one.
          </h1>
          <p className="mt-6 max-w-md text-lg text-[var(--color-text-secondary)]">
            Nexus brings courses and community into one place, so you never
            learn alone. Ask questions, follow structured paths, and track
            your progress alongside people on the same journey.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/register"
              className="rounded-lg bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
            >
              Join the Nexus community
            </Link>
          </div>
        </div>

        <div className="flex justify-center">
          <HeroGraphic />
        </div>
      </section>

      {/* Feature cards */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-accent-soft)]">
                {feature.icon}
              </div>
              <h3 className="mt-4 font-display text-base font-bold text-[var(--color-text-primary)]">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Courses + Community preview */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Classroom preview */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-accent)]">
              Courses
            </span>
            <h3 className="mt-2 font-display text-2xl font-bold text-[var(--color-text-primary)]">
              Your classroom hub
            </h3>
            <div className="mt-6 space-y-3">
              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
                <div className="h-full w-[45%] rounded-full bg-[var(--color-accent)]" />
              </div>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Course progress: 45%
              </p>
            </div>
            <ul className="mt-6 space-y-3">
              {["Foundations of Marketing", "Advanced Community Growth", "Structured Learning Paths"].map(
                (course) => (
                  <li
                    key={course}
                    className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-4 py-3"
                  >
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">
                      {course}
                    </span>
                    <span className="text-xs font-semibold text-[var(--color-accent)]">
                      Resume
                    </span>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Community feed preview */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-accent)]">
              Community
            </span>
            <h3 className="mt-2 font-display text-2xl font-bold text-[var(--color-text-primary)]">
              A feed worth showing up for
            </h3>
            <div className="mt-6 space-y-4">
              {[1, 2].map((post) => (
                <div key={post} className="rounded-lg border border-[var(--color-border)] p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-[var(--color-accent-soft)]" />
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                        Member update
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)]">2h ago</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
                    Just finished the Advanced Community Growth path — the
                    milestone system kept me way more consistent than I
                    expected.
                  </p>
                  <div className="mt-3 flex gap-4 text-xs font-medium text-[var(--color-text-secondary)]">
                    <span>♥ Like</span>
                    <span>💬 Comment</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-6 py-16 text-center">
          <h2 className="font-display text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
            Your next course, your next connection.
          </h2>
          <p className="max-w-md text-[var(--color-text-secondary)]">
            Free to join. Upgrade any time to unlock every course and path.
          </p>
          <Link
            href="/register"
            className="rounded-lg bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
          >
            Get started for free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col items-center justify-between gap-4 text-sm text-[var(--color-text-secondary)] sm:flex-row">
          <span>© {new Date().getFullYear()} Nexus. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}