import WebGLCore from "../../../webGLCore";
import { Shader } from "../shader";
import PostProcessingVertexShader from '../../vertexShaders/postProcessingVertexShader';
import UniformLocationSettings from "./uniformSettings";

export enum eigenvectorOutputTextureIndex {
    anisotropy = 0,
    xyFlowMap = 1
}

enum eigenvectorInputTextureIndex {
    tensor = 0
}

class ShaderEigenvector implements Shader {
    public readonly postProcessing : PostProcessingVertexShader;
    public readonly program: WebGLProgram; 
    private readonly wgl : WebGLCore;
    private readonly uniformLocationSettings : UniformLocationSettings;

    public outputTextureCount : number = Object.keys(eigenvectorOutputTextureIndex).length / 2;

    constructor (wgl:WebGLCore) {
        this.wgl = wgl;
        this.postProcessing = new PostProcessingVertexShader();
        this.program = this.wgl.compileAndLinkProgram(this.postProcessing.shader, ShaderEigenvector.fragmentShader, "Eigenvector Shader");
        this.uniformLocationSettings = new UniformLocationSettings(this.wgl, this.program);
    }
    
    public setUniforms () : void {
        const gl: WebGL2RenderingContext = this.wgl.gl;
        const uls : UniformLocationSettings = this.uniformLocationSettings;

        const U_BLURRED_STRUCTURED_TENSOR : string = "u_blurred_structured_tensor";
        
        const tensorLocation =  uls.fetchUniformLocation(U_BLURRED_STRUCTURED_TENSOR);

        if (!tensorLocation) throw new Error(uls.setUniformLocationError(U_BLURRED_STRUCTURED_TENSOR));
        gl.uniform1i(tensorLocation, eigenvectorInputTextureIndex.tensor);
    };


    private static readonly fragmentShader = 
    `#version 300 es
    precision mediump float;

    uniform sampler2D u_blurred_structured_tensor;

    layout (location = 0) out vec4 anisotropy;
    layout (location = 1) out vec4 flow_map;

    in vec2 v_texCoord;

    void main () {
        vec4 color = texture(u_blurred_structured_tensor, v_texCoord);
        vec3 tensor = color.xyz; // blurred tensor values
        float trace = tensor.y + tensor.x;
        float det_term = sqrt((tensor.x - tensor.y)*(tensor.x - tensor.y) + 4.0 * tensor.z* tensor.z);
        
        float lambda1 =  0.5 * (trace + det_term);
        float lambda2 =  0.5 * (trace - det_term );

        vec2 vector = vec2( tensor.x - lambda1 , tensor.z);
        vec2 tangent = length(vector) > 0.0 ? normalize(vector) : vec2(0.0, 1.0);

        float A = (lambda1 + lambda2 > 0.0) 
        ? (lambda1 - lambda2) / (lambda1 + lambda2)
        : 0.0;

        anisotropy = vec4(A, A, A, 1.0);
        flow_map = vec4(tangent.x, tangent.y, 1.0, color.a); 
    }`;

}

export default ShaderEigenvector;
