import WebGLCore from "../../../webGLCore";
import { Shader } from "../shader";
import PostProcessingVertexShader from '../../vertexShaders/postProcessingVertexShader';
import UniformLocationSettings from "./uniformSettings";

class ShaderStructuredTensor implements Shader {
    private readonly wgl : WebGLCore;
    public readonly postProcessing : PostProcessingVertexShader;
    private readonly uniformLocationSettings : UniformLocationSettings;
    public readonly program: WebGLProgram; 
    
    public readonly outputTextureCount : number = 1;

    constructor (wgl:WebGLCore) {
        this.wgl = wgl;
        this.postProcessing = new PostProcessingVertexShader(); 
        this.program = this.wgl.compileAndLinkProgram(this.postProcessing.shader, ShaderStructuredTensor.fragmentShader, "Structured Tensor Shader");
        this.uniformLocationSettings = new UniformLocationSettings(this.wgl, this.program);
    };

    public setUniforms () : void {
        const gl: WebGL2RenderingContext = this.wgl.gl;
        const uls : UniformLocationSettings = this.uniformLocationSettings;

        const TEX_NUM : number = 0;
        
        const U_IMAGE : string = "u_image";

        const imageLocation = uls.fetchUniformLocation(U_IMAGE);
        if (!imageLocation) throw new Error(uls.setUniformLocationError(U_IMAGE));

        gl.uniform1i(imageLocation, TEX_NUM);
    };


    /**
     * Ensure the image is a gray scale before using this shader for best results
     * */ 
    private static readonly fragmentShader = 
    `#version 300 es
    precision mediump float;
    
    uniform sampler2D u_image;
    
    in vec2 v_texCoord;
    
    layout (location = 0) out vec4 outColor0;

    void main () {

        vec2 onePixel = vec2(1) / vec2(textureSize(u_image, 0));

        vec4 colorSumX =     
        texture(u_image, v_texCoord + onePixel * vec2(-1, -1)) *  1.0 + 
        texture(u_image, v_texCoord + onePixel * vec2(0, -1)) * 2.0 + 
        texture(u_image, v_texCoord + onePixel * vec2(1, -1)) * 1.0 +
        texture(u_image, v_texCoord + onePixel * vec2(-1, 0)) * 0.0 +
        texture(u_image, v_texCoord + onePixel * vec2(0, 0)) * 0.0 +
        texture(u_image, v_texCoord + onePixel * vec2(1, 0)) * 0.0 +
        texture(u_image, v_texCoord + onePixel * vec2(-1, 1)) * -1.0 +
        texture(u_image, v_texCoord + onePixel * vec2(0, 1)) * -2.0 +
        texture(u_image, v_texCoord + onePixel * vec2(1, 1)) * -1.0 ;
        
        vec4 colorSumY =     
        texture(u_image, v_texCoord + onePixel * vec2(-1, -1)) *  1.0 + 
        texture(u_image, v_texCoord + onePixel * vec2(0, -1)) * 0.0 + 
        texture(u_image, v_texCoord + onePixel * vec2(1, -1)) * -1.0 +
        texture(u_image, v_texCoord + onePixel * vec2(-1, 0)) * 2.0 +
        texture(u_image, v_texCoord + onePixel * vec2(0, 0)) * 0.0 +
        texture(u_image, v_texCoord + onePixel * vec2(1, 0)) * -2.0 +
        texture(u_image, v_texCoord + onePixel * vec2(-1, 1)) * 1.0 +
        texture(u_image, v_texCoord + onePixel * vec2(0, 1)) * 0.0 +
        texture(u_image, v_texCoord + onePixel * vec2(1, 1)) * -1.0;

        // Structured Tensor;
        float xx = dot(colorSumX.rgb, colorSumX.rgb);
        float xy = dot(colorSumX.rgb, colorSumY.rgb);
        float yy = dot(colorSumY.rgb, colorSumY.rgb);

        // Output structured Tensor
        float alphaColor = texture(u_image, v_texCoord).a;
        outColor0 = vec4(xx, yy, xy, alphaColor);
    }`;
}

export default ShaderStructuredTensor;
