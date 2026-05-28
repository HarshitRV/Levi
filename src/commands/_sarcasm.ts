// Pure data + selector for /sarcasm. Lives in its own module so it can be
// unit-tested without dragging the discord.js command handler into the
// test graph.

export const QUOTES: readonly string[] = [
  "Oh, that's great. Yeah, no, that's exactly what I wanted to hear.",
  "Sure, because the universe definitely owes you a favour.",
  "Wow, what a totally original opinion. Never heard that before.",
  "Yeah, I'll get right on that. Just as soon as I finish not caring.",
  "I'm not saying you're wrong. I'm saying you're spectacularly wrong.",
  "Could that be any more obvious?",
  "Oh, my fault — I forgot reading the message was optional.",
  "I'd agree with you, but then we'd both be incorrect.",
  "Calm down — your inner monologue is leaking again.",
  "Sorry, I don't speak nonsense as a second language.",
  "Cool, cool, cool. Let me know how that works out for you.",
  "Have you tried turning yourself off and on again?",
  "Bold of you to assume I was paying attention.",
  "Well, that escalated more slowly than I expected.",
  "I'm here for moral support. Mostly the immoral kind.",
  "If sarcasm were a sport, you'd still be in the warm-up.",
  "Right. Because what this conversation really needed was more confidence.",
  "I'm not procrastinating, I'm letting the problem develop character.",
  "Don't worry, I've got a plan. It's just not a good one.",
  "Yes, I'm fluent in eye-roll. It's my native language.",
  "Oh, look, another thing I'm going to pretend to remember.",
  "On a scale of one to ten, that was a solid 'no thanks'.",
  "Sure, that's a take. A bad one. But a take.",
  "I'm not saying it was easy. I'm saying you made it look catastrophically hard.",
  "Could you be any more dramatic? Actually — don't answer that.",
];

/**
 * Pick a quote from {@link QUOTES}, optionally avoiding repeating `except`.
 *
 * Guarantees:
 * - Always returns a member of `QUOTES`.
 * - When `QUOTES.length > 1`, the returned value is never strictly equal
 *   to `except` — that's what lets the refresh button feel responsive.
 * - When `QUOTES.length <= 1`, returns the single quote even if it
 *   matches `except` (otherwise we'd infinite-loop).
 *
 * @param rng injectable RNG so tests can drive the path deterministically;
 *   defaults to Math.random.
 */
export function pickQuote(
  except?: string,
  rng: () => number = Math.random,
): string {
  if (QUOTES.length === 0) {
    throw new Error("QUOTES list is empty");
  }
  if (QUOTES.length === 1) return QUOTES[0]!;

  let next = QUOTES[Math.floor(rng() * QUOTES.length)]!;
  while (next === except) {
    next = QUOTES[Math.floor(rng() * QUOTES.length)]!;
  }
  return next;
}
