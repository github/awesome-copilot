import { joinSession } from "@github/copilot-sdk/extension";

import { releaseNotesShowcaseCanvas } from "./releaseNotesShowcase.mjs";

await joinSession({
    canvases: [releaseNotesShowcaseCanvas],
});
