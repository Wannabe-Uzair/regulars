# The stall briefing: spoken answers

For the four of us to read tonight. These are the answers for questions the A4 sheet doesn't cover, from tonight's
stall critique (S19 to S43). The A4 sheet stays the one on the table.

Tonight's build is the redesign, in the new name. The app and the home page say Regulars, and nothing on screen says
Tenure. In stall mode the home page has no sign-up, and the Sample data tag shows on every app screen. The app is light
only, with no theme toggle. The four statuses are shapes, with red only for Slipping: a filled dot for On the line, a
half ring for Below the line, an empty ring for New, and a falling triangle for Slipping.

What moved in the redesign:

- **Reset the Demo** is now a quiet button at the foot of the home page, under the sources. Try the Demo is in the bar
  at the top, under the headline and near the end.
- **The kiosk** switches between Phone Number and Name. A new visitor taps Join the Gym, then Join and Check In.
- **On a phone**, the bar at the bottom has five tabs: Today, Board, Members, Reports and Settings. Log Out is at the
  end of Settings, under Account.
- **Settings** opens on two QR codes: Kiosk first, then Open on a Phone (laptop only). Each link stays hidden until
  you press Show Link.
- **The Nudge sheet** offers Text Message, WhatsApp and Copy Message, with Cancel at the top left. Once a nudge is
  recorded, the row's button reads Nudged, with a check.

If the stall runs stall-fallback, Reset the demo sits beside Try the demo under the headline; `docs/DEMO.md` lists the
other differences.

On price, all four of us say the same line: "The plan we'd test: a free 90-day pilot, then $99 a month per gym. Not on
sale yet. That price was set for US gyms, and today this is a prototype."

Each item is the question, then the words to say. The id in brackets is the critique's finding.

## Members, consent and privacy

**"Do members know they're tracked, and called slipping? Can they say no to the messages? Is this legal here?"** [S19]

"Members check themselves in at the front desk, and only their gym's owner and their own coach see their visits.
'Slipping' is a word for staff; members never see it. Nothing is sent from Regulars: a coach writes from their own
phone, to a member who gave the gym their number, and can change every word. A notice at the kiosk, a 'don't message me' switch
and a time limit on old records aren't built yet. They come, checked by a lawyer, before a real gym uses it."

**"What happens in Ramadan, or over Eid?"** [S23]

"You're right: in Ramadan and over Eid nearly everyone comes less, so the app would flag them as slipping. The
prototype doesn't allow for that yet. A gym would hold off nudges in those weeks, and pauses for Ramadan and Eid come
before a gym here uses it."

## Coaches, contact and gender

**"Should a male trainer be messaging a female member on WhatsApp?"** [S20]

"Good point. At a gym here, women coaches would look after women members: the owner sets each member's coach, and Copy
Message lets the front desk send from the gym's own WhatsApp instead of a coach's phone. A rule for who contacts whom
isn't in the prototype yet."

**"The brochure says one tap opens a text. Who sends it?"** [S26]

"The tap opens the coach's own Messages or WhatsApp with the text filled in. The coach reads it and presses send;
nothing is ever sent from Regulars."

In the pitch, say "one tap opens a personal text from you or their coach, ready to send", not "sends".

**"How do I know a coach already reached him?"** [S37]

"Today shows who is slipping, not who was nudged. The Nudge button turns to Nudged only on the phone that sent it. Each
member's page lists every nudge, and Reports counts which ones brought the member back."

**"This message says 'this week', but he's been gone 52 days."** [S38]

"For long gaps the coach picks another message, or writes their own."

Demo the nudge with Sam O., not Kyle P. at the top of the list.

## The business and what's next

**"Why the US and not Pakistan?"** [S22]

"We pitched it to independent gyms in the US first, because gyms there already pay for software like this, and the
market figures we quote are American. Nothing in the app is tied to the US: a gym can choose Pakistan, it runs on local
time, and coaches can send the message on WhatsApp. We haven't priced it for Pakistan or tried it with a gym here."

**"Two members at under $50 don't make $99. How does it pay for itself?"** [S27]

"Two members at up to $50 each come close to $99 in the first month, and every member you keep goes on paying, so from
the second month the members kept bring in more than the price. That's the US sum. At Pakistani fees it would need a
different price, which we haven't set."

**"What's next? How does your first customer arrive?"** [S28]

"Next is a pilot with one or two gyms. Before that we need hosting, a security review and email, because this demo runs
offline on this laptop. We haven't picked a first market: the pitch was built for US gyms, and the app also supports
Pakistan, the UK, Canada and the UAE. Payments aren't set up. Charging from Pakistan needs a payment provider that works
here, and we'd settle that before charging anyone."

**"Have you talked to gym owners?"** [S28]

Uzair writes the true answer here tonight, with the number: ____________

If none: "Not yet. That's our first step after the expo."

**"How would my gym start?"** [S29]

"Four steps. The owner signs up and imports the member list from a spreadsheet. They invite their coaches by link, and
each coach sees only their own members. A phone or tablet at the front desk runs the kiosk, and members type their phone
number to check in. Each morning coaches open Today and message whoever is slipping, and once a month the owner reads
Reports. Today's demo shows the last two steps; the import and staff screens aren't in it yet."

**"Does it work with our fingerprint attendance machine?"** [S29]

"The app doesn't connect to attendance machines yet. Many can export attendance to a spreadsheet, and its import is
built to take check-ins from a CSV file, but we haven't tried any machine's file."

**"Does it handle fees?"** [S29]

"The app doesn't handle fees or payments; it only counts visits."

## The name

**"Why 'Regulars'? Is it trademarked?"** [S31]

"Regulars are the members who keep coming back, and turning new members into regulars is the product's whole job. It's
the word gym owners already use for them. It's a working name: we haven't registered it anywhere, and we'll run a trademark
search before we settle on it."

**"Doesn't someone already use that name?"** [S31]

"It's an everyday word, and a few loyalty apps for cafés, shops and bars use it. Our first check of US trademark
records found no live filing for software under it, only pending ones for clothing and for food. That isn't a full search, so we'll run
one before we settle on the name."

**"I've seen it called Tenure. Which is it?"** [S31]

"Tenure was the working name until last night. The product is Regulars now."

Never add ® or say "registered".

## How we built it

**"Did you build this with AI?"** [S21]

"We built it with AI coding tools: Claude wrote most of the code and drafts of the kit, to our specs. We made the
product decisions, set the rules, and reviewed and tested it, and we answer for it. The product itself has no AI in it:
it counts visits and applies fixed rules."

Uzair checks tonight that every part of this is true. Q8's "No" on the A4 sheet is about the product only.

## The demo's numbers and words

**When you first show Today** [S30]

"The line is 3 visits a week. On the line means 3 or more last week: that's the good one. Below the line is 1 or 2, a
warning. Slipping, the red flag, is two weeks in a row under 2, early enough to act before a member falls under once a
week."

**"What's a nudge?"** [S30]

"A nudge is the coach's short message to the member."

**"What's IHRSA?"** [S30]

"IHRSA is the US gym industry association, now called the Health & Fitness Association."

**"Why are there two Kyles and three Esthers?"** [S33]

"The names are drawn at random from a list, and who slips comes from made-up visit patterns, not from the names."

**"Why are most of the members new?"** [S34]

"The sample gym only holds members who joined since June, so most of it is new. A real gym imports its whole list, and
only the first 90 days go on the board."

**"How is 1.7 a week on the line?"** [S35]

"Status reads last week: Owen made 3 visits, so he's on the line. Pace averages the last three weeks, and 0, 2 and 3
make 1.7. It takes two weak weeks in a row to slip, so Esther, with one empty week, is below the line but not slipping
yet."

**"Today says 60 new members, but only 8 are tagged New."** [S36]

"New members means anyone in their first 90 days. The New tag means fewer than two finished weeks, too early to judge.
On the chart, Slipped means no visit in 14 days. On the board, Slipping means two weak weeks in a row."

**"This member checked in today. Why are they still under Slipping Now?"** [S39]

"Slipping is judged on finished weeks. Today's visit counts in this week. If they make 2 visits by the end of it, they
leave Slipping then."

**"Members who stay hit 3 a week, but your chart shows them under 3."** [S40]

"Still coming is a loose group: anyone who visited in the last 14 days, including members below the line. The gap that
matters is between the two lines: by week 13, members who slipped average 0.4 visits a week."

**"Is Slipping Now sorted? 50 days sits below 11."** [S41]

"Mike, the owner, also coaches, so his own members come first, then everyone else's, longest gone first."

**"I checked in, but my square is empty."** [S42]

"This week's square fills when the member reaches 3 visits, the line. Until then it's an outline. Your check-in is
counted, and Today lists it."

**"13 squares for 90 days? 13 times 7 is 91."** [S43]

"90 days is 12 weeks and 6 days, so the 13th square is a 6-day week. Reports scales it to read like a full week."

## The pitch and its claims

**Opening the pitch** [S32]

Before the first line, say: "Assalam-o-Alaikum, and good morning. We're the team behind Regulars…" Using both greets
non-Muslim guests too.

**"Your slide says most gym software shows who canceled. Mine already flags members at risk."** [S24]

"Some gym systems do flag members at risk, often on their bigger plans. Ours is the narrow version: only a new
member's first 90 days, one rule anyone can check, and messages from the coach's own phone."

Don't say the canceled line aloud. Slide 7 and its notes now carry only the narrow version.

**"Which study are 78% and 59% from?"** [S25]

"They come from a 2001 UK industry study, 'Winning the Retention Battle', which is usually credited to IHRSA. It looked
at members' first month: those who came 3 or more times a week renewed 78% of the time, and those
under once a week, 59%. We haven't seen the original report, so take it as a rough guide."

**"Is 6 in 10 true of all new members?"** [S25]

"It's one study. Sperandei and colleagues followed about 5,000 members of one gym in Rio de Janeiro (Journal of Science
and Medicine in Sport, 2016), and 63% had stopped by month three. It shows the pattern; we don't have a Pakistani figure yet."
