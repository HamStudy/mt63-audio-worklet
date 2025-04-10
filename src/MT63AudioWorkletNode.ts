import processorName from "./worklet/processor-name";

export class MT63AudioWorkletNode extends AudioWorkletNode {
  constructor(audioContext: AudioContext, mediaStream: MediaStream) {
    super(audioContext, processorName);

    this.port.onmessage = (evt) => {
    };

    this.connect(audioContext.destination);
    const sourceNode = audioContext.createMediaStreamSource(mediaStream);
    sourceNode.connect(this);
  }
}
