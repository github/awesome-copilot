# Game Publishing

This reference covers the three pillars of publishing web-based games: distribution channels and platforms, promotion strategies, and monetization models.

## Game Distribution

Game distribution encompasses the channels and platforms through which players discover and access your game. Choosing the right distribution strategy depends on your target audience, game type, and business goals.

### Self-Hosting

Self-hosting gives you maximum control over your game and the ability to push instant updates without waiting for app store approval.

- Upload the game to a remote server with a catchy, memorable domain name.
- Concatenate and minify source code to reduce payload size.
- Uglify code to make reverse engineering harder and protect intellectual property.
- Provide an online demo if you plan to package the game for closed stores like iTunes or Steam.
- Consider hosting on GitHub Pages for free hosting, version control, and potential community contributions.

### Publishers and Portals

Independent game portals offer natural promotion from high-traffic sites and potential monetization through ads or revenue sharing.

**Popular independent portals:**

- HTML5Games.com
- GameArter.com
- MarketJS.com
- GameFlare
- GameDistribution.com
- GameSaturn.com
- Playmox.com
- Poki (developers.poki.com)
- CrazyGames (developer.crazygames.com)

**Licensing options:**

- Exclusive licensing: Restrict distribution to a single buyer for higher per-deal revenue.
- Non-exclusive licensing: Distribute widely across multiple portals for broader reach.

### Web Stores

**Chrome Web Store:**

- Requires a manifest file and a zipped package containing game resources.
- Minimal game modifications needed.
- Simple online submission form.

### Native Mobile Stores

**iOS App Store:**

- Strict requirements with a 1-2 week approval wait period.
- Extremely competitive with hundreds of thousands of apps.
- Generally favors paid games.
- Most prominent mobile store but hardest to stand out.

**Google Play (Android):**

- Less strict requirements than iOS.
- High volume of daily submissions.
- Freemium model preferred (free download with in-app purchases or ads).
- Most paid iOS games appear as free-to-play on Android.

**Other mobile platforms (Windows Phone, BlackBerry, etc.):**

- Less competition and easier to gain visibility.
- Smaller market share but less crowded.

### Native Desktop

**Steam:**

- Largest desktop game distribution platform.
- Access via the Steam Direct program for indie developers.
- Requires support for multiple platforms (Windows, macOS, Linux) with separate uploads.
- Must handle cross-platform compatibility issues.

**Humble Bundle:**

- Primarily an exposure and promotional opportunity.
- Bundle pricing model at low prices.
- More focused on gaining visibility than generating direct revenue.

### Packaging Tools

Tools for distributing HTML5 games to closed ecosystems:

| Tool | Platforms |
|------|-----------|
| Ejecta | iOS (ImpactJS-specific) |
| NW.js | Windows, Mac, Linux |
| Electron | Windows, Mac, Linux |
| Intel XDK | Multiple platforms |
| Manifold.js | iOS, Android, Windows |

### Platform Strategy

- **Mobile first:** Mobile devices account for the vast majority of HTML5 game traffic. Design games playable with one or two fingers while holding the device.
- **Desktop for development:** Build and test on desktop first before debugging on mobile.
- **Multi-platform:** Support desktop even if targeting mobile primarily. HTML5 games have the advantage of write-once, deploy-everywhere.
- **Diversify:** Do not rely on a single store. Spread across multiple platforms to reduce risk.
- **Instant updates:** One of the key advantages of web distribution is the ability to push quick bug fixes without waiting for app store approval.

## Game Promotion

Game promotion requires a sustained, multi-channel strategy. Most promotional methods are free, making them accessible to indie developers with limited budgets. Visibility is as important as game quality -- even excellent games fail without promotion.

### Website and Blog

**Essential website components:**

- Screenshots and game trailers.
- Detailed descriptions and downloadable press kits (use tools like Presskit()).
- System requirements and available platforms.
- Support and contact information.
- A playable demo, at least browser-based.
- SEO optimization for discoverability.

**Blogging strategy:**

- Document the development process, bugs encountered, and lessons learned.
- Publish monthly progress reports.
- Continual content creation improves SEO rankings over time.
- Builds credibility and community reputation.

### Social Media

- Use the `#gamedev` hashtag for community engagement on platforms like Twitter/X.
- Be authentic and avoid pushy advertisements or dry press releases.
- Share development tips, industry insights, and behind-the-scenes content.
- Monitor YouTube and Twitch streamers who might cover your game.
- Participate in forums such as HTML5GameDevs.com.
- Engage genuinely with the community. Answer questions, be supportive, and avoid constant self-promotion.
- Offer discounts and contest prizes to build goodwill.

### Press Outreach

- Research press outlets that specifically cover your game's genre and platform.
- Be humble, polite, and patient when contacting journalists and reviewers.
- Avoid mass, irrelevant submissions. Target your outreach carefully.
- A quality game paired with an honest approach yields the best success rates.
- Reference guides like "How To Contact Press" from Pixel Prospector for detailed strategies.

### Competitions

- Participate in game development competitions (game jams) to network and gain community exposure.
- Mandatory themes spark creative ideas and force innovation.
- Winning brings automatic promotion from organizers and community attention.
- Great for launching early demos and building reputation.

### Tutorials and Educational Content

- Document and teach what you have implemented in your game.
- Use your game as a practical case study in articles and tutorials.
- Publish on platforms like Tuts+ Game Development, which often pay for content.
- Focus on a single aspect in detail and provide genuine value to readers.
- Dual benefit: promotes your game while establishing you as a knowledgeable developer.

### Events

**Conferences:**

- Give technical talks about challenges you overcame during development.
- Demonstrate API implementations with your game as a real example.
- Focus on knowledge-sharing over marketing. Developers are particularly sensitive to heavy-handed sales pitches.

**Fairs and expos:**

- Secure a booth among other developers for direct fan interaction.
- Stand out with unique, original presentations.
- Provides real-world user testing and immediate feedback.
- Helps uncover bugs and issues that players find organically.

### Promo Codes

- Create the ability to distribute free or limited-access promo codes.
- Distribute to press, media, YouTube and Twitch personalities, competition winners, and community influencers.
- Reaching the right people with free access can generate free advertising to thousands of potential players.

### Community Building

- Send weekly newsletters with regular updates to your audience.
- Organize online competitions related to your game or game development in general.
- Host local meetups for in-person developer gatherings.
- Demonstrates passion and builds trust and reliability.
- Your community becomes your advocates when you need support or buzz for a launch.

### Key Promotion Principles

| Factor | Importance |
|--------|-----------|
| Consistency | Regular content and engagement across all channels |
| Authenticity | Genuine community interaction, not transactional |
| Patience | Building relationships and reputation takes time |
| Value-first | Provide content worth consuming before asking for anything |
| Multiple channels | Never rely on a single promotional strategy |

## Game Monetization

Monetization strategy should align with your game type, target audience, and distribution platforms. Diversifying income streams provides better business stability.

### Paid Games

**Model:** Fixed, up-front price charged before the player gains access.

- Requires significant marketing investment to drive purchases.
- Pricing varies by market and quality: arcade iOS titles around $0.99, desktop RPGs on Steam around $20.
- Success depends on game quality, market research, and marketing effectiveness.
- Study market trends and learn from failures quickly.

### In-App Purchases (IAPs)

**Model:** Free game acquisition with paid optional content and features.

**Types of purchasable content:**

- Bonus levels
- Better weapons or spells
- Energy refills
- In-game currency
- Premium features and virtual goods

**Key metrics and considerations:**

- Requires thousands of downloads to generate meaningful revenue.
- Only approximately 1 in 1,000 players typically makes a purchase.
- Earnings depend heavily on promotional activities and player volume.
- Player volume is the critical success factor.

### Freemium

**Model:** Free game with optional premium features and paid benefits.

- Add value to the game rather than restricting core content behind a paywall.
- Avoid "pay-to-win" mechanics that players dislike and that damage retention and reputation.
- Do not paywall game progression.
- Focus on delivering enjoyable free experiences first, then offer premium enhancements.

**Add-ons and DLCs:**

- New level sets with new characters, weapons, and story content.
- Requires an established base game with proven popularity.
- Provides additional value for existing, engaged players.

### Advertisements

**Model:** Passive income through ad display with revenue sharing between developer and ad network.

**Ad networks:**

- **Google AdSense:** Most effective but not game-optimized. Can be risky for game-related accounts.
- **LeadBolt:** Game-focused alternative with easier implementation.
- **Video ads:** Pre-roll format shown during loading screens is gaining popularity.

**Placement strategy:**

- Show ads between game sessions or on game-over screens.
- Balance ad visibility with player experience.
- Keep ads subtle to avoid annoying players and hurting retention.
- Revenue is typically very modest for low-traffic games.

**Revenue sharing:** Usually 70/30 or 50/50 splits with publishers.

### Licensing

**Model:** One-time payment for distribution rights. The publisher handles monetization.

**Exclusive licenses:**

- Sold to a single publisher only.
- Cannot be sold again in any form after the deal.
- Price range: $2,000 to $5,000 USD.
- Only pursue if the deal is profitable enough to justify exclusivity. Stop promoting the game after the sale.

**Non-exclusive licenses:**

- Can be sold to multiple publishers simultaneously.
- Publisher can only distribute on their own portal (site-locked).
- Price range: approximately $500 USD per publisher.
- Most popular licensing approach. Works well with multiple publishers continuously.

**Subscription model:**

- Monthly passive revenue per game.
- Price range: $20 to $50 USD per month per game.
- Flexible payment options: lump sum or monthly.
- Risk: can be cancelled at any time by the publisher.

**Ad revenue share:**

- Publisher drives traffic and earnings are split.
- Split: 70/30 or 50/50 deals, collected monthly.
- Warning: new or low-quality publishers may offer as little as $2 USD total.

**Important licensing notes:**

- Publishers may require custom API implementation (factor the development cost into your pricing).
- Better to accept a lower license fee from an established, reputable publisher than risk fraud with unknown buyers.
- Contact publishers through their websites or HTML5 Gamedevs forums.

### Branding and Custom Work

**Non-exclusive licensing with branding:**

- Client buys code rights and implements their own graphics.
- Example: swapping game food items for client-branded products.

**Freelance branding:**

- Developer reuses existing game code and adds client-provided graphics.
- Client directs implementation details.
- Price varies greatly based on brand, client expectations, and scope of work.

### Other Monetization Strategies

**Selling digital assets:**

- Sell game graphics and art assets on platforms like Envato Market and ThemeForest.
- Best for graphic designers who can create reusable assets.
- Provides passive, modest but consistent income.

**Writing articles and tutorials:**

- Publish game development articles on platforms like Tuts+ Game Development, which pay for content.
- Dual benefit: promotes your game while generating direct income.
- Focus on genuine knowledge-sharing with your games as practical examples.

**Merchandise:**

- T-shirts, stickers, and branded gadgets.
- Most profitable for highly popular, visually recognizable games (e.g., Angry Birds).
- Some developers earn more from merchandise than from the games themselves.
- Best as a diversified secondary revenue stream.

**Community donations:**

- Add donate buttons on game pages.
- Effectiveness depends on the strength of your community relationship.
- Works best when players know you personally and understand how donations help continued development.

### Monetization Summary

| Model | Revenue Type | Best For | Risk Level |
|-------|-------------|----------|------------|
| Paid Games | One-time | High-quality games with strong marketing | High |
| In-App Purchases | Per transaction | Popular games with high download volume | Medium |
| Advertisements | Passive/CPM | Casual, addictive games | Low-Medium |
| Non-Exclusive Licensing | One-time (~$500) | All game types | Low |
| Exclusive Licensing | One-time ($2K-$5K) | Proven, quality games | Medium |
| Subscriptions | Monthly passive | Games with established track records | Medium |
| Merchandise | Per sale | Popular franchises with visual identity | High |
| Articles/Tutorials | Per publication | Developers with niche expertise | Low |
