import type { InferenceSession, Tensor } from "onnxruntime-web";
export interface VoiceStyle {
  ttl: Tensor;
  dp: Tensor;
}
export interface TextToSpeech {
  call(
    text: string,
    lang: string,
    style: VoiceStyle,
    steps: number,
    speed?: number,
    silence?: number,
    progress?: (step: number, total: number) => void,
  ): Promise<{ wav: number[]; duration: number[] }>;
}
export function loadTextToSpeech(
  directory: string,
  options: InferenceSession.SessionOptions,
  progress?: (name: string, current: number, total: number) => void,
  modelLoader?: (
    path: string,
    options: InferenceSession.SessionOptions,
  ) => Promise<InferenceSession>,
): Promise<{
  textToSpeech: TextToSpeech;
  cfgs: { ae: { sample_rate: number } };
}>;
export function loadVoiceStyle(paths: string[]): Promise<VoiceStyle>;
export function writeWavFile(data: number[], sampleRate: number): ArrayBuffer;
