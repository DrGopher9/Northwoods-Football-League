// scripts/rulesData.js
// Minimal, structured source for the Rules page.
// Add/extend safely—IDs become deep links (#gameplay-4th-down), so keep them stable.

export const RULES = [
  {
    id: "intro",
    title: "Section 1 — Introduction",
    items: [
      {
        id: "league-intro",
        heading: "League Introduction",
        html: `
          <ul>
            <li>NWFL is a realistic sim Madden league founded Nov 2019. Commissioners may rule on matters even if not explicitly listed.</li>
            <li>All members must fully understand the rules—especially <em>gameplay</em>. Maturity is expected.</li>
          </ul>
        `
      },
      {
        id: "joining",
        heading: "Joining the League (Coaches, Rosters, NeonSportz)",
        html: `
          <ul>
            <li><strong>Join as a Custom Head Coach.</strong> Don’t fire/hire new coordinators immediately.</li>
            <li><strong>No immediate roster changes</strong>—see Roster Management first.</li>
            <li><strong>Join NeonSportz</strong>—stats, rosters, trades are tracked there (no trades without it).</li>
          </ul>
        `
      },
      {
        id: "activity",
        heading: "League Activity & Absences",
        html: `
          <ul>
            <li>Discord is the main hub; keep it respectful. Report absences longer than one advance in <code>#absence-reporting</code>.</li>
            <li>Fair Sim for first missed game; Autopilot afterward. Long/unchecked absences → Inactivity Watch, then removal.</li>
          </ul>
        `
      },
      {
        id: "scheduling",
        heading: "Scheduling Games",
        html: `
          <ul>
            <li>Be proactive; include your timezone. Use weekly threads to coordinate.</li>
            <li>FWs are considered only with evidence: no response, agreed FW, no-show/30+ min late, or repeated good-faith attempts.</li>
          </ul>
        `
      },
      {
        id: "advance",
        heading: "League Advance Times",
        html: `
          <ul>
            <li>Mon–Wed–Fri at 10:59 PM Central (sooner if all games complete). Super Bowl is scheduled by the finalists.</li>
          </ul>
        `
      },
      {
        id: "streaming",
        heading: "Streaming",
        html: `
          <ul>
            <li><strong>Required for every game (user vs user or CPU)</strong> with VODs available for review.</li>
            <li>Twitch recommended; enable “Store Past Broadcasts” + “Always Publish VODs”. Turn off Madden soundtrack for DMCA safety.</li>
          </ul>
        `
      },
      {
        id: "quitting",
        heading: "Quitting & Rejoining",
        html: `
          <ul>
            <li>Leaving → season-long suspension; a second time → suspended until next Madden. Multiple times may lead to permanent ban.</li>
            <li>If kicked, commissioners determine temporary/permanent suspension case-by-case.</li>
          </ul>
        `
      },
      {
        id: "switching",
        heading: "Switching Teams",
        html: `
          <ul>
            <li>Allowed once per cycle, only in offseason (or after both are eliminated). No trading with your swap partner for 1 full season.</li>
          </ul>
        `
      },
      {
        id: "punishment",
        heading: "Punishment System",
        html: `
          <ul>
            <li><strong>Tier 1</strong>: Warning.</li>
            <li><strong>Tier 2</strong>: Player suspension(s) for repeated/impactful issues.</li>
            <li><strong>Tier 3</strong>: Removal from NWFL for persistent violations.</li>
          </ul>
        `
      }
    ]
  },

  {
    id: "gameplay",
    title: "Section 2 — Gameplay",
    items: [
      {
        id: "offense-playcalling",
        heading: "Offense — Playcalling & Pre-Snap",
        html: `
          <ul>
            <li>Mix play-calling; avoid money plays/one-play TD spam. Custom playbooks allowed.</li>
            <li>Min total attempts per game: <strong>10 rushes + 10 passes</strong> (rare exceptions upon VOD review).</li>
            <li>Goal-line / 0-WR / 6-OL: only in goal-to-go or within 1 yard of first down.</li>
            <li>No immediate sideline rollouts without pressure; Player Lock is banned; Gun Monster is banned.</li>
            <li><strong>Motion snapping prohibited</strong>; if you motion, the player must be set for at least 1 second.</li>
            <li>Use hot routes sparingly; call realistic concepts. Audible rather than re-routing everyone constantly.</li>
          </ul>
        `
      },
      {
        id: "ingame",
        heading: "In-Game Adjustments",
        html: `
          <ul>
            <li>No-huddle sparingly (2-minute, crucial drives). You must audible out of the previous play each time.</li>
            <li>Chew Clock is <strong>not</strong> allowed in overtime.</li>
          </ul>
        `
      },
      {
        id: "fourth-down",
        heading: "4th Down Rule",
        html: `
          <ul>
            <li>Acceptable: <strong>4th & ≤3 behind the 50</strong>; <strong>4th & ≤6 at/over the 50</strong>;
                <strong>4th & ≤15</strong> any time while <em>losing in the 2nd half</em> (within 24); or when Madden suggests it.</li>
            <li>Fake FG/Punts: only when tied or losing, following the same yardage limits.</li>
            <li>One “Coach’s Decision” per game (≤ 4th & 15).</li>
            <li>While up by 17+, go by exceptions listed (no unnecessary 4th-down attempts).</li>
          </ul>
        `
      },
      {
        id: "two-point",
        heading: "2-Point Conversion",
        html: `
          <ul>
            <li>When Madden suggests it (to make scores multiples of 7) or when losing/late to tie or take a 1-pt lead.</li>
          </ul>
        `
      },
      {
        id: "endgame",
        heading: "Endgame/Kneel",
        html: `
          <ul>
            <li>Leading by 2+ scores under 1:00 in the 4th with opponent 2 or fewer timeouts → kneel out.</li>
          </ul>
        `
      },
      {
        id: "defense-playcalling",
        heading: "Defense — Playcalling & Usering",
        html: `
          <ul>
            <li>Match offensive personnel; wait for offense to pick first. Punt Block 44 banned. Rush at least <strong>three</strong> every down.</li>
            <li><strong>Man Blitz cap</strong>: Cover 0/1 on ≤50% of your calls.</li>
            <li><strong>SUB LB</strong>: Max one FS/SS (90 SPD or lower) at SUB LB on any down.</li>
            <li>Follow your user assignment; no hovering over DL; no moving DBs into the tackle box (limited blitz exceptions).</li>
            <li>No user-swerving around disengaged blockers beyond QB’s dropback depth.</li>
          </ul>
        `
      },
      {
        id: "runningup",
        heading: "Running Up the Score & Stat Padding",
        html: `
          <ul>
            <li>Use kneels, chew clock (not in OT), play for FG when far ahead, down INTs/fumbles late, sub backups (see 31+ Rule).</li>
            <li>Passing while up 24+ should be clock-draining, not deep shots (unless 3rd & long).</li>
          </ul>
        `
      },
      {
        id: "single-game-limits",
        heading: "Single-Game Stat Limits",
        html: `
          <ul>
            <li>QB: 50–55 att, 400 yds, 5 TD</li>
            <li>RB: 25–28 car, 200 yds, 3 TD</li>
            <li>WR/TE: 10–12 rec, 200 yds, 3 TD</li>
            <li>DL/Edge: 4.0 sacks</li>
            <li>Season ratios: ≤60% run, ≤67% pass</li>
          </ul>
        `
      },
      {
        id: "31-rule",
        heading: "31+ Rule (Blowout)",
        html: `
          <ul>
            <li>Lead of 27+ at start of 4th → within one possession, bench starters once they hit listed milestones
                (QB 250+/3+ TD; RB 100+/2+ TD; WR/TE 100+/2+ TD; Defense 3.0+ sacks or 2+ takeaways or 1+ TD).</li>
            <li>Opponents must allow time to sub. Losing side may not sabotage.</li>
          </ul>
        `
      },
      {
        id: "desyncs",
        heading: "Desyncs & Concedes",
        html: `
          <ul>
            <li>Play games once; CPU restarts not allowed. Pauses: coordinate in the thread before resuming.</li>
            <li>Desyncs → replay to halftime or agreed point; commissioners set FW afterward.</li>
            <li>Concede properly from pause menu so stats save. Limits and penalties apply (e.g., 27+ in 2nd half up to 2x/season).</li>
            <li>No conceding in playoffs.</li>
          </ul>
        `
      }
    ]
  },

  {
    id: "roster",
    title: "Section 3 — Roster Management",
    items: [
      {
        id: "roster-limits",
        heading: "Roster Limits & Stacking",
        html: `
          <ul>
            <li>Min 50-man roster at all times.</li>
            <li>Caps on quantity of 85+ OVR by position group to prevent “superteams”.</li>
          </ul>
        `
      },
      {
        id: "mentors",
        heading: "Mentors",
        html: `
          <ul>
            <li>Limits per group (e.g., 1 QB, 1 HB, 1 WR, 2 OL, 2 DT/EDGE, 1 LB, 1 CB, 1 FS/SS).</li>
          </ul>
        `
      },
      {
        id: "player-edits",
        heading: "Player Edits",
        html: `
          <ul>
            <li>All edits must be requested and approved. Jersey #s follow NFL rules; pre-season only.</li>
            <li><strong>QB throwing motions are non-editable.</strong></li>
          </ul>
        `
      },
      {
        id: "position-defs",
        heading: "Position Definitions (EDGE, IDL, NT, LB)",
        html: `
          <ul>
            <li>EDGE = 4-3 DE / 3-4 OLB (pass rushers); IDL = interior DL; NT = >320 lbs run stopper; LB = off-ball coverage/blitz mix.</li>
          </ul>
        `
      },
      {
        id: "position-changes",
        heading: "Position Changes",
        html: `
          <ul>
            <li>Ask first; no depth-chart/formation loopholes. Once changed, no take-backs.</li>
            <li>85+ OVR or SS/XF cannot change (except L/R or definition-aligned moves). Several moves have specific attribute/size gates.</li>
          </ul>
        `
      },
      {
        id: "free-agency",
        heading: "Free Agency & Re-Signing",
        html: `
          <ul>
            <li>Season 1 FA Draft: 1 round, then open market; signed FAs must stay 1 full season.</li>
            <li><strong>Five-Year Rule</strong>: only QBs can sign >5 years (others need proof & are reduced to 5 years while preserving money).</li>
            <li>Mentors signed in FA cannot be below base ask. Playoff teams may not sign FAs until eliminated (injury exception for starters).</li>
          </ul>
        `
      },
      {
        id: "trades",
        heading: "Trades",
        html: `
          <ul>
            <li>Max 3 per season (with specific low-value exceptions). New users must wait 3 in-game weeks.</li>
            <li></li>
            <li>All trades go through NeonSportz and need 3 commissioner approval before in-game processing.</li>
            <li></li>
            <li>No CPU trades; rookie 1st–3rd rounders locked Yr 1; players in Yr 1 of new multi-year deal can’t be traded.</li>
            <li></li>
            <li>Values must be within 200 points; cap-penalty offsets add ghost value (e.g., $10–15M → +150 points).</li>
            <li></li>
            <li>Players ≥2275 value are untradeable | Exception being a player on the last year of their contract.</li>
            <li>Said player may only be traded for a maximum of 2275 points, even if worth higher.</li>
          </ul>
        `
      },
      {
        id: "draft-day",
        heading: "Draft Day",
        html: `
          <ul>
            <li>Pick-only swaps don’t count toward trade limit if within 200 points and approved.</li>
            <li>Future picks submitted at round median (pick 16). Draft capital cap: ≤2 picks in Rd 1, ≤3 in Rds 2–3.</li>
          </ul>
        `
      }
    ]
  }
];
