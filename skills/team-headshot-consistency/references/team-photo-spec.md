# Team photo spec (fill in for this team)

Share this with everyone who will supply a photo, and with the person who adds new hires to the page.

| Item | Spec | Why |
|---|---|---|
| Aspect ratio | <match the page, e.g. 1:1 or 4:5> | Avoids per-photo cropping in CSS |
| Export size | <e.g. 800×800 px, JPEG quality ~85, under 200 KB> | Sharp on 2× screens without slowing the page |
| Head position | Top of head 8–10% below the top edge; eyes on the upper third line | Heads line up across a grid |
| Head size | Head roughly 45–55% of the frame height | Prevents one tiny and one huge face |
| Background | <one colour, e.g. #F2F2F2, or one location> | The most visible inconsistency in a grid |
| Lighting | Soft front or window light; no coloured light | Keeps skin tones consistent |
| Colour temperature | Neutral; correct warm indoor shots | Mixed warm/cool photos look like different companies |
| Attire | <one register: e.g. business casual, no logos> | |
| Expression | <all smiling or all neutral> | |
| Pose | Shoulders slightly angled, face to camera | |
| File naming | `firstname-lastname.jpg`, lowercase, hyphens | Predictable paths in code |
| Alt text | "<Full name>, <role>" | Accessibility |

When a new photo arrives: run `team_audit.py` on the folder; if it is flagged, ask for a retake against this spec before publishing.
