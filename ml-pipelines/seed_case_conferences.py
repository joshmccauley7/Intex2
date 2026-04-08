"""
Seed case_conferences table with realistic data.
Generates 4-8 conferences per resident spread across their length of stay.
"""
import psycopg2
import os
import random
from datetime import date, timedelta
from dotenv import load_dotenv

load_dotenv('../backend/Intex2/Intex2/.env')
conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

random.seed(42)

# ── Conference types and their typical cadence ────────────────────────────────
CONFERENCE_TYPES = [
    'Initial Case Conference',
    'Quarterly Review',
    'Reintegration Planning',
    'Crisis Review',
    'Progress Assessment',
    'Family Involvement Conference',
    'Closing Conference',
]

PARTICIPANT_POOLS = [
    'Social Worker, Resident, House Mother',
    'Social Worker, Resident, Family Members',
    'Social Worker, Resident, Psychologist',
    'Social Worker, Resident, House Mother, Psychologist',
    'Social Worker, Resident, Family Members, Safehouse Director',
    'Social Worker, Resident, Legal Guardian',
    'Social Worker, Case Supervisor, Resident',
    'Social Worker, Resident, House Mother, Family Members',
]

SUMMARIES_BY_TYPE = {
    'Initial Case Conference': [
        'Conducted initial assessment of resident background and needs. Intervention plan goals established.',
        'First conference completed. Family situation assessed, initial goals and timelines set.',
        'Baseline assessment done. Resident oriented to program expectations and rights.',
    ],
    'Quarterly Review': [
        'Reviewed progress against intervention plan targets. Health and education on track.',
        'Quarterly check-in completed. Some goals progressing well, counseling attendance improved.',
        'Progress reviewed across all domains. Risk level re-evaluated, no escalation needed.',
        'Routine quarterly review. Resident showing positive behavioral changes.',
    ],
    'Reintegration Planning': [
        'Family readiness assessed. Reintegration timeline discussed with all parties.',
        'Reintegration steps mapped out. Family cooperation confirmed, trial visit scheduled.',
        'Discussed reintegration options. Resident expressed readiness, family assessment pending.',
    ],
    'Crisis Review': [
        'Emergency conference called following safety concern. Immediate interventions put in place.',
        'Crisis review conducted. Resident support plan updated and monitoring increased.',
        'Unplanned conference due to escalated behavior. Additional counseling sessions scheduled.',
    ],
    'Progress Assessment': [
        'Mid-cycle progress check. Resident meeting most targets; education goal requires attention.',
        'Formal progress assessment completed. Adjustments made to counseling approach.',
        'Assessment shows strong improvement in health and emotional wellbeing.',
    ],
    'Family Involvement Conference': [
        'Family members attended conference. Communication plan agreed upon by all parties.',
        'Family engagement conference. Discussed visit schedule and reintegration readiness.',
        'Family dynamics reviewed. Cooperation level improved since last visit.',
    ],
    'Closing Conference': [
        'Case closure conference completed. Transition plan finalized and documented.',
        'Final conference before reintegration. All goals reviewed, follow-up schedule set.',
        'Closing documentation completed. Resident and family briefed on post-placement support.',
    ],
}

DECISIONS_BY_TYPE = {
    'Initial Case Conference': [
        'Intervention plan approved. Health and education enrollment to begin within 2 weeks.',
        'Goals set for first 90 days. Weekly counseling sessions approved.',
        'Initial plan finalized. Assigned social worker to conduct monthly home visits.',
    ],
    'Quarterly Review': [
        'Continue current intervention plan with minor adjustments to education targets.',
        'Increase counseling frequency to twice weekly based on progress assessment.',
        'Maintain current plan. Next review scheduled in 3 months.',
        'Risk level updated. No changes to current intervention plan required.',
    ],
    'Reintegration Planning': [
        'Trial home visit approved for next month. Family support services to be arranged.',
        'Reintegration date tentatively set. Social worker to conduct weekly home visits.',
        'Family visit schedule confirmed. Reintegration coordinator assigned.',
    ],
    'Crisis Review': [
        'Temporary safety protocol enacted. Additional supervision and counseling ordered.',
        'Incident documented. Case escalated to supervisor for review.',
        'Immediate follow-up visit scheduled. Resident placed on heightened monitoring.',
    ],
    'Progress Assessment': [
        'Goals adjusted based on current progress. New targets set for next cycle.',
        'Education plan to be reviewed with school coordinator. Health goals maintained.',
        'Counseling approach modified. Progress reassessment in 6 weeks.',
    ],
    'Family Involvement Conference': [
        'Monthly family contact schedule agreed upon. Social worker to facilitate visits.',
        'Family to attend next progress review. Communication channel established.',
        'Family support services referred. Next family conference in 2 months.',
    ],
    'Closing Conference': [
        'Case formally closed. Post-placement monitoring to continue for 6 months.',
        'All documentation finalized. Transition support services activated.',
        'Case closure approved by supervisor. Follow-up visit scheduled for 30 days post-placement.',
    ],
}

# ── Load residents ────────────────────────────────────────────────────────────
cur.execute("""
    SELECT resident_id, assigned_social_worker, date_of_admission, date_closed, case_status
    FROM residents
    ORDER BY resident_id
""")
residents = cur.fetchall()
print(f'Seeding case conferences for {len(residents)} residents...')

TODAY = date(2026, 4, 8)
rows = []

for resident_id, social_worker, admission_date, date_closed, case_status in residents:
    if not admission_date:
        continue

    end_date = date_closed if date_closed else TODAY
    total_days = (end_date - admission_date).days
    if total_days < 30:
        continue

    # Determine number of conferences based on length of stay
    months = total_days / 30
    num_conferences = max(3, min(8, int(months / 3)))

    # Space conferences evenly with some randomness
    conference_dates = []

    # Always start with an initial conference ~1-2 weeks after admission
    initial_date = admission_date + timedelta(days=random.randint(7, 14))
    conference_dates.append(initial_date)

    # Spread remaining conferences across the stay
    interval = total_days // num_conferences
    for i in range(1, num_conferences - 1):
        base = admission_date + timedelta(days=interval * i)
        jitter = random.randint(-14, 14)
        conf_date = base + timedelta(days=jitter)
        conf_date = max(initial_date + timedelta(days=30), min(conf_date, end_date - timedelta(days=7)))
        conference_dates.append(conf_date)

    # Closed cases get a closing conference near end
    if case_status in ('Closed', 'Transferred') and date_closed:
        closing_date = date_closed - timedelta(days=random.randint(3, 14))
        conference_dates.append(closing_date)

    conference_dates = sorted(set(conference_dates))

    for i, conf_date in enumerate(conference_dates):
        # Assign type based on position
        if i == 0:
            conf_type = 'Initial Case Conference'
        elif i == len(conference_dates) - 1 and case_status in ('Closed', 'Transferred'):
            conf_type = 'Closing Conference'
        elif random.random() < 0.1:
            conf_type = 'Crisis Review'
        elif i % 3 == 0:
            conf_type = 'Reintegration Planning' if random.random() < 0.4 else 'Family Involvement Conference'
        else:
            conf_type = random.choice(['Quarterly Review', 'Progress Assessment'])

        participants = random.choice(PARTICIPANT_POOLS)
        summary = random.choice(SUMMARIES_BY_TYPE[conf_type])
        decisions = random.choice(DECISIONS_BY_TYPE[conf_type])

        # Next conference date — only for non-closing conferences
        next_conf_date = None
        if conf_type != 'Closing Conference':
            next_interval = random.randint(60, 100)
            candidate = conf_date + timedelta(days=next_interval)
            if candidate > TODAY:
                next_conf_date = candidate  # upcoming
            elif candidate <= end_date:
                next_conf_date = candidate  # historical (was planned)

        rows.append((
            resident_id,
            conf_date,
            conf_type,
            participants,
            summary,
            decisions,
            next_conf_date,
            social_worker,
        ))

# ── Insert ────────────────────────────────────────────────────────────────────
cur.executemany("""
    INSERT INTO case_conferences
        (resident_id, conference_date, conference_type, participants, summary, decisions_made, next_conference_date, social_worker)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
""", rows)

conn.commit()
print(f'Inserted {len(rows)} case conferences.')

# ── Quick summary ─────────────────────────────────────────────────────────────
cur.execute("SELECT conference_type, COUNT(*) FROM case_conferences GROUP BY conference_type ORDER BY COUNT(*) DESC")
print('\nBreakdown by type:')
for row in cur.fetchall():
    print(f'  {row[0]}: {row[1]}')

cur.execute("SELECT COUNT(*) FROM case_conferences WHERE next_conference_date > %s", (TODAY,))
print(f'\nUpcoming conferences (next_conference_date in future): {cur.fetchone()[0]}')

conn.close()
print('\nDone.')
