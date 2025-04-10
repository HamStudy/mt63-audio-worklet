import { MT63AudioWorkletNode } from './MT63AudioWorkletNode';
export { MT63AudioWorkletNode } from './MT63AudioWorkletNode';

export async function createMT63AudioNode(audioContext: AudioContext, mediaStream: MediaStream, processorPath = new URL('@hamstudy/mt63-audio-worklet/dist/worklet/MT63AudioProcessor.js', import.meta.url).toString()): Promise<MT63AudioWorkletNode> {
  await audioContext.audioWorklet.addModule(processorPath);
  return new MT63AudioWorkletNode(audioContext, mediaStream);
}
