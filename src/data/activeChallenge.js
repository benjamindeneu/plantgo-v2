// src/data/activeChallenge.js
import { db, auth } from "../../firebase-config.js";
import { doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import { subscribeLeaderboard } from "./challenges.js";

/**
 * Everything about the challenge the player is currently in, as one live
 * value.
 *
 * The pointer lives on the user's own document, so the chain is: auth →
 * `users/{uid}.activeChallenge` → the leaderboard, plus (for a species hunt)
 * the challenge's species list and this player's found set. Four subscriptions
 * that have to be torn down in the right order when any link above them
 * changes; keeping that in one place is why this module exists rather than
 * each screen wiring its own.
 *
 * The callback is invoked with a fresh state object on every change:
 *
 *   { challenge: null | { id, code, type, endAtMs },
 *     rows: [...], speciesList: [...], foundSpecies: [...],
 *     foundGbifIds: [...], myUid }
 *
 * `challenge` is null whenever there is nothing to show — signed out, or no
 * pointer — which is the signal for a screen to hide itself entirely.
 *
 * @param {(state: object) => void} onChange
 * @returns {() => void} teardown
 */
export function watchActiveChallenge(onChange) {
  let state = blank();

  let unsubUserDoc = null;
  let unsubLeaderboard = null;
  let unsubMemberDoc = null;
  // Guards the async species-list fetch: a pointer that changes while the
  // challenge document is in flight must not have the stale list applied.
  let token = 0;
  let stopped = false;

  function blank() {
    return {
      challenge: null,
      rows: [],
      speciesList: [],
      foundSpecies: [],
      foundGbifIds: [],
      myUid: auth.currentUser?.uid ?? null,
    };
  }

  function emit(patch) {
    if (stopped) return;
    state = { ...state, ...patch };
    onChange(state);
  }

  function dropChallengeSubs() {
    if (unsubLeaderboard) { unsubLeaderboard(); unsubLeaderboard = null; }
    if (unsubMemberDoc) { unsubMemberDoc(); unsubMemberDoc = null; }
  }

  async function applyPointer(pointer) {
    dropChallengeSubs();
    const mine = ++token;

    if (!pointer?.id) {
      emit({ challenge: null, rows: [], speciesList: [], foundSpecies: [], foundGbifIds: [] });
      return;
    }

    const challenge = {
      id: pointer.id,
      code: pointer.code,
      type: pointer.type || "points",
      endAtMs: pointer.endAt?.toMillis ? pointer.endAt.toMillis() : null,
    };
    emit({ challenge, rows: [], speciesList: [], foundSpecies: [], foundGbifIds: [] });

    unsubLeaderboard = subscribeLeaderboard(challenge.id, (rows) => {
      if (mine === token) emit({ rows });
    });

    if (challenge.type !== "species_hunt") return;

    // The species list is fixed for the life of the hunt, so it is read once;
    // only the player's progress against it needs to be live.
    let speciesList = [];
    try {
      const snap = await getDoc(doc(db, "challenges", challenge.id));
      speciesList = snap.exists() ? (snap.data()?.speciesList || []) : [];
    } catch (e) {
      console.warn("[activeChallenge] species list failed:", e?.message || e);
    }
    if (mine !== token) return;
    emit({ speciesList });

    const uid = auth.currentUser?.uid;
    if (!uid) return;
    unsubMemberDoc = onSnapshot(doc(db, "challenges", challenge.id, "members", uid), (snap) => {
      if (mine !== token) return;
      emit({
        foundSpecies: snap.exists() ? (snap.data()?.foundSpecies || []) : [],
        foundGbifIds: snap.exists() ? (snap.data()?.foundGbifIds || []) : [],
      });
    });
  }

  const unsubAuth = onAuthStateChanged(auth, (user) => {
    if (unsubUserDoc) { unsubUserDoc(); unsubUserDoc = null; }
    token++;
    dropChallengeSubs();

    if (!user) {
      state = blank();
      emit({ myUid: null });
      return;
    }

    emit({ myUid: user.uid });

    unsubUserDoc = onSnapshot(doc(db, "users", user.uid), (snap) => {
      applyPointer(snap.exists() ? (snap.data()?.activeChallenge || null) : null);
    });
  });

  return () => {
    stopped = true;
    token++;
    unsubAuth();
    if (unsubUserDoc) unsubUserDoc();
    dropChallengeSubs();
  };
}

/** Whether a challenge's clock has run out. */
export function isEnded(challenge, nowMs = Date.now()) {
  return !!challenge?.endAtMs && nowMs >= challenge.endAtMs;
}

/** Has this player found the given species yet? Matched by GBIF id or name. */
export function isSpeciesFound(species, foundSpecies = [], foundGbifIds = []) {
  const gbifId = species?.gbif_id != null ? Number(species.gbif_id) : null;
  if (gbifId != null && foundGbifIds.some((id) => Number(id) === gbifId)) return true;
  const name = String(species?.name || "").trim().toLowerCase();
  return !!name && foundSpecies.some((s) => String(s).trim().toLowerCase() === name);
}
