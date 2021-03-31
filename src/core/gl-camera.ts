import { Point } from "../types/point";
import { GlMatrix } from "./gl-matrix";
import { GlVector } from "./gl-vector";

export class GlCamera {
  private _eye: GlVector;
  private _center: GlVector = new GlVector(0, 0, 0);
  private _up: GlVector = new GlVector(0, 1, 0);

  public maxElevation: number = 100;
  public minElevation: number = 4;
  public maxCameraAngle: number = 0.5;

  constructor(eyeX: number, eyeY: number, eyeZ: number) {
    this._eye = new GlVector(eyeX, eyeY, eyeZ);
  }

  get eye() {
    return this._eye;
  }

  get center() {
    return this._center;
  }

  get up() {
    return this._up;
  }

  get toEye(): GlVector {
    return this._eye.copy().subtract(this._center);
  }

  move(delta: Point) {
    const toEyeVector = this.toEye;
    toEyeVector.v[1] = 0;
    const zAxisVector = new GlVector(0, 0, 1);
    const angle = toEyeVector.angleBetween(zAxisVector);
    const rotatedDelta: Point = { x: 0, y: 0 };
    rotatedDelta.x = (delta.x * Math.cos(angle) + delta.y * Math.sin(angle));
    rotatedDelta.y = (delta.x * -Math.sin(angle) + delta.y * Math.cos(angle));
    this._eye.v[0] += -rotatedDelta.x;
    this._eye.v[2] += -rotatedDelta.y;
    this._center.v[0] += -rotatedDelta.x;
    this._center.v[2] += -rotatedDelta.y;
  }

  // x means rotation about y axis
  // y means rotation about axis ortogonal to canvas X axis
  rotate(delta: Point) {
    const toEyeVector = this.toEye;
    const rotationMatrix = new GlMatrix().rotate(-delta.x, 0, 1, 0);
    const zAxisVector = new GlVector(0, 0, 1);
    const toEyeAndUpAngle = toEyeVector.angleBetween(this._up);
    if (Math.abs(toEyeAndUpAngle) > this.maxCameraAngle || delta.y < 0) {
      const angle = toEyeVector.angleBetween(zAxisVector);
      // Rotate x axis on angle
      const x = Math.cos(angle);
      const z = -Math.sin(angle);
      rotationMatrix.rotate(-delta.y, x, 0, z);
    }

    toEyeVector.transform(rotationMatrix);
    if (this._center.v[1] + toEyeVector.v[1] < 2) {
      return;
    }
    this._eye.v[0] = this._center.v[0] + toEyeVector.v[0];
    this._eye.v[1] = this._center.v[1] + toEyeVector.v[1];
    this._eye.v[2] = this._center.v[2] + toEyeVector.v[2];
  }

  zoom(extraMagnitude: number) {
    const toEyeVector = this.toEye;
    const magnitude = toEyeVector.magnitude;
    let resultMagnitude = magnitude + extraMagnitude;
    if (resultMagnitude > this.maxElevation) {
      return;
    }
    if (resultMagnitude < this.minElevation) {
      resultMagnitude = this.minElevation;
    }
    toEyeVector.normalize();
    toEyeVector.scale(resultMagnitude);
    this._eye.v[0] = this._center.v[0] + toEyeVector.v[0];
    this._eye.v[1] = this._center.v[1] + toEyeVector.v[1];
    this._eye.v[2] = this._center.v[2] + toEyeVector.v[2];
  }
}