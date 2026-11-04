export function expectedNotice(message) {
    return Object.assign(new Error(message), { handoff: false });
}
