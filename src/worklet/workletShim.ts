// import {
//   MT63Client,
//   wasmModule,
// } from '@hamstudy/mt63-wasm';


export async function loadWasm(bin: Uint8Array) {
  console.log('Loading wasm');
  const { initialize } = await import('@hamstudy/mt63-wasm');
  return initialize(mod => {
    mod.wasmBinary = bin;
    return mod;
  });
}

// export {MT63Client, wasmModule};
