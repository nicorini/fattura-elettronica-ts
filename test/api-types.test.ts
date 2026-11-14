// The shape of the public API that only the compiler sees: named options and read-only results.
// These assertions fail at `pnpm typecheck`, not at run time.
import { expectTypeOf, test } from 'vitest';
import {
  type BuildOptions,
  build,
  type Problem,
  type ValidateOptions,
  type ValidationResult,
  validate,
} from '../src/index.js';

test('validate and build take named options, and build has every option of validate', () => {
  expectTypeOf(validate).parameter(1).toEqualTypeOf<ValidateOptions | undefined>();
  expectTypeOf(build).parameter(1).toEqualTypeOf<BuildOptions | undefined>();
  expectTypeOf<BuildOptions>().toExtend<ValidateOptions>();
});

test('the problems of a result are read-only', () => {
  expectTypeOf<ValidationResult['problems']>().toEqualTypeOf<readonly Problem[]>();
});
