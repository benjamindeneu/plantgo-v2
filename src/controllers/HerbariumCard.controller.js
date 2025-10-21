// src/controllers/HerbariumCard.controller.js
import { createHerbariumCardView } from "../ui/components/HerbariumCard.view.js";
// wiki.js lives under /src/ui/ per your current imports
import { getWikipediaImage } from "../ui/wiki.js";

/**
 * Controller keeps the old API: HerbariumCard(props) -> HTMLElement
 */
export function HerbariumCard(props) {
  const { name, image_url } = props || {};
  const view = createHerbariumCardView(props);

  // If no image provided, resolve via Wikipedia and update the view.
  if (!image_url && name) {
    (async () => {
      try {
        const wikiImg = await getWikipediaImage(name);
        view.setImage(wikiImg || "");
      } catch {
        view.setImage(""); // will show "No image"
      }
    })();
  }

  return view.element;
}
