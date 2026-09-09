// src/controllers/QuestsChip.controller.js
import { createQuestsChipView } from "../ui/components/QuestsChip.view.js";
import { subscribeDailyQuests } from "../data/dailyQuests.js";
import { auth } from "../../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";

/** The daily-quest counter for the header. Same live source as the old card. */
export function QuestsChip() {
  const view = createQuestsChipView();

  let unsubQuests = null;
  const stopAuth = onAuthStateChanged(auth, (user) => {
    if (unsubQuests) { unsubQuests(); unsubQuests = null; }
    if (!user) { view.updateQuests([]); return; }
    unsubQuests = subscribeDailyQuests(user.uid, (quests) => view.updateQuests(quests));
  });

  const el = view.element;
  el.stop = () => { stopAuth(); if (unsubQuests) unsubQuests(); };
  return el;
}
