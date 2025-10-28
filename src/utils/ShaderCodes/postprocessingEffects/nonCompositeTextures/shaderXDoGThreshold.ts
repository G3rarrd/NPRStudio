import WebGLCore from "../../../webGLCore";
import PostProcessingVertexShader from '../../vertexShaders/postProcessingVertexShader';
import { Shader } from "../shader";
import UniformLocationSettings from "./uniformSettings";

class ShaderXDoGThreshold implements Shader {
    private readonly wgl : WebGLCore;
    public readonly postProcessing : PostProcessingVertexShader;
    public readonly program : WebGLProgram;
    private uniformLocationSettings : UniformLocationSettings;

    private epsilon: number = 0.9;
    private phi: number = 1.0;

    public outputTextureCount : number = 1;

    constructor(wgl : WebGLCore) {
        this.postProcessing = new PostProcessingVertexShader();
        this.wgl = wgl;
        this.program = this.wgl.compileAndLinkProgram(this.postProcessing.shader,this.fragmentShader, "XDoG Threshold Pass Shader");
        this.uniformLocationSettings = new UniformLocationSettings(this.wgl, this.program);
    }

    public setUniformValues( epsilon : number, phi : number) {
        this.epsilon = epsilon;
        this.phi = phi;
    }

    public setUniforms() {
        const gl: WebGL2RenderingContext = this.wgl.gl;
        const uls : UniformLocationSettings = this.uniformLocationSettings;

        const TEX_NUM : number = 0;
        // Texture
        const u_DOG : string = "u_dog";
        const U_PHI : string = 'u_phi';
        const U_EPSILON : string = 'u_epsilon';

        const image1Location : WebGLUniformLocation | null = uls.fetchUniformLocation(u_DOG);
        const phiLocation : WebGLUniformLocation | null = uls.fetchUniformLocation(U_PHI);
        const epsilonLocation : WebGLUniformLocation | null = uls.fetchUniformLocation(U_EPSILON);

        if (!image1Location) throw new Error(uls.setUniformLocationError(u_DOG));
        if (!phiLocation) throw new Error(uls.setUniformLocationError(U_PHI));
        if (!epsilonLocation) throw new Error(uls.setUniformLocationError(U_EPSILON));

        gl.uniform1i(image1Location, TEX_NUM);
        gl.uniform1f(phiLocation, this.phi);
        gl.uniform1f(epsilonLocation, this.epsilon);
    }

    private fragmentShader = 
    `#version 300 es
    precision mediump float;
    
    uniform sampler2D u_dog;

    uniform float u_epsilon;
    uniform float u_phi; 

    in vec2 v_texCoord;

    layout (location = 0)out vec4 outColor;

    float computeXDoG(float difference, float threshold, float phi) {
        return (difference >= threshold) ? 1.0 : 1.0 + tanh(phi * (difference - threshold));
    }

    void main() {
        float dogValue = texture(u_dog, v_texCoord).r;
        float result = computeXDoG(dogValue, u_epsilon, u_phi);
        result = clamp(result, 0.0, 1.0);  // Ensure valid range
        outColor = vec4(vec3(result), 1.0);
    }`
}

export default ShaderXDoGThreshold;