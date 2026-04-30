# Power Platform Architect Plugin
![banner](https://i.imgur.com/rIJLfiL.png)
A plugin for GitHub Copilot that acts as a **Senior Solution Architect for the Microsoft Power Platform**. Give it business requirements, use case descriptions, or even raw meeting transcripts, and it produces a tailored technical architecture, complete with component recommendations and an optional Mermaid.js diagram.

## Installation
```bash
copilot plugin install power-platform-architect@awesome-copilot
```

## Demo
*Click the image below for a quick demo of this agent skill!*

[![link](https://i.imgur.com/UnImFhl.png)](https://youtu.be/tn4jEpZ6jiw)

## What's Included
### Skills
| Skill | Description |
| --- | --- |
| `power-platform-architect` | Generate a functional Power Platform architecture from business requirements |

## How It Works
The skill guides the agent through a structured, multi-phase process (though the output is presented seamlessly to the user):

1. **Requirements Analysis** — Scans the provided material for stakeholders, data sources, security needs, and functional asks. Documents the current ("As-Is") process and identifies friction points.
2. **Follow-Up Questions** — The agent asks clarifying questions to fill gaps (e.g., "Is this for mobile field workers or desktop back-office users?", "What triggers this process?"). If the user can't answer, it makes reasonable assumptions.
3. **Component Recommendation** — Selects only the Power Platform components that serve a real purpose in the solution and explains the role each one plays. It follows a built-in decision framework (e.g., external access → Power Pages, data storage → Dataverse, conversational interface → Copilot Studio).
4. **Architecture Narrative** — Delivers a business-process-oriented architecture recommendation that tells the "story" of how data flows through the system, which components handle each step, and which user audiences interact at each point.
5. **Architecture Diagram (Optional)** — On request, generates a Mermaid.js diagram visualizing the architecture, saves it to a `.md` file, and directs the user to [mermaid.ai/live/edit](https://mermaid.ai/live/edit) to render it.

All you have to do: **give a problem statement**! You can even supply it with a meeting transcript in which a problem/need was described:

![example](https://i.imgur.com/IH1JsPZ.jpeg)

The skill covers the full Power Platform ecosystem: **Power Apps** (Canvas, Model-Driven, Code Apps), **Power Pages**, **Copilot Studio**, **Power Automate** (Cloud & Desktop Flows), **AI Builder**, **Dataverse**, **Power BI**, **Connectors**, and **Gateways**.

## Example Prompts
- *"Review this transcript from our discovery session and tell me how to build it."*
- *"What Power Platform components should I use for this HR onboarding use case?"*
- *"Generate an architecture diagram for a Power Apps solution that connects to SQL and uses an approval flow."*

## Example Output Architecture Diagram (rendered in [mermaid](https://mermaid.js.org/))
![example](https://i.imgur.com/eR1Og3W.png)

## Example Output Architecture Summary
```
Solution Architecture — End-to-End Process

1. Application Submission (Residents & Contractors → Power Pages)

Residents and solar contractors visit the Evergreen County Solar Permit Portal (Power Pages). The portal presents a
guided application form with required fields, document upload slots (site plan, electrical diagrams, signed
checklist), and fee acknowledgment. Built-in form validation prevents submission if mandatory fields are blank or
required attachments are missing — this is the first line of defense against incomplete applications.

For walk-in or mailed applications, Marcus's team enters the data directly into the Model-Driven App, which enforces
the same required-field rules.

All submitted applications land in Dataverse with a status of Submitted.

2. Automated Completeness Check (Power Automate + AI Builder)

Upon submission, a Power Automate cloud flow (automated trigger: new record created) fires immediately. It performs
a programmatic completeness check — verifying all required attachments are present, fee acknowledgment is recorded,
and applicant details are complete.

For uploaded documents, AI Builder's Document Processing model scans the site plan and signed forms to verify that
signature fields are not blank and key data areas are populated. This catches the subtle defects Marcus described —
"referenced but not included" attachments and illegible or unsigned documents.

 - If complete: The permit status advances to Under Review and the flow routes it to the assigned plan reviewer 
(Jim's team).
 - If incomplete: The status is set to Incomplete, and Power Automate sends an automated email notification to the 
applicant via the Outlook connector detailing exactly what's missing. The applicant can log back into the Power 
Pages portal to upload corrections. No staff time is consumed.

3. Plan Review & Approval (Jim's Team → Model-Driven App)

The assigned plan reviewer opens the permit in the Model-Driven App, which surfaces all applicant data, documents,
and the AI validation results in a single view. The reviewer evaluates the application and either:

 - Approves → Power Automate advances the status to Approved – Pending Inspection and notifies the applicant via 
email that their permit is approved and an inspection will be scheduled.
 - Requests Revisions → Status set to Revisions Requested, the applicant is emailed with specific feedback, and they
 resubmit through the portal.
 - Denies → Status set to Denied with documented reasoning; applicant is notified.

4. Inspection Scheduling & Field Work (Sarah's Team → Canvas App Mobile)

Once a permit reaches Approved – Pending Inspection, Marcus's team schedules an inspection date via the Model-Driven
App. The applicant is notified of the date through an automated email.

Before leaving the office, Sarah opens the Canvas App on her phone/tablet and reviews her day's inspection queue.
Each permit shows its live status — if a fee issue surfaced or the applicant requested a reschedule, Sarah sees it
immediately and can reroute to a ready site. No more wasted 40-minute drives.

On-site, Sarah uses the Canvas App to:

 - Complete a structured inspection checklist (roof mounts, junction boxes, conduit, serial plates)
 - Capture photos directly through the app — each photo is automatically linked to the permit record in Dataverse at
 the moment it's taken (no more manual matching from a memory card)
 - Record pass/fail results and notes

Results sync to Dataverse in real time. The moment Sarah submits, the office has the inspection outcome — not days
later.

5. Permit Issuance or Corrective Action (Power Automate)

When Sarah submits inspection results:

 - Pass → Power Automate sets status to Permit Issued, generates a confirmation, and notifies the applicant that 
their solar installation is approved.
 - Fail → Status set to Inspection Failed – Corrections Required, with Sarah's notes and photos attached. The 
applicant is notified of required corrections and can schedule a re-inspection through the portal.

6. Self-Service Status Tracking (Residents & Contractors → Power Pages)

At any point in this process, residents and contractors can log into the Power Pages portal and see their permit's
current status, what stage it's in, whether payment has been recorded, and what the next step is. This directly
addresses the top three phone questions Marcus cited:

 1. ✅ "Did you receive my check?" → Payment status visible on portal
 2. ✅ "What is the status of my permit?" → Live stage tracking
 3. ✅ "When is the inspector coming?" → Scheduled date displayed

7. Live Analytics & Audit Readiness (Elena & Jim → Power BI)

A Power BI dashboard connects directly to Dataverse and provides:

 - Time-to-Permit metrics (average, median, by stage)
 - Backlog heatmap — how many permits are sitting in each stage right now
 - Inspection throughput — inspections completed per day/week, pass/fail rates
 - "Green Energy" permit counts by quarter — the exact metric the County Auditor requests
 - Incomplete application rate trends — tracking whether the portal validation is reducing the 40% defect rate

Elena can answer Board and Auditor questions on demand with live data — no staff time diverted to manual counting.

-------------------------------------------------------------------------------------------------------------------

Summary

This architecture replaces the disconnected paper-based process with a single integrated data backbone (Dataverse)
that every stakeholder touches through the right interface for their role:

┌──────────────────────────┬─────────────────────┬──────────────────────────┐
│ Audience                 │ Interface           │ Purpose                  │
├──────────────────────────┼─────────────────────┼──────────────────────────┤
│ Residents & Contractors  │ Power Pages Portal  │ Submit, track, resubmit  │
├──────────────────────────┼─────────────────────┼──────────────────────────┤
│ Marcus (Intake)          │ Model-Driven App    │ Review, schedule, manage │
├──────────────────────────┼─────────────────────┼──────────────────────────┤
│ Jim (Planning/Review)    │ Model-Driven App    │ Approve/reject permits   │
├──────────────────────────┼─────────────────────┼──────────────────────────┤
│ Sarah (Field Inspectors) │ Canvas App (Mobile) │ Inspect, capture, submit │
├──────────────────────────┼─────────────────────┼──────────────────────────┤
│ Elena & Jim (Leadership) │ Power BI Dashboards │ Monitor, report, audit   │
└──────────────────────────┴─────────────────────┴──────────────────────────┘

The expected impact directly addresses Elena's four strategic needs and Jim's prediction: cut the backlog in half
without hiring a single new person.
```

## Source
Created by [Tim Hanewich](https://timh.ai), Senior AI Solution Engineer at Microsoft.

## License
MIT
