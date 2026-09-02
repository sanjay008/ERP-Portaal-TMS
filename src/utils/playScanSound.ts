import { Images } from '@/src/assets/images';
import { Audio } from 'expo-av';

/** Play error sound once (full clip) — non-blocking for verify failures. */
export async function playErrorSound(): Promise<void> {
  try {
    const { sound } = await Audio.Sound.createAsync(Images.ErrorSound);
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        void sound.unloadAsync();
      }
    });
    await sound.playAsync();
  } catch {
    // ignore audio errors
  }
}
