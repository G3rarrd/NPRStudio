import { Shader } from "../shader";
import WebGLCore from "../../../webGLCore";
import PostProcessingVertexShader from "../../vertexShaders/postProcessingVertexShader";
import UniformLocationSettings from "./uniformSettings";

class ShaderEmboss implements Shader{
    private readonly wgl : WebGLCore;
    public readonly postProcessing : PostProcessingVertexShader;
    public readonly program : WebGLProgram;
    private readonly uniformLocationSettings : UniformLocationSettings;

    constructor (wgl: WebGLCore) {
        this.wgl = wgl;
        this.postProcessing = new PostProcessingVertexShader();
        this.program = this.wgl.compileAndLinkProgram(this.postProcessing.shader, this.embossFragmentShaderSrc, "Emboss Fragment Shader");
        this.uniformLocationSettings = new UniformLocationSettings(this.wgl, this.program);
    }

    private emboss : number[] = 
    [
        -2, -1,  0,
        -1,  1,  1,
        0,  1,  2,
    ]
    
    public setUniforms  () : void {
        const gl : WebGL2RenderingContext = this.wgl.gl;
        const uls : UniformLocationSettings = this.uniformLocationSettings;

        const TEX_NUM = 0;

        const U_IMAGE = 'u_image';
        
        const U_KERNEL = 'u_kernel';
        const U_KERNEL_WEIGHT = 'u_kernel_weight';
        
        const imageLocation: WebGLUniformLocation | null = uls.fetchUniformLocation( U_IMAGE);
        const kernelLocation: WebGLUniformLocation | null = uls.fetchUniformLocation( U_KERNEL);
        const kernelWeightLocation : WebGLUniformLocation | null = uls.fetchUniformLocation(U_KERNEL_WEIGHT);

        if (imageLocation === null) throw new Error(uls.setUniformLocationError(U_IMAGE));
        if (kernelLocation === null) throw new Error(uls.setUniformLocationError(U_KERNEL));
        if (kernelWeightLocation === null) throw new Error(uls.setUniformLocationError(U_KERNEL_WEIGHT));
        
        const kernelWeight = this.emboss.reduce((acc, val) => acc + val, 0);
        
        gl.uniform1f(kernelWeightLocation, kernelWeight)
        gl.uniform1i(imageLocation, TEX_NUM);
        gl.uniform1fv(kernelLocation, this.emboss);
    };

    private embossFragmentShaderSrc = 
    `#version 300 es
    
    precision mediump float;
    
    uniform sampler2D u_image;
    uniform float u_kernel[9];
    uniform float u_kernel_weight;

    in vec2 v_texCoord;

    layout(location = 0) out vec4 outColor0;

    void main() {
        vec2 onePixel = vec2(1) / vec2(textureSize(u_image, 0));
        float alphaColor = texture(u_image, v_texCoord).a;
        vec4 colorSum =     
        texture(u_image, v_texCoord + onePixel * vec2(-1, -1)) * u_kernel[0] + 
        texture(u_image, v_texCoord + onePixel * vec2(0, -1)) * u_kernel[1] + 
        texture(u_image, v_texCoord + onePixel * vec2(1, -1)) * u_kernel[2] +
        texture(u_image, v_texCoord + onePixel * vec2(-1, 0)) * u_kernel[3] +
        texture(u_image, v_texCoord + onePixel * vec2(0, 0)) * u_kernel[4] +
        texture(u_image, v_texCoord + onePixel * vec2(1, 0)) * u_kernel[5] +
        texture(u_image, v_texCoord + onePixel * vec2(-1, 1)) * u_kernel[6] +
        texture(u_image, v_texCoord + onePixel * vec2(0, 1)) * u_kernel[7] +
        texture(u_image, v_texCoord + onePixel * vec2(1, 1)) * u_kernel[8];

        vec3 color = colorSum.rgb;
        if (u_kernel_weight != 0.0) {
            color /= u_kernel_weight;
        }

        outColor0 = vec4(color, alphaColor);
    }
    `

}

export default ShaderEmboss;