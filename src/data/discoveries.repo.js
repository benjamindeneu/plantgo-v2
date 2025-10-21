// src/data/discoveries.repo.js
import { db } from "../../firebase-config.js";
import {
  collection, getDocs, query, orderBy, documentId
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

/**
 * Load discoveries for a user.
 * Returns [{ name, discoveredAt, image_url }]
 */
export async function loadDiscoveries(uid) {
  const ref = collection(db, "users", uid, "discoveries");
  const qy = query(ref, orderBy(documentId(), "asc"));
  const snap = await getDocs(qy);

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      name: d.id,                 // doc id == speciesName
      discoveredAt: data.discoveredAt,
      image_url: "",              // HerbariumCard can fetch Wikipedia image by name
    };
  });
}
