import WebGLCore from "../../../webGLCore";
import PostProcessingVertexShader from "../../vertexShaders/postProcessingVertexShader";
import { Shader } from "../shader";
import UniformLocationSettings from "./uniformSettings";

class ShaderInvert implements Shader {
    private readonly wgl : WebGLCore;
    public readonly program : WebGLProgram;
    public readonly postProcessing : PostProcessingVertexShader;
    private readonly uniformLocationSettings : UniformLocationSettings;

    constructor (wgl: WebGLCore) {
        this.wgl = wgl;
        this.postProcessing = new PostProcessingVertexShader();
        this.program = this.wgl.compileAndLinkProgram(this.postProcessing.shader, ShaderInvert.fragmentShader, "Invert Shader");
        this.uniformLocationSettings = new UniformLocationSettings(this.wgl, this.program);
    }

    public setUniforms() : void {
        const gl: WebGL2RenderingContext = this.wgl.gl; 
        const uls : UniformLocationSettings = this.uniformLocationSettings;

        const TEX_NUM : number = 0;
        
        const U_IMAGE : string = 'u_image';

        const imageLocation : WebGLUniformLocation | null = uls.fetchUniformLocation(U_IMAGE);
        if (! imageLocation) throw new Error(uls.setUniformLocationError(U_IMAGE));

        gl.uniform1i(imageLocation, TEX_NUM);
    }



    private static readonly fragmentShader : string =
        `#version 300 es
        precision mediump float;

        uniform sampler2D u_image;

        in vec2 v_texCoord;

        layout(location = 0) out vec4 outColor0;

        void main() {
            vec4 color = texture(u_image, v_texCoord);
            vec3 invert = vec3(1.0) - color.rgb;
            outColor0 = vec4(invert, 1.0);
        }`

}

export default ShaderInvert;