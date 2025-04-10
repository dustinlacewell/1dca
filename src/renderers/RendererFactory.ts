import { BaseRenderer } from './BaseRenderer';
import { Canvas2DRenderer } from './Canvas2DRenderer';
import { WebGLRenderer } from './WebGLRenderer';

export type RendererType = 'webgl' | 'canvas2d';

// Cache WebGL support check
let webGLSupportCache: boolean | null = null;

/**
 * Check if WebGL2 is supported by the browser without creating a context
 */
function isWebGL2Supported(): boolean {
    if (webGLSupportCache !== null) {
        return webGLSupportCache;
    }

    try {
        // Just probe for support without creating a context
        const canvas = document.createElement('canvas');
        webGLSupportCache = Boolean(
            canvas.getContext('webgl2')  // Only check WebGL2 since we require it
        );
        return webGLSupportCache;
    } catch (e) {
        webGLSupportCache = false;
        return false;
    } finally {
        // Clean up any contexts that might have been created
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl2');
            if (gl) {
                const ext = gl.getExtension('WEBGL_lose_context');
                if (ext) ext.loseContext();
            }
        } catch (e) {
            // Ignore cleanup errors
        }
    }
}

/**
 * Create a renderer instance based on the specified type or available capabilities
 */
export function createRenderer(preferredType?: RendererType): BaseRenderer {
    // If WebGL is supported and either no preference or WebGL is preferred, use WebGL
    if ((preferredType === 'webgl' || !preferredType) && isWebGL2Supported()) {
        try {
            return new WebGLRenderer();
        } catch (e) {
            console.warn('WebGL renderer creation failed:', e);
            // Fall back to Canvas2D
            return new Canvas2DRenderer();
        }
    }

    // Use Canvas2D renderer as fallback
    return new Canvas2DRenderer();
}

// Export the support check for UI components
export const hasWebGLSupport = isWebGL2Supported;
