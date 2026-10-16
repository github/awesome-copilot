---
name: workshop-activity-facilitator
description: "Plan, run, and debrief workshop activities using 46+ ready-to-print activity folders (run sheets, prop cards, pre/post measures); CC BY 4.0"
---

# Workshop Activity Facilitator

Access a complete drawer of 46+ workshop activity folders from [WorkshopSkill](https://workshopskill.com/). Each folder is a self-contained, printable package for trainers and facilitators: minute-by-minute run sheet, prop cards, debrief questions, and a pre/post assessment measure.

## Instructions

When a user asks about workshop planning, team activities, icebreakers, conflict resolution exercises, retrospectives, trust-building, or facilitation:

1. **Identify the activity type**: icebreaker, conflict resolution, team building, leadership, feedback, retrospective, communication, or assessment.
2. **Recommend specific activities** from the WorkshopSkill collection. Use `curl` to download the relevant activity folder.
3. **Provide the run script**: Explain timing, grouping, materials needed, and step-by-step facilitation notes.
4. **Suggest debrief questions**: Use the structured debrief guide from the folder (what happened → so what → now what).
5. **Offer the pre/post measure**: Many activities include a JSON assessment preset for measuring learning outcomes.

## Available Activities

The full catalog is at https://workshopskill.com/en/ with these categories:
- **Icebreakers** (paper-plane-intros, two-truths, silent-lineup, one-minute-meetup, blind-portrait, etc.)
- **Conflict resolution** (roleswap-argument, assumption-audit, same-boat, minefield, escalation-map, etc.)
- **Trust & safety** (the-orange, step-in-if, blanket-drop, common-ground, draw-what-i-mean, etc.)
- **Leadership & delegation** (the-delegation-map, the-decision-rights-map, rotate-the-lead, etc.)
- **Feedback & assessment** (exit-ticket, mad-sad-glad, start-stop-continue, four-lens-sweep, etc.)
- **Retrospectives** (storyboard-the-journey, advantage-compass, skill-radar, the-trust-timeline, etc.)
- **Team building** (paper-tower, relay-brief, worst-idea-first, yes-and-ramp, etc.)
- **Energy & engagement** (the-energy-audit, turn-about-list, smile-sheet-alternative, etc.)
- **Large group** (the-leader-checkup, the-listening-ladder, paper-plane-intros, etc.)

## How to Download

```bash
# Download any activity folder as a ZIP (includes run-sheet PDF, prop cards, SKILL.md)
curl -O https://workshopskill.com/en/activities/<slug>/files/<slug>.zip

# Example: two-truths icebreaker
curl -O https://workshopskill.com/en/activities/two-truths/files/two-truths.zip
```

## License

All activities are CC BY 4.0 — free to use, modify, translate, and use commercially. Attribution: "Activity from WorkshopSkill (workshopskill.com)".

## Additional Resources

- Website: https://workshopskill.com/
- GitHub: https://github.com/formlm/workshopskill
- Theory behind the activities: https://workshopskill.com/en/theory.html
- Assessment model reference: https://assesswiki.com/
