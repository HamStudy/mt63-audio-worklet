# MT63 Audio Worklet

The MT63 Audio Worklet is an npm module that provides an implementation of the MT63 audio processing algorithm using the Web Audio API. This module allows you to integrate MT63 audio processing into your web applications.

## Installation

To install the MT63 Audio Worklet, use npm:

```bash
npm install @hamstudy/mt63-audio-worklet
```

## Usage

To use the MT63 Audio Worklet in your application, follow these steps:

1. **Import the module** in your JavaScript or TypeScript file:

   ```javascript
   import { createMT63AudioNode } from '@hamstudy/mt63-audio-worklet';
   ```

2. **Load the WASM binary** using `@hamstudy/mt63-wasm`:

   The MT63 Audio Worklet relies on the `@hamstudy/mt63-wasm` library to provide the core MT63 processing functionality. The WASM binary is loaded and initialized as follows:

   ```javascript
   import { setFileLocation, initialize, MT63Client, wasmModule } from '@hamstudy/mt63-wasm';
   import wasmFile from '@hamstudy/mt63-wasm/dist/mt63Wasm.wasm';

   // Fetch the WASM binary
   const wasmBinary = fetch(wasmFile)
     .then(response => {
       if (!response.ok) {
         throw new Error(`Failed to fetch WASM file: ${response.statusText}`);
       }
       return response.arrayBuffer();
     })
     .then(buffer => new Uint8Array(buffer))
     .catch(err => {
       alert("Could not load MT63 library.");
       console.warn("Failed to load mt63 wasm file:", err);
     });

   // Set the file location for the WASM module
   setFileLocation("mt63Wasm.wasm", wasmFile);

   // Initialize the WASM module
   const readyDfd = wasmBinary.then(binary =>
     initialize(mod => {
       mod.wasmBinary = binary;
       return mod;
     })
   );

   export { MT63Client, wasmModule, wasmBinary, readyDfd };
   ```

3. **Create and register the audio worklet** in your audio context:

   ```javascript
   const audioContext = new AudioContext();
   const stream = await navigator.mediaDevices.getUserMedia({
     audio: {
       echoCancellation: { exact: false },
       noiseSuppression: { exact: false },
       channelCount: { exact: 1 },
       sampleRate: { ideal: 8000 },
       sampleSize: 16,
     },
   });
   const mt63Node = await createMT63AudioNode(audioContext, stream);
   ```

4. **Handle messages from the worklet**:

   ```javascript
   mt63Node.port.addEventListener('message', async (e) => {
     if (e.data.req === 'startup') {
       const binary = await wasmBinary; // Load the WASM binary
       mt63Node.port.postMessage({ binary });
     } else if (e.data.decoded) {
       console.log('Decoded data:', e.data.decoded);
     } else if (e.data.audioBuffer) {
       const audioData = e.data.audioBuffer;
       const sampleRate = e.data.sampleRate;
       console.log('Audio buffer received:', audioData, 'Sample rate:', sampleRate);
     }
   });
   ```

5. **Connect the worklet** to your audio graph and handle stream lifecycle events:

   ```javascript
   mt63Node.connect(audioContext.destination);

   stream.addEventListener('inactive', () => {
     console.log('Stream inactive, shutting down worklet');
     mt63Node.port.postMessage({ req: 'shutdown' });
   }, { once: true });
   ```

## API

The MT63 Audio Worklet exposes the following methods:

- `createMT63AudioNode(audioContext: AudioContext, mediaStream: MediaStream)`: Creates and registers the MT63 audio worklet, returning an instance of `MT63AudioWorkletNode`.

- `MT63AudioWorkletNode`: A custom `AudioWorkletNode` that handles MT63 audio processing. You can use its `port` to send and receive messages for additional control and data exchange.

## WASM Integration

The MT63 Audio Worklet uses the `@hamstudy/mt63-wasm` library for MT63 processing. This library provides the core functionality in a WebAssembly (WASM) module. The WASM binary is loaded using the `fetch` API and initialized with the `initialize` function from `@hamstudy/mt63-wasm`. The binary is then passed to the audio worklet for processing.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.
