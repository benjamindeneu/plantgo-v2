// src/controllers/HerbariumCard.controller.js
import { createHerbariumCardView } from "../ui/components/HerbariumCard.view.js";
import { getWikipediaImage } from "../data/wiki.service.js";

// Cache across all cards in this page session
const wikiImageCache = new Map(); // name -> Promise<string> | string

// Simple concurrency limiter
const MAX_CONCURRENT = 4;
let inFlight = 0;
const queue = [];

function runLimited(task) {
  return new Promise((resolve, reject) => {
    queue.push({ task, resolve, reject });
    pumpQueue();
  });
}

function pumpQueue() {
  while (inFlight < MAX_CONCURRENT && queue.length) {
    const { task, resolve, reject } = queue.shift();
    inFlight++;
    Promise.resolve()
      .then(task)
      .then(resolve, reject)
      .finally(() => {
        inFlight--;
        pumpQueue();
      });
  }
}

/**
 * Controller keeps the old API: HerbariumCard(props) -> HTMLElement
 */
export function HerbariumCard(props) {
  const { name, image_url } = props || {};
  const view = createHerbariumCardView(props);

  // If no image provided, resolve via Wikipedia and update the view.
  if (!image_url && name) {
    const key = name.trim().toLowerCase();

    if (!wikiImageCache.has(key)) {
      // Store the promise immediately so multiple cards with same name share it
      wikiImageCache.set(
        key,
        runLimited(async () => {
          const url = await getWikipediaImage(name);
          return url || "";
        }).catch(() => "")
      );
    }

    const promiseOrValue = wikiImageCache.get(key);

    Promise.resolve(promiseOrValue).then((url) => {
      // If card got removed before the fetch finishes, do nothing
      if (!view.element.isConnected) return;
      view.setImage(url);
    });
  }

  return view.element;
}
