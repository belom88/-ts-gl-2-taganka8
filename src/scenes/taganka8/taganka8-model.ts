import { GltfAsset, GltfLoader } from 'gltf-loader-ts';
import { GlMatrix } from '../../core/gl-matrix';
import { Buffers, GltfArray } from '../../types/gltf';
import { ModelData } from '../../types/model-data';
import { COMPONENT_TYPE_MAP, COMPONENTS_MAP } from '../../tools/constants';

let loader = new GltfLoader();
let uri = 'http://localhost:8080/taganka8.glb'
export class Taganka8Model {
  public asset: GltfAsset | null = null;

  public async load(): Promise<ModelData> {
    const asset: GltfAsset = await loader.load(uri);
    this.asset = asset;
    return await this.parse();
  }

  private async parse(): Promise<ModelData> {
    if (!this.asset) {
      throw new Error('Data has not been loaded');
    }
    const buffers: { attributes: Buffers, indices?: GltfArray } = await this.parseBufferViews(this.asset);
    const flattenArrays: { [key: string]: GltfArray } = {};
    let vertexCount: number | null = null;

    if (buffers.indices) {
      vertexCount = buffers.indices.length;
      for (const attrKey in buffers.attributes) {
        const buffer = buffers.attributes[attrKey];
        if (!buffer) {
          continue;
        }
        flattenArrays[attrKey] = new buffer.ctor(buffers.indices.length * buffer.components);
      }
      for (let i = 0; i < buffers.indices.length; i++) {
        const index = buffers.indices[i];
        for (const attrKey in buffers.attributes) {
          const buffer = buffers.attributes[attrKey];
          if (!buffer) {
            continue;
          }
          const vector = buffer?.buffer.subarray(index * buffer.components, index * buffer.components + buffer.components);
          flattenArrays[attrKey].set(vector, i * buffer.components);
        }
      }
    } else {
      const positionAttribute = buffers.attributes.POSITION;
      if (!positionAttribute) {
        throw new Error('Model doesn\'t contain POSITION attribute');
      }
      vertexCount = positionAttribute.buffer.length / positionAttribute.components;
      for (const attrKey in buffers.attributes) {
        const buffer = buffers.attributes[attrKey];
        if (!buffer) {
          continue;
        }
        flattenArrays[attrKey] = buffer.buffer;
      }
    }

    if (!flattenArrays.COLOR_0 || !flattenArrays.POSITION) {
      throw new Error('Model doesn\'t contain necessary attributes');
    }

    return {
      attributes: {
        positions: flattenArrays.POSITION,
        colors: flattenArrays.COLOR_0,
        normals: flattenArrays.NORMAL
      },
      transformation: this.calcNodeTransformations(this.asset),
      vertexCount: vertexCount
    };
  }

  private async parseBufferViews(asset: GltfAsset): Promise<{ attributes: Buffers, indices?: GltfArray }> {
    const gltf = asset.gltf;
    const binaryChunk = asset.glbData?.binaryChunk;
    if (!binaryChunk) {
      throw new Error('The gltf doesn\'t contain binary chunk');
    }
    const bufferViews = gltf.bufferViews || [];
    const buffers = [];
    for (let index = 0; index < bufferViews.length; index++) {
      buffers.push(await asset.bufferViewData(index));
    }

    if (buffers.length < 5) {
      throw new Error('Wrong set of buffers');
    }

    const accessors = gltf.accessors || [];
    const attributes = gltf.meshes && gltf.meshes[0] && gltf.meshes[0].primitives[0].attributes || {};
    const result: { attributes: Buffers, indices?: GltfArray } = { attributes: {} };
    for (const attrKey in attributes) {
      const accessor = accessors[attributes[attrKey]];
      if (accessor === undefined) {
        throw new Error('An accessor has not been found');
      }
      const bufferViewIndex = accessor.bufferView;
      if (bufferViewIndex === undefined) {
        throw new Error('An accessor doesn\'t contain bufferView');
      }
      const TypedArrayConstructor = COMPONENT_TYPE_MAP[accessor.componentType] || Uint8Array;
      const buffer = buffers[bufferViewIndex];
      result.attributes[attrKey] = {
        ctor: TypedArrayConstructor,
        components: COMPONENTS_MAP[accessor.type],
        buffer: new TypedArrayConstructor(buffer.buffer, buffer.byteOffset, buffer.byteLength / TypedArrayConstructor.BYTES_PER_ELEMENT)
      };
    }

    const indices = gltf.meshes && gltf.meshes[0] && gltf.meshes[0].primitives[0].indices || -1;
    if (indices >= 0) {
      const accessor = accessors[indices];
      const bufferViewIndex = accessor.bufferView;
      if (bufferViewIndex === undefined) {
        throw new Error('An accessor has not been found');
      }
      const TypedArrayConstructor = COMPONENT_TYPE_MAP[accessor.componentType] || Uint8Array;
      const buffer = buffers[bufferViewIndex];
      result['indices'] = new TypedArrayConstructor(binaryChunk.buffer, buffer.byteOffset, buffer.byteLength / TypedArrayConstructor.BYTES_PER_ELEMENT);
    }

    return result;
  }

  private calcNodeTransformations(asset: GltfAsset): GlMatrix {
    const gltf = asset.gltf;
    const node = gltf.nodes && gltf.nodes[0] || {};
    const result = new GlMatrix();
    if (node.rotation) {
      result.rotateWithQuaternion(node.rotation[0], node.rotation[1], node.rotation[2], node.rotation[3]);
    }
    return result;
  }
}
