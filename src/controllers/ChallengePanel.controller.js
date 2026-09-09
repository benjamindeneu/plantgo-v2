// src/controllers/ChallengePanel.controller.js
import { createChallengePanelView } from "../ui/components/ChallengePanel.view.js";
import { t } from "../language/i18n.js";
import { clearMyActiveChallenge } from "../data/challenges.js";
import { watchActiveChallenge, isEnded } from "../data/activeChallenge.js";

/**
 * The active-challenge card on the old home page.
 *
 * The live data comes from `watchActiveChallenge`, the same source the map's
 * challenge screen reads, so the two can never disagree about what the player
 * is in. This controller is only the countdown and the wiring to this view.
 */
export function ChallengePanel() {
  const view = createChallengePanelView();

  let timer = null;
  let challenge = null;

  function stopCountdown() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  function startCountdown() {
    stopCountdown();
    if (!challenge?.endAtMs) return;
    timer = setInterval(() => {
      if (isEnded(challenge)) {
        stopCountdown();
        view.setEnded(true);
        return;
      }
      view.setTimeLeft(challenge.endAtMs);
    }, 1000);
  }

  const stop = watchActiveChallenge((state) => {
    view.setMyUid(state.myUid);
    challenge = state.challenge;

    if (!challenge) {
      stopCountdown();
      view.setActiveChallenge(null);
      view.renderLeaderboard([]);
      view.renderSpeciesChecklist([], []);
      view.setEnded(false);
      return;
    }

    view.setActiveChallenge({
      code: challenge.code,
      endsAtMs: challenge.endAtMs,
      type: challenge.type,
    });
    view.renderLeaderboard(state.rows, challenge.type);
    view.renderSpeciesChecklist(state.speciesList, state.foundSpecies, state.foundGbifIds);

    const ended = isEnded(challenge);
    view.setEnded(ended);
    if (ended) stopCountdown();
    else startCountdown();
  });

  view.onClose(async () => {
    try {
      await clearMyActiveChallenge();
    } catch (e) {
      view.setFeedback?.(e?.message || t("challenge.error.generic"));
    }
  });

  // initial state, before the first snapshot lands
  view.setActiveChallenge(null);
  view.renderLeaderboard([]);
  view.renderSpeciesChecklist([], []);
  view.setEnded(false);

  const el = view.element;
  el.stop = () => { stopCountdown(); stop(); };
  return el;
}
