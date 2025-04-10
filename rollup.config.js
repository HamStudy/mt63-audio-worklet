import typescript from 'rollup-plugin-typescript2';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import deleteBuild from 'rollup-plugin-delete';

/** @type {import('rollup').RollupOptions[]} */
export default [
  {
    input: ['src/index.ts'],
    output: {
      dir: 'dist',
      format: 'esm',
      entryFileNames: '[name].js',
      sourcemap: true,
    },
    plugins: [
      // delete the dist folder before building (only needed for the first entry)
      deleteBuild({ targets: 'dist/*' }),
      // commonjs({
      //   transformMixedEsModules: true,
      // }), // Convert CommonJS modules to ES6
      typescript({
        tsconfig: './tsconfig.json',
        useTsconfigDeclarationDir: true,
        tsconfigOverride: {
          exclude: ['src/worklet/**/*'],
        },
      }),
    ],
  },
  {
    input: 'src/worklet/MT63AudioProcessor.ts',
    output: {
      dir: 'dist/worklet',
      format: 'esm',
      entryFileNames: '[name].js',
      sourcemap: true,
      // inlineDynamicImports: true,
    },
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false,
      }),
      commonjs({
        transformMixedEsModules: true,
      }), // Convert CommonJS modules to ES6
      typescript({
        tsconfig: './tsconfig.json',
        useTsconfigDeclarationDir: true,
        tsconfigOverride: {
          compilerOptions: {
            declaration: false,
            declarationDir: null,
          },
        },
      }),
    ],
  }
];
