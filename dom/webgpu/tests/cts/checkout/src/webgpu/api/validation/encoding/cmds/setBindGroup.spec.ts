export const description = `
setBindGroup validation tests.

TODO: merge these notes and implement.
> (Note: If there are errors with using certain binding types in certain passes, test those in the file for that pass type, not here.)
>
> - state tracking (probably separate file)
>     - x= {compute pass, render pass}
>     - {null, compatible, incompatible} current pipeline (should have no effect without draw/dispatch)
>     - setBindGroup in different orders (e.g. 0,1,2 vs 2,0,1)
`;

import { makeTestGroup } from '../../../../../common/framework/test_group.js';
import { makeValueTestVariant, range, unreachable } from '../../../../../common/util/util.js';
import {
  kBufferBindingTypes,
  kMinDynamicBufferOffsetAlignment,
} from '../../../../capability_info.js';
import { GPUConst } from '../../../../constants.js';
import {
  kResourceStates,
  ResourceState,
  AllFeaturesMaxLimitsGPUTest,
} from '../../../../gpu_test.js';
import {
  kProgrammableEncoderTypes,
  ProgrammableEncoderType,
} from '../../../../util/command_buffer_maker.js';
import * as vtu from '../../validation_test_utils.js';

class F extends AllFeaturesMaxLimitsGPUTest {
  encoderTypeToStageFlag(encoderType: ProgrammableEncoderType): GPUShaderStageFlags {
    switch (encoderType) {
      case 'compute pass':
        return GPUShaderStage.COMPUTE;
      case 'render pass':
      case 'render bundle':
        return GPUShaderStage.FRAGMENT;
      default:
        unreachable('Unknown encoder type');
    }
  }

  createBindingResourceWithState(
    resourceType: 'texture' | 'buffer',
    state: 'valid' | 'destroyed'
  ): GPUBindingResource {
    switch (resourceType) {
      case 'texture': {
        const texture = vtu.createTextureWithState(this, 'valid');
        const view = texture.createView();
        if (state === 'destroyed') {
          texture.destroy();
        }
        return view;
      }
      case 'buffer':
        return {
          buffer: vtu.createBufferWithState(this, state, {
            size: 4,
            usage: GPUBufferUsage.UNIFORM,
          }),
        };
      default:
        unreachable('unknown resource type');
    }
  }

  /**
   * If state is 'invalid', creates an invalid bind group with valid resources.
   * If state is 'destroyed', creates a valid bind group with destroyed resources.
   */
  createBindGroup(
    state: ResourceState,
    resourceType: 'buffer' | 'texture',
    encoderType: ProgrammableEncoderType,
    indices: number[]
  ) {
    if (state === 'invalid') {
      this.device.pushErrorScope('validation');
      indices = new Array<number>(indices.length + 1).fill(0);
    }

    const layout = this.device.createBindGroupLayout({
      entries: indices.map(binding => ({
        binding,
        visibility: this.encoderTypeToStageFlag(encoderType),
        ...(resourceType === 'buffer' ? { buffer: { type: 'uniform' } } : { texture: {} }),
      })),
    });
    const bindGroup = this.device.createBindGroup({
      layout,
      entries: indices.map(binding => ({
        binding,
        resource: this.createBindingResourceWithState(
          resourceType,
          state === 'destroyed' ? state : 'valid'
        ),
      })),
    });

    if (state === 'invalid') {
      void this.device.popErrorScope();
    }
    return bindGroup;
  }
}

export const g = makeTestGroup(F);

g.test('state_and_binding_index')
  .desc('Tests that setBindGroup correctly handles {valid, invalid, destroyed} bindGroups.')
  .params(u =>
    u
      .combine('encoderType', kProgrammableEncoderTypes)
      .combine('state', kResourceStates)
      .combine('resourceType', ['buffer', 'texture'] as const)
  )
  .fn(t => {
    const { encoderType, state, resourceType } = t.params;
    const maxBindGroups = t.device.limits.maxBindGroups;

    function runTest(index: number) {
      const { encoder, validateFinishAndSubmit } = t.createEncoder(encoderType);
      encoder.setBindGroup(index, t.createBindGroup(state, resourceType, encoderType, [index]));

      validateFinishAndSubmit(state !== 'invalid' && index < maxBindGroups, state !== 'destroyed');
    }

    // MAINTENANCE_TODO: move to subcases() once we can query the device limits
    for (const index of [1, maxBindGroups - 1, maxBindGroups]) {
      t.debug(`test bind group index ${index}`);
      runTest(index);
    }
  });

g.test('bind_group,device_mismatch')
  .desc(
    `
    Tests setBindGroup cannot be called with a bind group created from another device
    - x= setBindGroup {sequence overload, Uint32Array overload}
    `
  )
  .params(u =>
    u
      .combine('encoderType', kProgrammableEncoderTypes)
      .beginSubcases()
      .combine('useU32Array', [true, false])
      .combine('mismatched', [true, false])
  )
  .beforeAllSubcases(t => t.usesMismatchedDevice())
  .fn(t => {
    const { encoderType, useU32Array, mismatched } = t.params;
    const sourceDevice = mismatched ? t.mismatchedDevice : t.device;

    const buffer = t.trackForCleanup(
      sourceDevice.createBuffer({
        size: 4,
        usage: GPUBufferUsage.UNIFORM,
      })
    );

    const layout = sourceDevice.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: t.encoderTypeToStageFlag(encoderType),
          buffer: { type: 'uniform', hasDynamicOffset: useU32Array },
        },
      ],
    });

    const bindGroup = sourceDevice.createBindGroup({
      layout,
      entries: [
        {
          binding: 0,
          resource: { buffer },
        },
      ],
    });

    const { encoder, validateFinish } = t.createEncoder(encoderType);
    if (useU32Array) {
      encoder.setBindGroup(0, bindGroup, new Uint32Array([0]), 0, 1);
    } else {
      encoder.setBindGroup(0, bindGroup);
    }
    validateFinish(!mismatched);
  });

g.test('dynamic_offsets_passed_but_not_expected')
  .desc('Tests that setBindGroup correctly errors on unexpected dynamicOffsets.')
  .params(u => u.combine('encoderType', kProgrammableEncoderTypes))
  .fn(t => {
    const { encoderType } = t.params;
    const bindGroup = t.createBindGroup('valid', 'buffer', encoderType, []);
    const dynamicOffsets = [0];

    const { encoder, validateFinish } = t.createEncoder(encoderType);
    encoder.setBindGroup(0, bindGroup, dynamicOffsets);
    validateFinish(false);
  });

g.test('dynamic_offsets_match_expectations_in_pass_encoder')
  .desc('Tests that given dynamicOffsets match the specified bindGroup.')
  .params(u =>
    u
      .combine('encoderType', kProgrammableEncoderTypes)
      .combineWithParams([
        { dynamicOffsets: [256, 0], _success: true }, // Dynamic offsets aligned
        { dynamicOffsets: [1, 2], _success: false }, // Dynamic offsets not aligned

        // Wrong number of dynamic offsets
        { dynamicOffsets: [256, 0, 0], _success: false },
        { dynamicOffsets: [256], _success: false },
        { dynamicOffsets: [], _success: false },

        // Dynamic uniform buffer out of bounds because of binding size
        { dynamicOffsets: [512, 0], _success: false },
        { dynamicOffsets: [1024, 0], _success: false },
        { dynamicOffsets: [0xffffffff, 0], _success: false },

        // Dynamic storage buffer out of bounds because of binding size
        { dynamicOffsets: [0, 512], _success: false },
        { dynamicOffsets: [0, 1024], _success: false },
        { dynamicOffsets: [0, 0xffffffff], _success: false },
      ])
      .combine('useU32array', [false, true])
      .beginSubcases()
      .combine('visibility', [
        GPUConst.ShaderStage.COMPUTE,
        GPUConst.ShaderStage.COMPUTE | GPUConst.ShaderStage.FRAGMENT,
      ] as const)
      .combine('useStorage', [false, true] as const)
  )
  .fn(t => {
    const { visibility, useStorage } = t.params;
    t.skipIf(
      t.isCompatibility &&
        (visibility & GPUShaderStage.FRAGMENT) !== 0 &&
        !(t.device.limits.maxStorageBuffersInFragmentStage! >= 1),
      `maxStorageBuffersInFragmentStage${t.device.limits.maxStorageBuffersInFragmentStage} < 1`
    );
    const kBindingSize = 12;

    const bindGroupLayout = t.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility,
          buffer: {
            type: 'uniform',
            hasDynamicOffset: true,
          },
        },
        {
          binding: 1,
          visibility,
          buffer: {
            type: useStorage ? 'storage' : 'uniform',
            hasDynamicOffset: true,
          },
        },
      ],
    });

    const uniformBuffer = t.createBufferTracked({
      size: 2 * kMinDynamicBufferOffsetAlignment + 8,
      usage: GPUBufferUsage.UNIFORM,
    });

    const storageOrUniformBuffer = t.createBufferTracked({
      size: 2 * kMinDynamicBufferOffsetAlignment + 8,
      usage: useStorage ? GPUBufferUsage.STORAGE : GPUBufferUsage.UNIFORM,
    });

    const bindGroup = t.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: uniformBuffer,
            size: kBindingSize,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: storageOrUniformBuffer,
            size: kBindingSize,
          },
        },
      ],
    });

    const { encoderType, dynamicOffsets, useU32array, _success } = t.params;

    const { encoder, validateFinish } = t.createEncoder(encoderType);
    if (useU32array) {
      encoder.setBindGroup(0, bindGroup, new Uint32Array(dynamicOffsets), 0, dynamicOffsets.length);
    } else {
      encoder.setBindGroup(0, bindGroup, dynamicOffsets);
    }
    validateFinish(_success);
  });

g.test('u32array_start_and_length')
  .desc('Tests that dynamicOffsetsData(Start|Length) apply to the given Uint32Array.')
  .paramsSubcasesOnly([
    // dynamicOffsetsDataLength > offsets.length
    {
      offsets: [0] as const,
      dynamicOffsetsDataStart: 0,
      dynamicOffsetsDataLength: 2,
      _success: false,
    },
    // dynamicOffsetsDataStart + dynamicOffsetsDataLength > offsets.length
    {
      offsets: [0] as const,
      dynamicOffsetsDataStart: 1,
      dynamicOffsetsDataLength: 1,
      _success: false,
    },
    {
      offsets: [0, 0] as const,
      dynamicOffsetsDataStart: 1,
      dynamicOffsetsDataLength: 1,
      _success: true,
    },
    {
      offsets: [0, 0, 0] as const,
      dynamicOffsetsDataStart: 1,
      dynamicOffsetsDataLength: 1,
      _success: true,
    },
    {
      offsets: [0, 0] as const,
      dynamicOffsetsDataStart: 0,
      dynamicOffsetsDataLength: 2,
      _success: true,
    },
  ])
  .fn(t => {
    const { offsets, dynamicOffsetsDataStart, dynamicOffsetsDataLength, _success } = t.params;
    const kBindingSize = 8;

    const bindGroupLayout = t.device.createBindGroupLayout({
      entries: range(dynamicOffsetsDataLength, i => ({
        binding: i,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: {
          type: 'uniform',
          hasDynamicOffset: true,
        },
      })),
    });

    const bindGroup = t.device.createBindGroup({
      layout: bindGroupLayout,
      entries: range(dynamicOffsetsDataLength, i => ({
        binding: i,
        resource: {
          buffer: vtu.createBufferWithState(t, 'valid', {
            size: kBindingSize,
            usage: GPUBufferUsage.UNIFORM,
          }),
          size: kBindingSize,
        },
      })),
    });

    const { encoder, validateFinish } = t.createEncoder('render pass');

    const doSetBindGroup = () => {
      encoder.setBindGroup(
        0,
        bindGroup,
        new Uint32Array(offsets),
        dynamicOffsetsDataStart,
        dynamicOffsetsDataLength
      );
    };

    if (_success) {
      doSetBindGroup();
    } else {
      t.shouldThrow('RangeError', doSetBindGroup);
    }

    // RangeError in setBindGroup does not cause the encoder to become invalid.
    validateFinish(true);
  });

g.test('buffer_dynamic_offsets')
  .desc(
    `
    Test that the dynamic offsets of the BufferLayout is a multiple of
    'minUniformBufferOffsetAlignment|minStorageBufferOffsetAlignment' if the BindGroup entry defines
    buffer and the buffer type is 'uniform|storage|read-only-storage'.
  `
  )
  .params(u =>
    u //
      .combine('type', kBufferBindingTypes)
      .combine('encoderType', kProgrammableEncoderTypes)
      .beginSubcases()
      .combine('dynamicOffsetVariant', [
        { mult: 1, add: 0 },
        { mult: 0.5, add: 0 },
        { mult: 1.5, add: 0 },
        { mult: 2, add: 0 },
        { mult: 1, add: 2 },
      ])
  )
  .fn(t => {
    const { type, dynamicOffsetVariant, encoderType } = t.params;
    const kBindingSize = 12;

    const minAlignment =
      t.device.limits[
        type === 'uniform' ? 'minUniformBufferOffsetAlignment' : 'minStorageBufferOffsetAlignment'
      ];
    const dynamicOffset = makeValueTestVariant(minAlignment, dynamicOffsetVariant);

    const bindGroupLayout = t.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type, hasDynamicOffset: true },
        },
      ],
    });

    const usage = type === 'uniform' ? GPUBufferUsage.UNIFORM : GPUBufferUsage.STORAGE;
    const isValid = dynamicOffset % minAlignment === 0;

    const buffer = t.createBufferTracked({
      size: 3 * kMinDynamicBufferOffsetAlignment,
      usage,
    });

    const bindGroup = t.device.createBindGroup({
      entries: [{ binding: 0, resource: { buffer, size: kBindingSize } }],
      layout: bindGroupLayout,
    });

    const { encoder, validateFinish } = t.createEncoder(encoderType);
    encoder.setBindGroup(0, bindGroup, [dynamicOffset]);
    validateFinish(isValid);
  });
