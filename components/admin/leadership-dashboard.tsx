import { formatDate, formatPercent } from "@/lib/format";
import {
  formatPoints,
  formatReplyHours,
  type LeadershipAnalytics,
  type MemberOutcomeRow,
} from "@/lib/leadership";

export function LeadershipDashboard({ analytics }: { analytics: LeadershipAnalytics }) {
  const { improving, milestones, retention, goals, engagement, coaching } = analytics;
  const signedIn = analytics.members - retention.paused;

  return (
    <div className="space-y-10">
      <p className="max-w-3xl text-sm leading-6 text-muted">
        Counted {formatDate(analytics.asOfLabel)}. Freedom Score is passive income divided by the spending plan.
        Balances, note text, and bank details stay off this page.
      </p>

      <section className="rounded-2xl border border-gold/40 bg-surface px-4 py-4 sm:px-5" aria-label="How to read Guide context">
        <p className="text-sm leading-6 text-ink">{analytics.caveat}</p>
      </section>

      <section className="space-y-3" aria-labelledby="outcomes-heading">
        <h2 id="outcomes-heading" className="text-lg font-semibold text-ink">
          Outcomes
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Improving"
            value={improving.percent == null ? "—" : `${improving.percent}%`}
            detail={improving.detail}
          />
          <Metric
            label="Average change"
            value={improving.averagePoints == null ? "—" : `${formatPoints(improving.averagePoints)} pts`}
            detail="Mean change from the earliest saved score, including declines."
          />
          <Metric
            label="Milestones"
            value={String(milestones.reachedFirst)}
            detail={`${milestones.reachedFirst} of ${analytics.members} at or above 25%. ${milestones.belowFirst} still under that band.`}
          />
          <Metric
            label="Goal steps"
            value={goals.stepPercent == null ? "—" : `${goals.stepPercent}%`}
            detail={`${goals.stepsDone} of ${goals.stepsTotal} steps done. ${goals.goalsFinished} of ${goals.goalsTotal} goals at 100%.`}
          />
        </div>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {milestones.bands.map((band) => (
            <li key={band.threshold} className="rounded-2xl border border-line bg-surface px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-muted">
                {band.threshold}% · {band.title}
              </p>
              <p className="mt-1 text-xl font-semibold text-ink">{band.members}</p>
              <p className="text-xs text-muted">members at or above</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3" aria-labelledby="engagement-heading">
        <h2 id="engagement-heading" className="text-lg font-semibold text-ink">
          Engagement and retention
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Active members"
            value={`${retention.active}`}
            detail={`${retention.active} of ${signedIn} signed-in accounts in the last ${analytics.activeWindowDays} days. ${retention.paused} paused.`}
          />
          <Metric
            label="Check-ins"
            value={`${engagement.checkedInThisWeek}`}
            detail={`${engagement.checkedInThisWeek} checked in this week. ${engagement.checkIns} check-ins on file.`}
          />
          <Metric
            label="Education"
            value={String(engagement.lessonsCompleted)}
            detail={`${engagement.lessonsCompleted} lessons finished, ${engagement.lessonsInProgress} in progress. Catalog has ${engagement.lessonCatalog}.`}
          />
          <Metric
            label="Challenges"
            value={String(engagement.challengeMembers)}
            detail={`${engagement.challengeMembers} members enrolled. ${engagement.challengeActive} active, ${engagement.challengeCompleted} completed.`}
          />
        </div>
        {retention.quietNames.length > 0 ? (
          <p className="text-sm leading-6 text-muted">
            Quiet in the last {analytics.activeWindowDays} days: {retention.quietNames.join(", ")}.
          </p>
        ) : (
          <p className="text-sm leading-6 text-muted">No signed-in member is outside the {analytics.activeWindowDays}-day window.</p>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="coaching-heading">
        <h2 id="coaching-heading" className="text-lg font-semibold text-ink">
          Coaching signals
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Guide reply"
            value={coaching.medianReplyHours == null ? "—" : formatReplyHours(coaching.medianReplyHours)}
            detail={
              coaching.replies === 0
                ? "No Guide reply on a workspace thread yet."
                : `Median of ${coaching.replies} ${coaching.replies === 1 ? "reply" : "replies"}. ${coaching.waiting} still waiting.`
            }
          />
          <Metric
            label="Notes and sessions"
            value={String(coaching.notes + coaching.sessions)}
            detail={`${coaching.notes} Guide notes and ${coaching.sessions} session summaries. The words stay on the member record.`}
          />
          <Metric
            label="Shared tasks"
            value={goals.stepsTotal === 0 && coaching.tasksDone + coaching.tasksOpen === 0 ? "—" : `${taskPercent(coaching)}%`}
            detail={`${coaching.tasksDone} done, ${coaching.tasksOpen} still open.`}
          />
          <Metric
            label="Freedom Coach"
            value={String(engagement.coachMembers)}
            detail={`${engagement.coachMembers} members have a coach thread. ${engagement.coachMemberMessages} messages from members.`}
          />
        </div>
        {analytics.recentDeclines.length > 0 ? (
          <div className="rounded-2xl border border-line bg-surface px-4 py-4">
            <h3 className="text-sm font-medium text-ink">Down since a later check-in</h3>
            <p className="mt-1 text-sm leading-6 text-muted">
              These members are down at least 2 points from a check-in that is newer than their first saved score.
              The long arc can still be up. This is the same snapshot comparison the command center uses.
            </p>
            <ul className="mt-3 space-y-1 text-sm text-ink">
              {analytics.recentDeclines.map((member) => (
                <li key={member.id}>
                  {member.name}: down {member.points} pts
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="space-y-3" aria-labelledby="cohort-heading">
        <div className="max-w-3xl">
          <h2 id="cohort-heading" className="text-lg font-semibold text-ink">
            Cohorts
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            A cohort is the starting circumstance stored on the member. It is not a rank, and it does not sort Guides.
          </p>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="min-w-[720px] w-full border-collapse text-left text-sm">
            <caption className="sr-only">Freedom Score change and engagement by cohort</caption>
            <thead className="bg-surface text-[11px] uppercase tracking-[0.12em] text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Cohort</th>
                <th scope="col" className="px-4 py-3 font-medium">Members</th>
                <th scope="col" className="px-4 py-3 font-medium">Improving</th>
                <th scope="col" className="px-4 py-3 font-medium">Avg change</th>
                <th scope="col" className="px-4 py-3 font-medium">Steps</th>
                <th scope="col" className="px-4 py-3 font-medium">Check-ins</th>
                <th scope="col" className="px-4 py-3 font-medium">Lessons</th>
                <th scope="col" className="px-4 py-3 font-medium">Active</th>
              </tr>
            </thead>
            <tbody>
              {analytics.cohorts.map((cohort) => (
                <tr key={cohort.cohort} className="border-t border-line bg-background">
                  <th scope="row" className="px-4 py-3 font-medium text-ink">{cohort.cohort}</th>
                  <td className="px-4 py-3 text-ink">{cohort.members}</td>
                  <td className="px-4 py-3 text-ink">
                    {cohort.compared === 0 ? "—" : `${cohort.improving} of ${cohort.compared}`}
                  </td>
                  <td className="px-4 py-3 text-ink">
                    {cohort.averagePoints == null ? "—" : `${formatPoints(cohort.averagePoints)} pts`}
                  </td>
                  <td className="px-4 py-3 text-ink">
                    {cohort.stepsDone}/{cohort.stepsTotal}
                  </td>
                  <td className="px-4 py-3 text-ink">{cohort.checkIns}</td>
                  <td className="px-4 py-3 text-ink">{cohort.lessonsCompleted}</td>
                  <td className="px-4 py-3 text-ink">
                    {cohort.active}/{cohort.members}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="guide-heading">
        <div className="max-w-3xl">
          <h2 id="guide-heading" className="text-lg font-semibold text-ink">
            Guide context
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Listed by name. Score change sits beside the cohort mix, check-ins, notes, sessions, and reply time.
          </p>
        </div>
        <div className="grid gap-3">
          {analytics.guides.map((guide) => (
            <article key={guide.id} className="wc-card p-4 sm:p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-base font-semibold text-ink">{guide.name}</h3>
                <p className="text-sm text-muted">{guide.members} members</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted">{guide.cohortMix}</p>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Context
                  term="Median score change"
                  detail={
                    guide.medianScoreChange == null
                      ? "No saved score on this roster"
                      : `${formatPoints(guide.medianScoreChange)} pts across ${guide.compared} with a saved score`
                  }
                />
                <Context
                  term="Check-ins"
                  detail={`${guide.withCheckIn} of ${guide.members} have one. ${guide.checkedInThisWeek} checked in this week.`}
                />
                <Context term="Notes and sessions" detail={`${guide.notes} notes, ${guide.sessions} sessions`} />
                <Context
                  term="Reply time"
                  detail={
                    guide.medianReplyHours == null
                      ? guide.waiting > 0
                        ? `${guide.waiting} waiting, no reply yet`
                        : "No workspace reply yet"
                      : `${formatReplyHours(guide.medianReplyHours)} median. ${guide.waiting} waiting.`
                  }
                />
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="roster-heading">
        <div className="max-w-3xl">
          <h2 id="roster-heading" className="text-lg font-semibold text-ink">
            Member outcomes
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Sorted by name. The plan baseline is where the Freedom goal started. The change uses the earliest saved score.
          </p>
        </div>
        <div className="grid gap-3">
          {analytics.roster.map((member) => (
            <MemberCard key={member.id} member={member} />
          ))}
        </div>
      </section>

      <details className="wc-card px-4 py-4 sm:px-5">
        <summary className="cursor-pointer text-sm font-medium text-ink">How these numbers are counted</summary>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
          {analytics.methods.map((method) => (
            <li key={method}>{method}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function MemberCard({ member }: { member: MemberOutcomeRow }) {
  return (
    <article className="wc-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-ink">{member.name}</h3>
          <p className="mt-1 text-sm text-muted">
            {member.cohort} · {member.guideNames}
          </p>
        </div>
        <p className={`text-sm font-medium ${tone(member.direction)}`}>{member.changeLabel}</p>
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Context term="Live score" detail={member.liveScore == null ? "—" : formatPercent(member.liveScore)} />
        <Context term="Band" detail={member.band} />
        <Context
          term="Plan baseline"
          detail={member.goalBaseline == null ? "No Freedom baseline" : formatPercent(member.goalBaseline)}
        />
        <Context term="Activity" detail={activityDetail(member)} />
        <Context term="Steps" detail={`${member.stepsDone} of ${member.stepsTotal}`} />
        <Context term="Check-ins" detail={String(member.checkIns)} />
        <Context term="Lessons finished" detail={String(member.lessonsCompleted)} />
        <Context term="Challenges" detail={String(member.challenges)} />
      </dl>
      <p className="mt-4 text-sm leading-6 text-muted">{member.changeDetail}</p>
      {member.recentLabel ? <p className="mt-1 text-sm leading-6 text-muted">{member.recentLabel}</p> : null}
    </article>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="wc-card px-4 py-4">
      <h3 className="text-[11px] uppercase tracking-[0.12em] text-muted">{label}</h3>
      <p className="mt-2 text-2xl font-semibold text-gold">{value}</p>
      <p className="mt-2 text-xs leading-5 text-muted">{detail}</p>
    </article>
  );
}

function Context({ term, detail }: { term: string; detail: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.12em] text-muted">{term}</dt>
      <dd className="mt-1 text-sm leading-5 text-ink">{detail}</dd>
    </div>
  );
}

function activityDetail(member: MemberOutcomeRow): string {
  const when = member.lastActive ? formatDate(member.lastActive) : "No activity date";
  return `${member.activity} · ${when}`;
}

function taskPercent(coaching: LeadershipAnalytics["coaching"]): number {
  const total = coaching.tasksDone + coaching.tasksOpen;
  if (total === 0) return 0;
  return Math.round((coaching.tasksDone / total) * 100);
}

function tone(direction: MemberOutcomeRow["direction"]): string {
  if (direction === "up") return "text-success";
  if (direction === "down") return "text-danger";
  return "text-muted";
}
