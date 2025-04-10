import { initialize, MT63Client, wasmModule } from '@hamstudy/mt63-wasm';
import { downSample } from './downsample';
import processorName from './processor-name';

// Constants
const CHUNK_SIZE = 6 * 128 * 3; // Must be a multiple of 6 and ideally 128
const RESAMPLED_SIZE = Math.ceil(CHUNK_SIZE * (8000 / sampleRate));

interface AudioWorkletProcessor {
  readonly port: MessagePort;
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>,
  ): boolean;
}

declare const AudioWorkletProcessor: {
  prototype: AudioWorkletProcessor;
  new (options?: AudioWorkletNodeOptions): AudioWorkletProcessor;
};

declare function registerProcessor(
  name: string,
  processorCtor: new (options?: AudioWorkletNodeOptions) => AudioWorkletProcessor,
): void;

declare const sampleRate: number;

declare namespace globalThis {
  let wasmLoaded: boolean;
  let mtClient: MT63Client;
}

export class MT63AudioProcessor extends AudioWorkletProcessor {
  private mtClient?: MT63Client;
  private active = true;
  private loc = 0;
  private buffer: Float32Array | null = new Float32Array(CHUNK_SIZE);
  private bufferPtr = -1;
  private resampleBuffer: Float32Array | null = null;
  private resampleBufferPtr = -1;
  private wasmLoading = false;
  private workletBuffer: Float32Array | null = null;
  private workletPtr = -1;
  private lastWasWorklet: boolean | null = null;

  constructor() {
    super();
    this.port.onmessage = this.onMessage.bind(this);

    if (globalThis.wasmLoaded) {
      this.initializeWasm();
    } else {
      this.port.postMessage({ req: 'startup' });
    }
  }

  private async initializeWasm(binFile?: Uint8Array) {
    try {
      if (globalThis.wasmLoaded) {
        this.mtClient = globalThis.mtClient;
        return;
      }

      if (!binFile) {
        console.error('No binary provided for wasm');
        throw new Error("Can't load wasm - no binary provided");
      }

      this.wasmLoading = true;
      console.debug('MT63AudioProcessor: loading wasm');
      await initialize(mod => {
        mod.wasmBinary = binFile;
        return mod;
      });
      this.wasmLoading = false;

      globalThis.mtClient = this.mtClient = new MT63Client();
      this.allocateBuffers();
      globalThis.wasmLoaded = true;
      console.debug('MT63AudioProcessor: wasm loaded');
    } catch (err) {
      console.warn('Error loading wasm:', err);
    }
  }

  private allocateBuffers() {
    const newBufPtr = wasmModule.mod._malloc((CHUNK_SIZE + 10) * 4);
    this.workletBuffer = wasmModule.mod.HEAPF32.subarray(newBufPtr / 4, newBufPtr / 4 + CHUNK_SIZE) as Float32Array;
    this.workletPtr = newBufPtr;

    if (this.buffer) {
      this.workletBuffer.set(this.buffer); // Copy from the old buffer
    }

    this.buffer = null;
  }

  private onMessage(event: MessageEvent<any>) {
    const { data } = event;

    if (data.binary) {
      this.initializeWasm(data.binary);
    } else if (data.req === 'shutdown') {
      this.active = false;
    }
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean {
    const input = inputs[0]?.[0]; // First input, first channel
    if (!input) return this.active;

    const remaining = CHUNK_SIZE - this.loc;
    const buffer = this.workletBuffer || this.buffer;

    if (!buffer) return this.active;

    if (input.length >= remaining) {
      buffer.set(input.subarray(0, remaining), this.loc);
      this.processAudio(buffer, this.workletPtr, CHUNK_SIZE);

      const remnantSize = input.length - remaining;
      buffer.set(input.subarray(remaining), 0);
      this.loc = remnantSize;
    } else {
      buffer.set(input, this.loc);
      this.loc += input.length;
    }

    return this.active;
  }

  private processAudio(buffer: Float32Array, bufferPtr: number, length: number) {
    if (this.mtClient && wasmModule && this.workletBuffer) {
      this.reportProcessingMode(true);

      const result = wasmModule._processResampleMT63Rx(bufferPtr, sampleRate, length);
      if (result?.length) {
        this.port.postMessage({ decoded: result });
      }
    } else {
      this.reportProcessingMode(false);

      if (!this.resampleBuffer) {
        this.resampleBuffer = new Float32Array(RESAMPLED_SIZE);
      }

      const size = downSample(buffer, length, sampleRate, 8000, this.resampleBuffer);
      this.port.postMessage({ audioBuffer: this.resampleBuffer.subarray(0, size), sampleRate: 8000 });
    }
  }

  private reportProcessingMode(isWorklet: boolean) {
    if (this.lastWasWorklet !== isWorklet) {
      console.log('Processing in the worklet?', isWorklet);
    }
    this.lastWasWorklet = isWorklet;
  }
}

registerProcessor(processorName, MT63AudioProcessor);
