import { GlMatrix } from '../../core/gl-matrix';
import { initShaderProgram } from '../../core/gl-shader';
import { ModelData } from '../../types/model-data';
import { ProgramInfo } from '../../types/program-info';
import { Taganka8Model } from './taganka8-model';
import vertexShaderSource from './taganka8.vert.glsl';
import fragmentShaderSource from './taganka8.frag.glsl';
import { GlCamera } from '../../core/gl-camera';

export class Taganka8Scene {
  private vsSource: string = vertexShaderSource;
  private fsSource: string = fragmentShaderSource;
  modelData: ModelData | null = null;

  private programInfo: ProgramInfo | null = null;
  private positionBuffer: WebGLBuffer | null = null;
  private colorBuffer: WebGLBuffer | null = null;
  private normalBuffer: WebGLBuffer | null = null;

  constructor(public gl: WebGLRenderingContext, public camera: GlCamera) {
    const program = initShaderProgram(gl, this.vsSource, this.fsSource);
    if (!program) {
      return;
    }
    this.programInfo = {
      program,
      attribLocations: {
        vertexPosition: gl.getAttribLocation(program, 'aVertexPosition'),
        vertexColor: gl.getAttribLocation(program, 'aVertexColor'),
        vertexNormal: gl.getAttribLocation(program, 'aVertexNormal'),
      },
      uniformLocations: {
        projectionMatrix: gl.getUniformLocation(program, 'uProjectionMatrix'),
        modelViewMatrix: gl.getUniformLocation(program, 'uModelViewMatrix'),
      }
    }
  }

  public initBuffers() {
    if (!this.modelData) {
      throw Error('Model has\'t been loaded correctly');
    }
    this.positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.modelData.attributes.positions, this.gl.STATIC_DRAW);

    this.colorBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.modelData.attributes.colors, this.gl.STATIC_DRAW);

    this.normalBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.normalBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.modelData.attributes.normals, this.gl.STATIC_DRAW);
  }

  public async loadModel() {
    const model: Taganka8Model = new Taganka8Model();
    this.modelData = await model.load();
  }
  public prepareScene() {
    this.initBuffers();

    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    this.gl.clearDepth(1.0);                 // Clear everything
    this.gl.enable(this.gl.DEPTH_TEST);      // Enable depth testing
    this.gl.depthFunc(this.gl.LEQUAL);       // Near things obscure far things

    if (!this.programInfo) {
      throw Error('Shaders haven\'t been compiled correctly');
    }

    // Tell WebGL to use our program when drawing
    this.gl.useProgram(this.programInfo.program);

    const fieldOfView = 45;
    const aspect = this.gl.canvas.width / this.gl.canvas.height;
    const zNear = 0.5;
    const zFar = 1000.0;
    const projectionMatrix = new GlMatrix().perspective(fieldOfView, aspect, zNear, zFar);
    this.gl.uniformMatrix4fv(
      this.programInfo.uniformLocations.projectionMatrix,
      false,
      projectionMatrix.m);
  }

  public drawScene() {
    // Clear the canvas before we start drawing on it.
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    if (!this.modelData) {
      throw Error('Model has\'t been loaded correctly');
    }
    if (!this.programInfo) {
      throw Error('Shaders has\'t been compiled correctly');
    }

    const modelViewMatrix = new GlMatrix()
      .multiplyRight(this.modelData.transformation.m)
      .lookAt(this.camera.eye, this.camera.center, this.camera.up);

    // Tell WebGL how to pull out the positions from the position
    // buffer into the vertexPosition attribute
    {
      const numComponents = 3;
      const type = this.gl.FLOAT;
      const normalize = false;
      const stride = 0;
      const offset = 0;
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
      this.gl.vertexAttribPointer(
        this.programInfo.attribLocations.vertexPosition,
        numComponents,
        type,
        normalize,
        stride,
        offset);
      this.gl.enableVertexAttribArray(
        this.programInfo.attribLocations.vertexPosition);
    }

    // Tell WebGL how to pull out the colors from the color buffer
    // into the vertexColor attribute.
    {
      const numComponents = 4;
      const type = this.gl.UNSIGNED_SHORT;
      const normalize = true;
      const stride = 0;
      const offset = 0;
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
      this.gl.vertexAttribPointer(
        this.programInfo.attribLocations.vertexColor,
        numComponents,
        type,
        normalize,
        stride,
        offset);
      this.gl.enableVertexAttribArray(
        this.programInfo.attribLocations.vertexColor);
    }

    // Tell WebGL how to pull out the normals from the normal buffer
    // into the vertexNormal attribute.
    {
      const numComponents = 3;
      const type = this.gl.FLOAT;
      const normalize = false;
      const stride = 0;
      const offset = 0;
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.normalBuffer);
      this.gl.vertexAttribPointer(
        this.programInfo.attribLocations.vertexNormal,
        numComponents,
        type,
        normalize,
        stride,
        offset);
      this.gl.enableVertexAttribArray(
        this.programInfo.attribLocations.vertexNormal);
    }

    // Set the shader uniforms
    this.gl.uniformMatrix4fv(
      this.programInfo.uniformLocations.modelViewMatrix,
      false,
      modelViewMatrix.m);

    {
      const offset = 0;
      const vertexCount = this.modelData.vertexCount;
      this.gl.drawArrays(this.gl.TRIANGLES, offset, vertexCount);
    }
  }

}
