const profile = window.__agentArcadeLayoutProfile === 'canvas' ? 'canvas' : 'desktop';
export const runtimeLayout = {
    profile,
    minimumWidth: profile === 'canvas' ? 320 : 800,
    minimumHeight: profile === 'canvas' ? 220 : 400,
};
export function getWavAudioPath(relativePathWithoutExtension) {
    const extension = profile === 'canvas' ? 'm4a' : 'wav';
    return `../assets/${relativePathWithoutExtension}.${extension}`;
}
export function getAlienLayout(width, height) {
    const canvas = profile === 'canvas';
    const playfieldHeight = canvas ? Math.min(height, width * 3 / 4) : height;
    const playfieldTop = (height - playfieldHeight) / 2;
    return {
        scale: Math.max(canvas ? 1.25 : 0, Math.min(width / 1920, height / 1080)),
        cellWidth: Math.round(width * (canvas ? 0.068 : 0.055)),
        playerY: playfieldTop + playfieldHeight * (canvas ? 0.95 : 0.92),
        gridY: canvas ? Math.max(playfieldTop + playfieldHeight * 0.10, 80) : Math.max(height * 0.20, 120),
        targetShieldHeight: playfieldHeight * (canvas ? 0.065 : 0.055),
    };
}
export function getGalaxyLayout(width, height) {
    const canvas = profile === 'canvas';
    const scale = Math.max(canvas ? 1.7 : 0, Math.min(width / 500, height / 500));
    return {
        scale,
        opponentSize: canvas
            ? Math.max(54, Math.min(32 * scale, width / 24))
            : Math.min(32 * scale, width / 35),
    };
}
//# sourceMappingURL=layout.js.map