import { BaseRenderer } from './BaseRenderer';
import { CellState } from '../types/CellState';

// Helper functions since they're not exported from BaseWebGLRenderer
function createShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Failed to create shader');
  
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error('Shader compile error: ' + info);
  }
  
  return shader;
}

function createProgram(gl: WebGL2RenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram {
  const program = gl.createProgram();
  if (!program) throw new Error('Failed to create program');
  
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error('Program link error: ' + info);
  }
  
  return program;
}

// Vertex shader for full-screen quad
const vertexShaderSource = `#version 300 es
in vec2 a_position;
out vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_position, 0, 1);
  // Flip Y coordinate in texture coordinates
  v_texCoord = vec2((a_position.x + 1.0) * 0.5, 1.0 - (a_position.y + 1.0) * 0.5);
}`;

// Fragment shader for computing the next CA state
const computeShaderSource = `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 v_texCoord;
out vec4 outColor;

uniform sampler2D u_state;
uniform int u_rule;
uniform float u_maxGenerations;

void main() {
  ivec2 size = textureSize(u_state, 0);
  int width = size.x;
  int height = size.y;
  
  // Calculate current position
  ivec2 pos = ivec2(gl_FragCoord.xy);
  
  // For all rows except the bottom row, copy from row below
  if (pos.y > 0) {
    outColor = texelFetch(u_state, ivec2(pos.x, pos.y - 1), 0);
    return;
  }
  
  // For the bottom row (newest generation), compute next state
  // Get states of left, center, and right cells from the first row
  int leftIndex = (pos.x - 1 + width) % width;
  int rightIndex = (pos.x + 1) % width;
  
  // Sample from the first row
  float left = texelFetch(u_state, ivec2(leftIndex, 0), 0).r > 0.5 ? 1.0 : 0.0;
  float center = texelFetch(u_state, ivec2(pos.x, 0), 0).r > 0.5 ? 1.0 : 0.0;
  float right = texelFetch(u_state, ivec2(rightIndex, 0), 0).r > 0.5 ? 1.0 : 0.0;
  
  // Convert to binary pattern (0-7)
  int pattern = int(left) * 4 + int(center) * 2 + int(right);
  
  // Apply rule (check if bit is set in rule number)
  float nextState = float((u_rule >> pattern) & 1);
  
  outColor = vec4(nextState, nextState, nextState, 1.0);
}`;

// Fragment shader for displaying the CA state
const displayShaderSource = `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 v_texCoord;
out vec4 outColor;

uniform sampler2D u_state;
uniform float u_generation;
uniform float u_maxGenerations;
uniform vec2 u_resolution;
uniform float u_cellSize;
uniform float u_cellMargin;
uniform float u_renderMargin;

void main() {
  vec2 coord = v_texCoord * u_resolution;
  
  // Calculate cell position
  float cellX = (coord.x - u_renderMargin) / (u_cellSize + u_cellMargin);
  float cellY = coord.y / (u_cellSize + u_cellMargin);
  
  // Check if we're in the margin between cells
  vec2 cellFract = fract(vec2(cellX, cellY));
  if (cellFract.x < u_cellMargin/(u_cellSize + u_cellMargin) || 
      cellFract.y < u_cellMargin/(u_cellSize + u_cellMargin)) {
    outColor = vec4(0.1, 0.1, 0.1, 1.0);
    return;
  }
  
  // Get cell state from current generation
  float cellIndex = floor(cellX);
  float genOffset = floor(cellY);
  
  // Check bounds
  if (cellIndex < 0.0 || cellIndex >= float(textureSize(u_state, 0).x) || 
      genOffset >= float(u_maxGenerations)) {
    outColor = vec4(0.1, 0.1, 0.1, 1.0);
    return;
  }
  
  // Sample state texture
  vec4 state = texelFetch(u_state, ivec2(int(cellIndex), int(genOffset)), 0);
  
  // Fade out older generations
  float alpha = 1.0 - (genOffset / float(u_maxGenerations)) * 0.7;
  outColor = vec4(
    state.r > 0.5 ? vec3(0.29, 0.61, 1.0) : vec3(0.0),
    alpha
  );
}`;

export class WebGLComputeRenderer implements BaseRenderer {
  private gl: WebGL2RenderingContext | null = null;
  private displayProgram: WebGLProgram | null = null;
  private computeProgram: WebGLProgram | null = null;
  private quadBuffer: WebGLBuffer | null = null;
  private textures: WebGLTexture[] = [];
  private framebuffers: WebGLFramebuffer[] = [];
  private currentTexture = 0;
  private textureWidth = 1;
  private textureHeight = 1;
  private generation = 0;
  private rule = 0;

  initialize(canvas: HTMLCanvasElement): void {
    const gl = canvas.getContext('webgl2');
    if (!gl) {
      throw new Error('WebGL2 not supported');
    }
    this.gl = gl;

    // Set unpack alignment to 1 to support any texture width
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

    // Create shader programs
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const displayFragShader = createShader(gl, gl.FRAGMENT_SHADER, displayShaderSource);
    const computeFragShader = createShader(gl, gl.FRAGMENT_SHADER, computeShaderSource);
    
    this.displayProgram = createProgram(gl, vertexShader, displayFragShader);
    this.computeProgram = createProgram(gl, vertexShader, computeFragShader);
    
    gl.deleteShader(vertexShader);
    gl.deleteShader(displayFragShader);
    gl.deleteShader(computeFragShader);

    // Create quad buffer
    const positions = new Float32Array([
      -1, -1,  // Bottom left
       1, -1,  // Bottom right
      -1,  1,  // Top left
       1,  1,  // Top right
    ]);

    this.quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    // Initialize textures
    this.initializeTextures();

    // Create framebuffers for ping-pong
    for (let i = 0; i < 2; i++) {
      const fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.textures[i], 0);
      this.framebuffers[i] = fb;
    }

    // Enable blending for fade effect
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  private initializeTextures(): void {
    if (!this.gl) return;
    const gl = this.gl;

    // Create textures
    this.textures = [
      gl.createTexture(),
      gl.createTexture()
    ];

    // Initialize both textures with null data
    for (let i = 0; i < 2; i++) {
      const texture = this.textures[i];
      if (!texture) continue;

      gl.bindTexture(gl.TEXTURE_2D, texture);
      
      // Set texture parameters
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      
      // Initialize with 1x1 transparent texture
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.R8,
        1,
        1,
        0,
        gl.RED,
        gl.UNSIGNED_BYTE,
        new Uint8Array([0])
      );
    }
  }

  private updateTexture(state: CellState): void {
    if (!this.gl) return;
    const gl = this.gl;

    const { cells, previousGenerations } = state;
    const { maxVisibleGenerations } = state.viewport;

    // Calculate texture dimensions
    const width = cells.length;
    const height = maxVisibleGenerations;

    // Round up to power of 2 if needed
    const texWidth = Math.pow(2, Math.ceil(Math.log2(width)));
    const texHeight = Math.pow(2, Math.ceil(Math.log2(height)));

    // Create data array for all visible generations
    const data = new Uint8Array(texWidth * texHeight);
    
    // Fill with previous generations from bottom to top
    const allGenerations = [...previousGenerations, cells];
    const visibleGenerations = allGenerations.slice(-height);
    
    // Fill all pixels with 0 first
    data.fill(0);
    
    // Then set the active cells
    visibleGenerations.forEach((genCells, i) => {
      const y = i;  // Start from top
      genCells.forEach((cell, x) => {
        if (cell) {
          const idx = y * texWidth + x;  // Use texWidth for stride
          data[idx] = 255;
        }
      });
    });

    // Resize textures if needed
    if (texWidth !== this.textureWidth || texHeight !== this.textureHeight) {
      this.textureWidth = texWidth;
      this.textureHeight = texHeight;
      
      // Create textures with new size
      for (let i = 0; i < 2; i++) {
        gl.bindTexture(gl.TEXTURE_2D, this.textures[i]);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.R8,
          texWidth,
          texHeight,
          0,
          gl.RED,
          gl.UNSIGNED_BYTE,
          null  // Initialize empty texture first
        );
      }
    }

    // Upload entire texture data
    gl.bindTexture(gl.TEXTURE_2D, this.textures[0]);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R8,
      texWidth,
      texHeight,
      0,
      gl.RED,
      gl.UNSIGNED_BYTE,
      data
    );

    this.currentTexture = 0;
    this.generation = state.generation;
  }

  private computeNextState(): void {
    if (!this.gl || !this.computeProgram) return;
    const gl = this.gl;

    // Bind the compute shader
    gl.useProgram(this.computeProgram);

    // Set up vertex attributes
    const positionLoc = gl.getAttribLocation(this.computeProgram, 'a_position');
    gl.enableVertexAttribArray(positionLoc);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    // Set up source texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textures[this.currentTexture]);
    const stateLoc = gl.getUniformLocation(this.computeProgram, 'u_state');
    const ruleLoc = gl.getUniformLocation(this.computeProgram, 'u_rule');
    const maxGenLoc = gl.getUniformLocation(this.computeProgram, 'u_maxGenerations');
    gl.uniform1i(stateLoc, 0);
    gl.uniform1i(ruleLoc, this.rule);  // Use the current rule
    gl.uniform1f(maxGenLoc, this.textureHeight);

    // Render to the other texture
    const nextTexture = 1 - this.currentTexture;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[nextTexture]);
    gl.viewport(0, 0, this.textureWidth, this.textureHeight);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Compute next state
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Check for errors
    const error = gl.getError();
    if (error !== gl.NO_ERROR) {
      console.error('GL Error in computeNextState:', error);
    }

    this.currentTexture = nextTexture;
  }

  render(state: CellState): void {
    if (!this.gl || !this.displayProgram) return;
    const gl = this.gl;

    // Update canvas size if needed
    const canvas = gl.canvas as HTMLCanvasElement;
    if (canvas.width !== state.viewport.width || canvas.height !== state.viewport.height) {
      console.log('Resizing canvas to', state.viewport.width, 'x', state.viewport.height);
      canvas.width = state.viewport.width;
      canvas.height = state.viewport.height;
    }

    // Update state texture if generation changed
    if (state.generation !== this.generation) {
      console.log('Generation changed:', state.generation);
      this.rule = state.rule;  // Store the current rule
      this.updateTexture(state);
    }

    // Use display shader
    gl.useProgram(this.displayProgram);

    // Set up vertex attributes
    const positionLoc = gl.getAttribLocation(this.displayProgram, 'a_position');
    gl.enableVertexAttribArray(positionLoc);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    // Set uniforms
    const program = this.displayProgram;
    gl.uniform1f(gl.getUniformLocation(program, 'u_generation'), state.generation);
    gl.uniform1f(gl.getUniformLocation(program, 'u_maxGenerations'), state.viewport.maxVisibleGenerations);
    gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), gl.canvas.width, gl.canvas.height);
    gl.uniform1f(gl.getUniformLocation(program, 'u_cellSize'), state.viewport.cellSize);
    gl.uniform1f(gl.getUniformLocation(program, 'u_cellMargin'), state.viewport.cellMargin);
    gl.uniform1f(gl.getUniformLocation(program, 'u_renderMargin'), state.viewport.renderMargin);

    // Bind state texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textures[this.currentTexture]);
    gl.uniform1i(gl.getUniformLocation(program, 'u_state'), 0);

    // Render to screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Check for errors
    const error = gl.getError();
    if (error !== gl.NO_ERROR) {
      console.error('GL Error in render:', error);
    }

    // Compute next state
    this.computeNextState();
  }

  cleanup(): void {
    if (!this.gl) return;
    const gl = this.gl;

    if (this.displayProgram) gl.deleteProgram(this.displayProgram);
    if (this.computeProgram) gl.deleteProgram(this.computeProgram);
    if (this.quadBuffer) gl.deleteBuffer(this.quadBuffer);
    
    this.textures.forEach(texture => {
      if (texture) gl.deleteTexture(texture);
    });
    
    this.framebuffers.forEach(fb => {
      if (fb) gl.deleteFramebuffer(fb);
    });
  }

  dispose(): void {
    this.cleanup();
  }
}
