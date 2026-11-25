export function buildSteps(slide) {
    return [...new Set((slide?.elements || []).filter((e) => e.animation).map((e) => e.animation.step))].sort((a, b) => a - b);
}

export function navigateBuild(slides, state, direction) {
    const visible = slides.filter((slide) => !slide.skipped);
    if (!visible.length) return { slideId: undefined, build: 0 };
    const index = Math.max(0, visible.findIndex((slide) => slide.id === state.slideId));
    const slide = visible[index], count = buildSteps(slide).length;
    const build = Math.max(0, Math.min(count, state.build));
    if (direction > 0) {
        if (build < count) return { slideId: slide.id, build: build + 1 };
        if (index < visible.length - 1) return { slideId: visible[index + 1].id, build: 0 };
    } else {
        if (build > 0) return { slideId: slide.id, build: build - 1 };
        if (index > 0) return { slideId: visible[index - 1].id, build: buildSteps(visible[index - 1]).length };
    }
    return { slideId: slide.id, build };
}

export function showBuild(container, build, animate = true, reducedMotion = false) {
    for (const element of container.querySelectorAll("[data-build]")) {
        const visible = Number(element.dataset.build) <= build;
        const wasHidden = element.style.visibility === "hidden";
        for (const animation of element.getAnimations()) animation.cancel();
        element.style.visibility = visible ? "visible" : "hidden";
        element.setAttribute("aria-hidden", String(!visible));
        if (visible && wasHidden && animate && !reducedMotion && element.dataset.animation === "fade") {
            element.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: "ease-out" });
        }
    }
}
