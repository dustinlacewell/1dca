export class BaseWebGLRenderer {
    protected gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
    protected canvas: HTMLCanvasElement | null = null;
    protected program: WebGLProgram | null = null;
    protected dpr: number = 1;
    protected isWebGL2: boolean = false;

    constructor() {}

    protected createShader(type: number, source: string): WebGLShader {
        const gl = this.gl!;
        console.log('Compiling shader:', source);
        console.log('First char code:', source.charCodeAt(0));
        console.log('First few chars:', source.split('').map(c => c.charCodeAt(0)));

        const shader = gl.createShader(type);
        if (!shader) {
            throw new Error('Failed to create shader');
        }

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const error = gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            throw new Error(`Shader compilation failed: ${error}`);
        }

        return shader;
    }

    protected createProgram(vertexSource: string, fragmentSource: string): WebGLProgram {
        const gl = this.gl!;
        const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentSource);

        const program = gl.createProgram();
        if (!program) {
            throw new Error('Failed to create program');
        }

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const info = gl.getProgramInfoLog(program);
            gl.deleteProgram(program);
            throw new Error('Program linking failed: ' + info);
        }

        // Clean up shaders
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);

        return program;
    }

    initialize(canvas: HTMLCanvasElement): void {
        console.log('Initializing WebGL renderer');
        this.canvas = canvas;
        this.dpr = window.devicePixelRatio || 1;

        // Try WebGL2 first
        console.log('Trying WebGL2...');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        console.log('Got context:', gl);
        
        if (!gl) {
            console.error('Failed to get WebGL context');
            throw new Error('WebGL not supported');
        }

        this.gl = gl;
        this.isWebGL2 = gl instanceof WebGL2RenderingContext;
        console.log('Using:', this.isWebGL2 ? 'WebGL2' : 'WebGL1');

        this.setupGL();
    }

    protected setupGL(): void {
        // Override in subclass to setup specific GL state
    }

    resize(width: number, height: number): void {
        if (!this.gl || !this.canvas) return;

        const displayWidth = Math.floor(width);
        const displayHeight = Math.floor(height);

        this.canvas.style.width = `${displayWidth}px`;
        this.canvas.style.height = `${displayHeight}px`;

        this.canvas.width = displayWidth * this.dpr;
        this.canvas.height = displayHeight * this.dpr;

        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    dispose(): void {
        if (!this.gl) return;

        // Delete program and associated resources
        if (this.program) {
            this.gl.deleteProgram(this.program);
            this.program = null;
        }

        // Get all WebGL extensions and try to lose context
        const ext = this.gl.getExtension('WEBGL_lose_context');
        if (ext) {
            ext.loseContext();
        }

        this.gl = null;
        this.canvas = null;
    }
}
