import WebGLCore from '../../../webGLCore';
import PostProcessingVertexShader from '../../vertexShaders/postProcessingVertexShader';

import { Shader } from '../shader';
import UniformLocationSettings from './uniformSettings';

export enum grayscaleOutputTexture {
    image = 0
}

enum grayscaleInputTexture {
    image = 0
}


class ShaderGrayScale implements Shader{
    private readonly wgl : WebGLCore;
    public readonly program : WebGLProgram;
    public readonly postProcessing : PostProcessingVertexShader;
    private readonly uniformLocationSettings : UniformLocationSettings;
    
    public outputTextureCount : number = Object.keys(grayscaleOutputTexture).length / 2; 

    constructor (wgl: WebGLCore) {
        this.wgl = wgl;
        this.postProcessing = new PostProcessingVertexShader();
        this.program = this.wgl.compileAndLinkProgram(this.postProcessing.shader, ShaderGrayScale.fragmentShader, "Grayscale Shader");
        this.uniformLocationSettings = new UniformLocationSettings(this.wgl, this.program);
    }

    public setUniforms()  {
        const gl: WebGL2RenderingContext = this.wgl.gl;
        const uls : UniformLocationSettings = this.uniformLocationSettings;
        
        const U_IMAGE = 'u_image';

        const imageLocation : WebGLUniformLocation | null = uls.fetchUniformLocation(U_IMAGE);
        
        if (imageLocation === null) throw new Error(uls.setUniformLocationError(U_IMAGE));
        
        gl.uniform1i(imageLocation, grayscaleInputTexture.image);
    }


    private static readonly fragmentShader = 
    `#version 300 es
    precision mediump float;
    
    uniform sampler2D u_image;
    
    in vec2 v_texCoord;

    layout(location = 0) out vec4 outColor0;

    void main() {
        vec4 color = texture(u_image, v_texCoord);
        
        vec3 weights = vec3(0.21, 0.72, 0.07);

        float luminance = dot(color.rgb, weights);
        outColor0 = vec4(vec3(luminance), 1.0);
    }`
}
export default ShaderGrayScale;
