import { BaseRenderer, CellState } from './BaseRenderer';
import { createShader, createProgram } from '../utils/webgl';

// Vertex shader just creates a full-screen quad
const vertexShaderSource = `#version 300 es
in vec2 a_position;
out vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_position, 0, 1);
  // Flip Y coordinate in texture coordinates
  v_texCoord = vec2((a_position.x + 1.0) * 0.5, 1.0 - (a_position.y + 1.0) * 0.5);
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
  float cellY = coord.y / (u_cellSize + u_cellMargin); // No need to flip Y anymore
  
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
  vec4 state = texture(u_state, vec2(
    cellIndex / float(textureSize(u_state, 0).x),
    genOffset / float(u_maxGenerations)
  ));
  
  // Fade out older generations
  float alpha = 1.0 - (genOffset / float(u_maxGenerations)) * 0.7;
  
  outColor = state * alpha;
}`;

// Fragment shader for computing the next CA state
const computeShaderSource = `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 v_texCoord;
out vec4 outColor;

uniform sampler2D u_state;

float getCell(ivec2 offset) {
  ivec2 size = textureSize(u_state, 0);
  ivec2 coord = ivec2(gl_FragCoord.xy) + offset;
  
  // Wrap around edges
  coord = ivec2(
    (coord.x + size.x) % size.x,
    (coord.y + size.y) % size.y
  );
  
  return texelFetch(u_state, coord, 0).r;
}

void main() {
  float center = getCell(ivec2(0, 0));
  
  // Count live neighbors (Moore neighborhood)
  float sum = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      if (x == 0 && y == 0) continue;
      sum += getCell(ivec2(x, y));
    }
  }
  
  // Conway's Game of Life rules
  float nextState = 0.0;
  if (center > 0.5) {
    // Live cell
    nextState = (sum >= 2.0 && sum <= 3.0) ? 1.0 : 0.0;
  } else {
    // Dead cell
    nextState = (sum == 3.0) ? 1.0 : 0.0;
  }
  
  outColor = vec4(nextState, nextState, nextState, 1.0);
}`;

export class WebGLRenderer implements BaseRenderer {
  private gl: WebGL2RenderingContext | null = null;
  private displayProgram: WebGLProgram | null = null;
  private computeProgram: WebGLProgram | null = null;
  private quadBuffer: WebGLBuffer | null = null;
  private textures: [WebGLTexture | null, WebGLTexture | null] = [null, null];
  private framebuffers: [WebGLFramebuffer | null, WebGLFramebuffer | null] = [null, null];
  private currentTexture = 0;
  private textureWidth = 0;
  private textureHeight = 0;
  private generation = 0;

  initialize(canvas: HTMLCanvasElement): void {
    const gl = canvas.getContext('webgl2');
    if (!gl) {
      throw new Error('WebGL2 not supported');
    }
    this.gl = gl;

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

    // Create textures and framebuffers
    for (let i = 0; i < 2; i++) {
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      
      // Use RGBA format instead of R8 for better compatibility
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA8,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null
      );
      
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      
      this.textures[i] = texture;

      const fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      this.framebuffers[i] = fb;
    }

    // Enable blending for fade effect
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  dispose(): void {
    if (!this.gl) return;

    // Delete WebGL resources
    if (this.displayProgram) this.gl.deleteProgram(this.displayProgram);
    if (this.computeProgram) this.gl.deleteProgram(this.computeProgram);
    if (this.quadBuffer) this.gl.deleteBuffer(this.quadBuffer);
    this.textures.forEach(tex => tex && this.gl!.deleteTexture(tex));
    this.framebuffers.forEach(fb => fb && this.gl!.deleteFramebuffer(fb));

    this.displayProgram = null;
    this.computeProgram = null;
    this.quadBuffer = null;
    this.textures = [null, null];
    this.framebuffers = [null, null];
    this.gl = null;
  }

  private updateTexture(state: CellState): void {
    if (!this.gl) return;
    const gl = this.gl;

    const { cells, previousGenerations } = state;
    const { maxVisibleGenerations } = state.viewport;

    // Calculate texture dimensions
    const width = cells.length;
    const height = maxVisibleGenerations + 1; // One row per generation

    console.log('Texture size:', width, 'x', height);
    console.log('Previous generations:', previousGenerations.length);
    console.log('Current cells:', cells.length);

    // Resize textures if needed
    if (width !== this.textureWidth || height !== this.textureHeight) {
      console.log('Resizing textures to', width, 'x', height);
      this.textureWidth = width;
      this.textureHeight = height;
      
      for (let i = 0; i < 2; i++) {
        gl.bindTexture(gl.TEXTURE_2D, this.textures[i]);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA8,
          width,
          height,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          null
        );
      }
    }

    // Create texture data with 4 components (RGBA) per pixel
    const data = new Uint8Array(width * height * 4);
    
    // Fill with transparent black
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 0;     // R
      data[i+1] = 0;   // G
      data[i+2] = 0;   // B
      data[i+3] = 0;   // A
    }
    
    // Get all generations to show
    const allGenerations = [...previousGenerations, cells];
    const startIdx = Math.max(0, allGenerations.length - maxVisibleGenerations);
    const visibleGenerations = allGenerations.slice(startIdx);
    
    console.log('Total generations:', allGenerations.length);
    console.log('Starting from gen:', startIdx);
    console.log('Visible generations:', visibleGenerations.length);

    // Write generations from top to bottom
    visibleGenerations.forEach((genCells, i) => {
      const y = i;
      console.log('Writing generation', startIdx + i, 'to row', y);
      
      genCells.forEach((cell, x) => {
        if (x < width) {
          const idx = (y * width + x) * 4;
          if (cell) {
            data[idx] = 74;     // R (0.29 * 255)
            data[idx+1] = 156;  // G (0.61 * 255)
            data[idx+2] = 255;  // B (1.0 * 255)
            data[idx+3] = 255;  // A (1.0 * 255)
          }
        }
      });
    });

    // Upload to GPU
    gl.bindTexture(gl.TEXTURE_2D, this.textures[0]);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      width,
      height,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      data
    );

    // Check for errors
    const error = gl.getError();
    if (error !== gl.NO_ERROR) {
      console.error('GL Error:', error, 'Data size:', data.length, 'Expected:', width * height * 4);
    }

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
    gl.uniform1i(gl.getUniformLocation(this.computeProgram, 'u_state'), 0);

    // Render to the other texture
    const nextTexture = 1 - this.currentTexture;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[nextTexture]);
    gl.viewport(0, 0, this.textureWidth, this.textureHeight);

    // Compute next state
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    this.currentTexture = nextTexture;
  }

  render(state: CellState): void {
    if (!this.gl || !this.displayProgram) return;
    const gl = this.gl;

    // Update state texture if generation changed
    if (state.generation !== this.generation) {
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

    // Compute next state
    this.computeNextState();
  }
}
