import { BaseWebGLRenderer } from './BaseWebGLRenderer';
import { BaseRenderer, CellState, ViewportOptions } from './BaseRenderer';

// WebGL1 compatible shaders
const SIMPLE_VERTEX_SHADER = `
attribute vec2 a_position;

void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const SIMPLE_FRAGMENT_SHADER = `
precision highp float;

uniform vec4 u_color;

void main() {
    gl_FragColor = u_color;
}`;

// WebGL2 compatible shaders
const SIMPLE_VERTEX_SHADER_WGL2 = `#version 300 es
in vec2 a_position;
void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const SIMPLE_FRAGMENT_SHADER_WGL2 = `#version 300 es
precision highp float;
uniform vec4 u_color;
out vec4 FragColor;
void main() {
    FragColor = u_color;
}`;

export class SimpleQuadRenderer extends BaseWebGLRenderer implements BaseRenderer {
    private vertexBuffer: WebGLBuffer | null = null;
    private colorUniformLocation: WebGLUniformLocation | null = null;

    protected setupGL(): void {
        const gl = this.gl!;
        console.log('Setting up GL...');

        // Choose shaders based on context version
        let vertexShader = SIMPLE_VERTEX_SHADER;
        let fragmentShader = SIMPLE_FRAGMENT_SHADER;

        if (gl instanceof WebGL2RenderingContext) {
            console.log('Using WebGL2 shaders');
            vertexShader = SIMPLE_VERTEX_SHADER_WGL2;
            fragmentShader = SIMPLE_FRAGMENT_SHADER_WGL2;
        } else {
            console.log('Using WebGL1 shaders');
        }

        // Create and set up shaders
        console.log('Creating shader program...');
        this.program = this.createProgram(vertexShader, fragmentShader);
        gl.useProgram(this.program);

        // Create vertex buffer
        console.log('Creating vertex buffer...');
        this.vertexBuffer = gl.createBuffer();
        if (!this.vertexBuffer) {
            throw new Error('Failed to create vertex buffer');
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);

        // Full screen quad vertices (two triangles)
        const vertices = new Float32Array([
            -1.0, -1.0,  // Bottom left
             1.0, -1.0,  // Bottom right
            -1.0,  1.0,  // Top left
             1.0,  1.0,  // Top right
        ]);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        // Set up vertex attributes
        console.log('Setting up vertex attributes...');
        const positionLoc = gl.getAttribLocation(this.program, 'a_position');
        console.log('Position location:', positionLoc);
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

        // Get uniform locations
        console.log('Getting uniform locations...');
        this.colorUniformLocation = gl.getUniformLocation(this.program, 'u_color');
        console.log('Color uniform location:', this.colorUniformLocation);

        const error = gl.getError();
        if (error !== gl.NO_ERROR) {
            throw new Error(`GL error in setupGL: ${error}`);
        }
    }

    updateViewport(_options: ViewportOptions): void {
        // Nothing needed for this simple renderer
    }

    render(_state: CellState): void {
        if (!this.gl || !this.program) {
            console.error('No GL context or program in render');
            return;
        }

        try {
            const gl = this.gl;
            const canvas = gl.canvas as HTMLCanvasElement;

            // Log canvas sizes
            console.log('Canvas size:', canvas.width, 'x', canvas.height);
            console.log('Canvas style size:', canvas.style.width, 'x', canvas.style.height);
            console.log('Drawing buffer size:', gl.drawingBufferWidth, 'x', gl.drawingBufferHeight);

            // Set viewport to match canvas size
            gl.viewport(0, 0, canvas.width, canvas.height);

            // Clear canvas
            gl.clearColor(0.1, 0.1, 0.1, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);

            // Use shader program
            gl.useProgram(this.program);

            // Bind vertex buffer
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);

            // Set up vertex attributes
            const positionLoc = gl.getAttribLocation(this.program, 'a_position');
            gl.enableVertexAttribArray(positionLoc);
            gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

            // Set color uniform (red)
            if (this.colorUniformLocation === null) {
                console.error('No color uniform location');
                return;
            }
            gl.uniform4f(this.colorUniformLocation, 1.0, 0.0, 0.0, 1.0);

            // Draw quad
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            const error = gl.getError();
            if (error !== gl.NO_ERROR) {
                console.error('GL error in render:', error);
            }
        } catch (e) {
            console.error('Error in render:', e);
        }
    }

    dispose(): void {
        if (!this.gl) return;

        if (this.vertexBuffer) {
            this.gl.deleteBuffer(this.vertexBuffer);
            this.vertexBuffer = null;
        }

        super.dispose();
    }
}
