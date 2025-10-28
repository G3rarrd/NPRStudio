import { Shader } from "../shader";
import WebGLCore from "../../../webGLCore";
import PostProcessingVertexShader from "../../vertexShaders/postProcessingVertexShader";
import UniformLocationSettings from "./uniformSettings";

class ShaderSobel implements Shader{
    private readonly wgl : WebGLCore;
    public program : WebGLProgram;
    public postProcessing : PostProcessingVertexShader;

    private readonly uniformLocationSettings : UniformLocationSettings;

    constructor (
        wgl: WebGLCore, 
    ) {
        this.wgl = wgl;
        this.postProcessing = new PostProcessingVertexShader();
        this.program = this.wgl.compileAndLinkProgram(this.postProcessing.shader, ShaderSobel.fragmentShader, "Sobel Shader");
        this.uniformLocationSettings = new UniformLocationSettings(this.wgl, this.program);
    }

    private sobelX : number[] = 
    [
        1, 0, -1, 
        2, 0, -2,
        1, 0, -1
    ]

    private sobelY : number[] = 
    [
        1,2, 1, 
        0, 0, 0, 
        -1, -2, -1
    ]

    public setUniforms  ()  {
        const gl: WebGL2RenderingContext = this.wgl.gl;
        const uls : UniformLocationSettings = this.uniformLocationSettings;

        const TEX_NUM : number = 0;

        const U_IMAGE : string = "u_image";
        const U_KERNEL_X : string = "u_kernel_x";
        const U_KERNEL_Y : string = "u_kernel_y";

        const imageLocation : WebGLUniformLocation | null = uls.fetchUniformLocation(U_IMAGE);
        const kernelXLocation : WebGLUniformLocation | null = uls.fetchUniformLocation(U_KERNEL_X);
        const kernelYLocation : WebGLUniformLocation | null = uls.fetchUniformLocation(U_KERNEL_Y);
        
        if (! imageLocation) throw new Error(uls.setUniformLocationError(U_IMAGE));
        if (! kernelXLocation) throw new Error(uls.setUniformLocationError(U_KERNEL_X));
        if (! kernelYLocation) throw new Error(uls.setUniformLocationError(U_KERNEL_Y));

        gl.uniform1i(imageLocation, TEX_NUM);
        gl.uniform1fv(kernelXLocation, this.sobelX);
        gl.uniform1fv(kernelYLocation, this.sobelY);
    };


    private static readonly fragmentShader = 
        `#version 300 es
        precision mediump float;
        
        uniform sampler2D u_image;
        uniform float u_kernel_x[9];
        uniform float u_kernel_y[9];

        in vec2 v_texCoord;

        layout (location = 0) out vec4 outColor0;

        void main () {
            vec2 onePixel = vec2(1.0) / vec2(textureSize(u_image, 0));

            vec4 colorSumX = 
            
            texture(u_image, v_texCoord + onePixel * vec2(-1, -1)) * u_kernel_x[0] + 
            texture(u_image, v_texCoord + onePixel * vec2(0, -1)) * u_kernel_x[1] + 
            texture(u_image, v_texCoord + onePixel * vec2(1, -1)) * u_kernel_x[2] +
            texture(u_image, v_texCoord + onePixel * vec2(-1, 0)) * u_kernel_x[3] +
            texture(u_image, v_texCoord + onePixel * vec2(0, 0)) * u_kernel_x[4] +
            texture(u_image, v_texCoord + onePixel * vec2(1, 0)) * u_kernel_x[5] +
            texture(u_image, v_texCoord + onePixel * vec2(-1, 1)) * u_kernel_x[6] +
            texture(u_image, v_texCoord + onePixel * vec2(0, 1)) * u_kernel_x[7] +
            texture(u_image, v_texCoord + onePixel * vec2(1, 1)) * u_kernel_x[8];

            vec4 colorSumY = 
            
            texture(u_image, v_texCoord + onePixel * vec2(-1, -1)) * u_kernel_y[0] + 
            texture(u_image, v_texCoord + onePixel * vec2(0, -1)) * u_kernel_y[1] + 
            texture(u_image, v_texCoord + onePixel * vec2(1, -1)) * u_kernel_y[2] +
            texture(u_image, v_texCoord + onePixel * vec2(-1, 0)) * u_kernel_y[3] +
            texture(u_image, v_texCoord + onePixel * vec2(0, 0)) * u_kernel_y[4] +
            texture(u_image, v_texCoord + onePixel * vec2(1, 0)) * u_kernel_y[5] +
            texture(u_image, v_texCoord + onePixel * vec2(-1, 1)) * u_kernel_y[6] +
            texture(u_image, v_texCoord + onePixel * vec2(0, 1)) * u_kernel_y[7] +
            texture(u_image, v_texCoord + onePixel * vec2(1, 1)) * u_kernel_y[8];

            vec3 magnitude = sqrt((colorSumX.rgb * colorSumX.rgb) + 
                                    (colorSumY.rgb * colorSumY.rgb));

            vec3 normalized = magnitude / sqrt(2.0); // Max gradient magnitude is sqrt(2.0) for normalized kernels

            outColor0 = vec4(normalized, 1.0);
        }`
}

export default ShaderSobel;