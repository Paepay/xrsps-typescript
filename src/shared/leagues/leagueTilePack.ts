/**
 * Packed world-tile keys for league region overrides.
 * packed = (tileX << 14) | tileY  (Y max 12800 fits in 14 bits)
 */
const Y_BITS = 14;
const Y_MASK = (1 << Y_BITS) - 1;

export function packLeagueTile(tileX: number, tileY: number): number {
    return ((tileX | 0) << Y_BITS) | (tileY & Y_MASK);
}

export function unpackLeagueTile(packed: number): { tileX: number; tileY: number } {
    return { tileX: packed >>> Y_BITS, tileY: packed & Y_MASK };
}
