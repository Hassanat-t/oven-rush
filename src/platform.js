// start.ng handles sign-in, characters and the shared leaderboard (https://start.ng/docs.md).
// The game talks to a hidden start.ng/connect page with postMessage. It never sees
// passwords, emails or the player's real start.ng sign-in.

/** Where start.ng is, worked out from where the game is served. null = nowhere (guest only). */
function findStartNg() {
  const { hostname } = location;
  if (hostname.endsWith('.start.ng')) return 'https://start.ng';
  if (hostname.endsWith('.start.localhost')) return 'http://start.localhost:5173'; // local testing
  return null; // a file, localhost or anywhere else: play as a guest
}

export const START_NG = findStartNg();

/** True when the start.ng homepage already asked "sign in or guest?" and the player picked guest. */
export const openedAsGuest = new URLSearchParams(location.search).has('guest');

// After signing in, start.ng sends players back with #startng_session=... in the address.
// This game uses the connect page, which doesn't need it, so it just tidies the address bar.
if (location.hash.includes('startng_session=')) {
  history.replaceState(null, '', location.pathname + location.search);
}

let frame;
function connectFrame() {
  frame ??= new Promise((resolve, reject) => {
    const el = document.createElement('iframe');
    el.src = `${START_NG}/connect`;
    el.hidden = true;
    el.title = 'start.ng';
    el.addEventListener('load', () => resolve(el), { once: true });
    el.addEventListener('error', reject, { once: true });
    document.body.append(el);
  });
  return frame;
}

/** Sends a message to start.ng/connect. Resolves to the reply, or undefined if there was none. */
async function ask(message, replyType, timeoutMs = 5000) {
  if (!START_NG) return undefined;
  let el;
  try {
    el = await connectFrame();
  } catch {
    return undefined;
  }
  return new Promise((resolve) => {
    const requestId = Math.random().toString(36).slice(2);
    const done = (reply) => {
      clearTimeout(timer);
      removeEventListener('message', onMessage);
      resolve(reply);
    };
    const timer = setTimeout(() => done(undefined), timeoutMs);
    function onMessage(e) {
      if (e.origin !== START_NG || e.source !== el.contentWindow) return; // only trust start.ng itself
      if (e.data?.type === replyType && e.data.requestId === requestId) done(e.data);
    }
    addEventListener('message', onMessage);
    el.contentWindow.postMessage({ ...message, requestId }, START_NG);
  });
}

/** start.ng's shared guest look ({ name, style, face }), once start.ng has sent it. */
export let guest = null;

/**
 * Who's playing: { user, guest }. user is { id, name, account, style, face } or null.
 * Resolves to undefined when start.ng didn't answer (keep whatever you had).
 */
export async function whoami() {
  if (!START_NG) return { user: null, guest: null };
  const reply = await ask({ type: 'startng:whoami' }, 'startng:user');
  if (!reply) return undefined;
  if (reply.guest) guest = reply.guest;
  return { user: reply.user ?? null, guest: reply.guest ?? null };
}

/** Asks again whenever the player comes back to the tab: they may have signed in or out on start.ng. */
export function onPlayerChange(fn) {
  const recheck = async () => {
    if (document.visibilityState !== 'visible') return;
    const who = await whoami();
    if (who !== undefined) fn(who); // ignore checks that got no answer
  };
  document.addEventListener('visibilitychange', recheck);
  addEventListener('focus', recheck);
}

/** Sends the player to start.ng to sign in; start.ng brings them back here. */
export function signIn() {
  location.href = `${START_NG ?? 'https://start.ng'}/?return_to=${encodeURIComponent(location.origin + location.pathname)}`;
}

/**
 * Saves a signed-in player's run. stats must be exactly the keys in startng.json, whole numbers.
 * Resolves to { best, improved, rank, stats }, or null if it wasn't saved.
 */
export async function saveRun(stats) {
  const reply = await ask({ type: 'startng:score', stats }, 'startng:scoreSaved', 8000);
  return reply?.ok ? reply.result : null;
}

/** start.ng's top players: [{ rank, player_id, name, color, score, stats }], or null. */
export async function leaderboard(limit = 10) {
  const reply = await ask({ type: 'startng:leaderboard', limit }, 'startng:leaderboardData', 8000);
  return reply?.ok ? reply.entries : null;
}
