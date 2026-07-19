export function pickWeighted<T>(
    items: readonly T[],
    weightOf: (item: T) => number,
    random: () => number = Math.random,
): T | undefined {
    if (items.length === 0) return undefined;
    let total = 0;
    const weights: number[] = new Array(items.length);
    for (let i = 0; i < items.length; i++) {
        const w = Math.max(0, weightOf(items[i]));
        weights[i] = w;
        total += w;
    }
    if (!(total > 0)) {
        return items[Math.floor(random() * items.length)];
    }
    let roll = random() * total;
    for (let i = 0; i < items.length; i++) {
        roll -= weights[i];
        if (roll <= 0) return items[i];
    }
    return items[items.length - 1];
}

export function rollAmount(min: number, max: number, random: () => number = Math.random): number {
    const lo = Math.max(1, Math.floor(min));
    const hi = Math.max(lo, Math.floor(max));
    return lo + Math.floor(random() * (hi - lo + 1));
}
