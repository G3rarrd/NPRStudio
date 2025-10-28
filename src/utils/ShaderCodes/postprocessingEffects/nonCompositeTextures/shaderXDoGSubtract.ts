import WebGLCore from "../../../webGLCore";
import PostProcessingVertexShader from '../../vertexShaders/postProcessingVertexShader';
import { Shader } from "../shader";
import UniformLocationSettings from "./uniformSettings";

class ShaderXDoGSubtract implements Shader {
    private readonly wgl : WebGLCore;
    public readonly postProcessing : PostProcessingVertexShader;
    public readonly program : WebGLProgram;
    private uniformLocationSettings : UniformLocationSettings;

    private tau: number = 1.0;
    public outputTextureCount : number = 1;

    constructor(wgl : WebGLCore) {
        this.postProcessing = new PostProcessingVertexShader();
        this.wgl = wgl;
        this.program = this.wgl.compileAndLinkProgram(this.postProcessing.shader,this.fragmentShader, "XDoG Subtract Shader");
        this.uniformLocationSettings = new UniformLocationSettings(this.wgl, this.program);
    }

    public setUniformValues(tau : number) {
        this.tau = tau;
    }

    public setUniforms() {
        const gl: WebGL2RenderingContext = this.wgl.gl;
        const uls : UniformLocationSettings = this.uniformLocationSettings;

        const TEX_NUM : number = 0;
        const TEX_NUM_1 : number = 1;
        
        // Textures
        const U_IMAGE_1 : string = "u_image_1";
        const U_IMAGE_2 : string = 'u_image_2';

        const U_TAU : string = 'u_tau';

        const image1Location : WebGLUniformLocation | null = uls.fetchUniformLocation(U_IMAGE_1);
        const image2Location : WebGLUniformLocation | null = uls.fetchUniformLocation( U_IMAGE_2);
        const tauLocation : WebGLUniformLocation | null = uls.fetchUniformLocation( U_TAU);

        if (!image1Location) throw new Error(uls.setUniformLocationError(U_IMAGE_1));
        if (!image2Location) throw new Error(uls.setUniformLocationError(U_IMAGE_2));
        if (!tauLocation) throw new Error(uls.setUniformLocationError(U_TAU));

        gl.uniform1i(image1Location, TEX_NUM);
        gl.uniform1i(image2Location, TEX_NUM_1);
        gl.uniform1f(tauLocation, this.tau);
    }


    private fragmentShader = 
    `#version 300 es
    precision mediump float;
    
    uniform sampler2D u_image_1;
    uniform sampler2D u_image_2;
    
    uniform float u_tau;

    in vec2 v_texCoord;

    layout (location = 0)out vec4 outColor;

    float luminance(vec3 color) {
        return dot(color, vec3(0.21, 0.72, 0.07));
    }

    void main () {
        vec3 color1 = texture(u_image_1, v_texCoord).rgb;
        vec3 color2 = texture(u_image_2, v_texCoord).rgb;

        float difference = ((1.0 + u_tau) * color1.r) - (u_tau * color2.r);

        outColor = vec4(vec3(difference), 1.0);
    }`
}

export default ShaderXDoGSubtract;