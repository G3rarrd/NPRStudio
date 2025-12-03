import WebGLCore from "../../../webGLCore";
import PostProcessingVertexShader from "../../vertexShaders/postProcessingVertexShader";
import { Shader } from "../shader";
import UniformLocationSettings from "./uniformSettings";

class ShaderSubtract implements Shader {
    public program : WebGLProgram;
    private readonly wgl : WebGLCore;
    private readonly postProcessing : PostProcessingVertexShader;

    private uniformLocationSettings : UniformLocationSettings;
    
    constructor (wgl: WebGLCore) {
        this.wgl = wgl;
        this.postProcessing = new PostProcessingVertexShader();
        this.program = this.wgl.compileAndLinkProgram(this.postProcessing.shader, ShaderSubtract.fragmentShader, "Subtract Shader");
        this.uniformLocationSettings = new UniformLocationSettings(this.wgl, this.program);
    }


    public setUniforms() : void {
        const gl: WebGL2RenderingContext = this.wgl.gl;
        const uls : UniformLocationSettings = this.uniformLocationSettings;

        const U_IMAGE_1 : string = "u_image1";
        const U_IMAGE_2 : string = "u_image2";
        
        const imageLocation1 : WebGLUniformLocation | null = uls.fetchUniformLocation( U_IMAGE_1);
        const imageLocation2 : WebGLUniformLocation | null = uls.fetchUniformLocation( U_IMAGE_2);

        if (imageLocation1 === null) throw new Error (uls.setUniformLocationError(U_IMAGE_1));
        if (imageLocation2 === null) throw new Error (uls.setUniformLocationError(U_IMAGE_2));
        
        gl.uniform1i(imageLocation1, 0);
        gl.uniform1i(imageLocation2, 1);
    }

    
    private static readonly fragmentShader = 
        `#version 300 es
        precision mediump float;
        uniform sampler2D u_image1;
        uniform sampler2D u_image2;
        in vec2 v_texCoord;
        out vec4 outColor; 

        void main() {
            vec4 color1 = texture(u_image1, v_texCoord);
            vec4 color2 = texture(u_image2, v_texCoord);

            vec3 subtract = vec3(color1) - vec3(color2) ;

            outColor = vec4(subtract, color1.a);
        }`
}

export default ShaderSubtract;