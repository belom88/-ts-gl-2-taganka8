import { GlMatrix } from "../core/gl-matrix";
import { GltfArray } from "./gltf";

export interface ModelData {
  attributes: { [key: string]: GltfArray };
  transformation: GlMatrix;
  vertexCount: number;
}
