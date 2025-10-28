import WebGLCore from "../../../webGLCore";
import PostProcessingVertexShader from '../../vertexShaders/postProcessingVertexShader';
import { Shader } from "../shader";
import UniformLocationSettings from "./uniformSettings";

export enum tanhThresholdOutputTextureIndex {
    threshold = 0,
}

enum tanhThresholdInputTextureIndex {
    dog = 0
}

class ShaderTanhThreshold implements Shader {
    private readonly wgl : WebGLCore;
    private readonly postProcessing : PostProcessingVertexShader;
    public readonly program : WebGLProgram;
    private readonly uniformLocationSettings : UniformLocationSettings;
    private tau: number = 1.0;

    public readonly outputTextureCount : number = Object.keys(tanhThresholdOutputTextureIndex).length / 2;

    constructor(wgl : WebGLCore) {
        this.wgl = wgl;
        this.postProcessing = new PostProcessingVertexShader();
        this.program = this.wgl.compileAndLinkProgram(this.postProcessing.shader,ShaderTanhThreshold.fragmentShader, "Tanh Threshold Shader");
        this.uniformLocationSettings = new UniformLocationSettings(this.wgl, this.program)
    }

    public setUniformValues(tau : number) {
        this.tau = tau;
    }
    
    public setUniforms() {
        const gl: WebGL2RenderingContext = this.wgl.gl;
        const uls : UniformLocationSettings = this.uniformLocationSettings;

        const U_DoG : string = 'u_dog';
        const U_TAU : string = 'u_tau';

        const dogLocation : WebGLUniformLocation | null = uls.fetchUniformLocation( U_DoG);
        const tauLocation : WebGLUniformLocation | null = uls.fetchUniformLocation(U_TAU);

        if (! dogLocation) throw new Error(uls.setUniformLocationError(U_DoG));
        if (! tauLocation) throw new Error(uls.setUniformLocationError(U_TAU));

        gl.uniform1i(dogLocation, tanhThresholdInputTextureIndex.dog);
        gl.uniform1f(tauLocation, this.tau);
    }


    private static readonly fragmentShader = 
        `#version 300 es
        
        precision mediump float;

        uniform sampler2D u_dog;
        uniform float u_tau;

        in vec2 v_texCoord;
        
        out vec4 threshold;
        
        void main () {
            vec4 color = texture(u_dog, v_texCoord);

            float H = dot(color.rgb, vec3(0.299, 0.587, 0.114));

            float finalColor = 0.0;
            float smoothedValue = 1.0 + tanh(H);

            if (H < 0.0 && smoothedValue < u_tau) {
                finalColor = 0.0; 

            } else {
                finalColor = 1.0;
            }
            
            threshold = vec4(vec3(finalColor), 1.0);
        }`
}

export default ShaderTanhThreshold;