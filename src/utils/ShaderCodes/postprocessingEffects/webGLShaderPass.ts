import Framebuffer from "../../framebuffer_textures/framebuffer";
import WebGLCore from "../../webGLCore";
import PostProcessingVertexShader from '../vertexShaders/postProcessingVertexShader';

class WebGLShaderPass {
    private readonly wgl: WebGLCore;
    private readonly postProcessing: PostProcessingVertexShader; 

    
    constructor (wgl: WebGLCore) {
        this.wgl = wgl;
        this.postProcessing = new PostProcessingVertexShader();
    }

    public writeShader(config : {
        program: WebGLProgram,
        inputTextures : WebGLTexture[], 
        textureWidth: number, 
        textureHeight: number, 
        fboWrite : Framebuffer,
        setFragmentUniforms :()=> void
    }
    ) : void {
        const gl: WebGL2RenderingContext = this.wgl.gl;
        
        config.fboWrite.bind(); // Enable the rendered image to be drawn on

        this.wgl.clearCanvas(); // Clear the framebuffer

        gl.useProgram(config.program);
        gl.bindVertexArray(this.wgl.vao);

        for (let i = 0; i < config.inputTextures.length; i++) {
            gl.activeTexture(gl.TEXTURE0 + i);
            gl.bindTexture(gl.TEXTURE_2D, config.inputTextures[i]);
        }

        this.postProcessing.setGlobalUniforms(gl, config.program, config.textureWidth, config.textureHeight);
        
        if (config.setFragmentUniforms) config.setFragmentUniforms();

        else console.error("No setFragmentUniforms function provided – skipping fragment uniforms");

        gl.drawArrays(gl.TRIANGLES, 0, 6);

        gl.bindVertexArray(null);
        gl.useProgram(null);

        config.fboWrite.unbind();
    }
}

export default WebGLShaderPass;