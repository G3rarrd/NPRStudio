import WebGLCore from "../../../webGLCore";
import PostProcessingVertexShader from '../../vertexShaders/postProcessingVertexShader';
import { Shader } from "../shader";
import UniformLocationSettings from "./uniformSettings";

class ShaderBinaryThreshold implements Shader {
    private  wgl : WebGLCore;
    public readonly program : WebGLProgram;
    public readonly postProcessing : PostProcessingVertexShader;
    private readonly uniformLocationSettings : UniformLocationSettings;

    private threshold : number = 0.3;
    public outputTextureCount : number = 1;

    constructor(wgl : WebGLCore) {
        this.wgl = wgl;
        this.postProcessing = new PostProcessingVertexShader();
        this.program = this.wgl.compileAndLinkProgram(this.postProcessing.shader, ShaderBinaryThreshold.fragmentShader, "Binary Threshold Shader");
        this.uniformLocationSettings = new UniformLocationSettings(this.wgl, this.program);
    }

    public setUniformValues (threshold : number) {
        this.threshold = threshold;
    }

    public setUniforms() : void {
        const gl : WebGL2RenderingContext= this.wgl.gl;
        const uls : UniformLocationSettings = this.uniformLocationSettings;
        
        const TEX_NUM : number = 0;
        
        const U_IMAGE : string =  "u_image";
        
        const U_THRESHOLD : string = "u_threshold";
        
        const imageLocation : WebGLUniformLocation | null | undefined = uls.fetchUniformLocation(U_IMAGE);
        const thresholdLocation : WebGLUniformLocation | null | undefined = uls.fetchUniformLocation(U_THRESHOLD);

        if (! imageLocation) throw new Error(uls.setUniformLocationError(U_IMAGE));
        if (! thresholdLocation) throw new Error(uls.setUniformLocationError(U_THRESHOLD));

        gl.uniform1i(imageLocation, TEX_NUM);
        gl.uniform1f(thresholdLocation, this.threshold);
    }

    private static readonly fragmentShader = 
    `#version 300 es
    
    precision mediump float;

    uniform sampler2D u_image;
    
    uniform float u_threshold;
    
    in vec2 v_texCoord;
    
    layout (location = 0) out vec4 outColor0;
    
    void main () {
        vec4 color = texture(u_image, v_texCoord);
        float average = dot(color.rgb, vec3(0.299, 0.587, 0.114));

        float mask = 0.0;

        if (u_threshold <= average) mask = 1.0;
        
        outColor0 = vec4(vec3(mask), 1.0);
    }`
}

export default ShaderBinaryThreshold;