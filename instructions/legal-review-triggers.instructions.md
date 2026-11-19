---
description: 'Flag product and code changes that usually warrant review by a licensed lawyer before shipping, such as new AI providers, agent actions and payments, sensitive data, minors, tracking, and billing.'
applyTo: '**'
---

# Legal Review Triggers

Most code changes carry no legal risk. A few are much cheaper to get right before they ship than after. These instructions help you notice those changes and tell the developer, without slowing down routine work.

## Instructions

- Before building, merging, or launching a change, check whether it matches one of the triggers below.
- If it matches, don't make that part of the change yet. Tell the developer that it may need review by a licensed lawyer before it ships, name the trigger, and explain why in one or two sentences. Wait for the developer to say how to proceed, even if the change looks small.
- Don't flag routine work, such as UI changes, refactors, bug fixes, tests, performance work, or swapping one vendor for another that does the same job, as long as the change matches no trigger below and every catch-all question is answered no. A trigger always wins: switching model providers or removing a confirmation step is flagged even when it looks routine.
- Treat a security incident, or an automated action a user says they never authorized, as urgent: tell the developer right away.
- Don't give legal advice or guess at what the law requires. Your job is to notice the change and say why it may need review.

## Triggers

### AI features
- Launching an AI feature such as insights, summaries, suggestions, chat, or a companion.
- Switching or adding a model provider, or changing its data-retention or training settings.
- Sending a new category of user data into prompts, especially health, financial, location, or minors' data.
- Using model output to make or influence decisions about people: employment, credit, housing, insurance, health care, education.
- Fine-tuning or evaluating models on user data.

### Agent actions
- Letting an agent take a new kind of action for users: send, post, buy, book, file, delete, or run code.
- Removing or relaxing a confirmation step, or adding standing or scheduled instructions.
- Letting an agent spend money, hold funds, or use stored payment methods.
- Operating a website or API as the user, logging in with the user's credentials, or automating a site whose terms restrict it.
- An agent calling, emailing, or messaging people who are not your users.

### Data
- Using user content for anything beyond providing the service: research, comparisons between users, aggregate datasets, marketing.
- Health, wearable, or financial-account integrations.
- Access to contacts, the photo library, the microphone, the camera, or location.
- A new account integration such as calendar, email, storage, or messaging.
- Shared spaces, connections between users, public profiles, or content other users can see.
- Changing what deletion or disconnecting removes, keeping data longer, or moving on-device data to servers.

### Analytics and marketing
- Session replay, heatmaps, or autocapture.
- An analytics event carrying anything a user typed, selected, uploaded, or asked an AI.
- Advertising or install-attribution SDKs, or website pixels.
- Marketing push, SMS, or email to users who have not opted in.

### Payments, audience, and company
- Selling outside the app stores, referrals, promotions, or usage-based billing.
- Allowing users under 18, or marketing to teens or students.
- Launching outside the United States, on a new platform, or through employers, schools, or health providers.
- A vendor for a job you don't already use a vendor for, or storing data outside the United States.
- Raising money, a merger or acquisition, or a new entity.

## Catch-all questions

If a change doesn't match a trigger, ask:
- Does it collect a new kind of information?
- Does it use information for a new purpose?
- Does it let the product take a new kind of action for a user?

If the answer to any is yes, mention it to the developer.

## Additional Guidelines

- Keep the flag short and specific, so the developer can decide quickly.
- When recommending review, recommend a licensed lawyer. A lawyer's license can be confirmed in the licensing body's public directory.
- This list is adapted from the open counsel-triggers list (CC BY 4.0): https://github.com/mandate-law/counsel-triggers
