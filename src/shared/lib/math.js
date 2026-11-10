/** `value` kept between `low` and `high` (0 and 1 unless said otherwise). */
export const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
