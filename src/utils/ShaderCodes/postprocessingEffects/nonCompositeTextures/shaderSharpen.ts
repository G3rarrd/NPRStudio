import { Shader } from "../shader";
import WebGLCore from "../../../webGLCore";
import PostProcessingVertexShader from "../../vertexShaders/postProcessingVertexShader";
import UniformLocationSettings from "./uniformSettings";

class ShaderSharpen implements Shader{
    private readonly wgl : WebGLCore;
    public program : WebGLProgram;
    public postProcessing : PostProcessingVertexShader;

    private readonly uniformLocationSettings : UniformLocationSettings;

    constructor (
        wgl: WebGLCore, 
    ) {
        this.wgl = wgl;
        this.postProcessing = new PostProcessingVertexShader();
        this.program = this.wgl.compileAndLinkProgram(this.postProcessing.shader, ShaderSharpen.fragmentShader, "Sharpen Shader");
        this.uniformLocationSettings = new UniformLocationSettings(this.wgl, this.program);
    }

    private sharpen : number[] = 
    [
        0, -1, 0, 
        -1, 5, -1, 
        0, -1, 0
    ]


    public setUniforms  ()  {
        const gl: WebGL2RenderingContext = this.wgl.gl;
        const uls : UniformLocationSettings = this.uniformLocationSettings;
        const TEX_NUM : number = 0;

        const U_IMAGE : string = "u_image";
        const U_KERNEL : string = "u_kernel";
        const U_KERNEL_WEIGHT : string = "u_kernel_weight";

        const imageLocation: WebGLUniformLocation | null = uls.fetchUniformLocation(U_IMAGE);
        const kernelLocation: WebGLUniformLocation | null = uls.fetchUniformLocation(U_KERNEL);
        const kernelWeightLocation : WebGLUniformLocation | null = uls.fetchUniformLocation(U_KERNEL_WEIGHT);
        
        if (! imageLocation) throw new Error(uls.setUniformLocationError(U_IMAGE));
        if (! kernelLocation) throw new Error(uls.setUniformLocationError(U_KERNEL));
        if (! kernelWeightLocation) throw new Error(uls.setUniformLocationError(U_KERNEL_WEIGHT));
        
        const kernelWeight = this.sharpen.reduce((acc, val) => acc + val, 0);
        
        gl.uniform1f(kernelWeightLocation, kernelWeight)
        gl.uniform1i(imageLocation, TEX_NUM);
        gl.uniform1fv(kernelLocation, this.sharpen);
    };
    
    
    private static readonly fragmentShader = 
        `#version 300 es
        
        precision mediump float;
        
        uniform sampler2D u_image;
        uniform float u_kernel[9];
        uniform float u_kernel_weight;

        in vec2 v_texCoord;

        layout (location = 0) out vec4 outColor0;

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

            if (u_kernel_weight != 0.0) color /= u_kernel_weight;
            
            outColor0 = vec4(color, alphaColor);
        }`
}

export default ShaderSharpen;