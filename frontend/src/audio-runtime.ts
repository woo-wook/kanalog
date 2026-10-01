import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
export function useServerVoice() {
  return useSyncExternalStore(
    subscribe,
    () => usesServerSpeech(navigator),
    () => false,
  );
}

export function usesServerSpeech(
  device: Pick<Navigator, "userAgent" | "platform" | "maxTouchPoints">,
) {
  return (
    /iPhone|iPad|iPod/.test(device.userAgent) ||
    (device.platform === "MacIntel" && device.maxTouchPoints > 1)
  );
}
