import { doc, getDoc, onSnapshot, setDoc, type Unsubscribe } from "firebase/firestore";
import { getDb } from "./client";

const SETTINGS = "settings";
const APP = "app";

export type AppSettings = {
  homeBannerMovieId: string | null;
};

const defaultSettings: AppSettings = {
  homeBannerMovieId: null,
};

export function subscribeAppSettings(
  onData: (s: AppSettings) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  const db = getDb();
  return onSnapshot(
    doc(db, SETTINGS, APP),
    (snap) => {
      if (!snap.exists()) {
        onData({ ...defaultSettings });
        return;
      }
      const d = snap.data();
      onData({
        homeBannerMovieId: typeof d.homeBannerMovieId === "string" ? d.homeBannerMovieId : null,
      });
    },
    (err) => onError?.(err)
  );
}

export async function getAppSettingsOnce(): Promise<AppSettings> {
  const db = getDb();
  const snap = await getDoc(doc(db, SETTINGS, APP));
  if (!snap.exists()) return { ...defaultSettings };
  const d = snap.data();
  return {
    homeBannerMovieId: typeof d.homeBannerMovieId === "string" ? d.homeBannerMovieId : null,
  };
}

export async function updateAppSettings(patch: Partial<AppSettings>): Promise<void> {
  const db = getDb();
  await setDoc(doc(db, SETTINGS, APP), patch, { merge: true });
}
