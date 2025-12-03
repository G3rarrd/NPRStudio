import WebGLCore from "../../../webGLCore";
import PostProcessingVertexShader from "../../vertexShaders/postProcessingVertexShader";
import { Shader } from "../shader";
import UniformLocationSettings from "./uniformSettings";

class ShaderSuperImpose implements Shader {
    private readonly wgl : WebGLCore;
    private readonly postProcessing : PostProcessingVertexShader;
    public readonly program : WebGLProgram;
    private readonly uniformLocationSettings : UniformLocationSettings;

    public uniformValues: Map<string, number> = new Map<string, number>([]);
    constructor (wgl: WebGLCore) {
        this.wgl = wgl;
        this.postProcessing = new PostProcessingVertexShader();
        this.program = this.wgl.compileAndLinkProgram(this.postProcessing.shader, ShaderSuperImpose.fragmentShader, "Super Impose Shader");
        this.uniformLocationSettings = new UniformLocationSettings(this.wgl, this.program);
    }

    public setUniforms() : void {
        const gl: WebGL2RenderingContext = this.wgl.gl;
        const uls : UniformLocationSettings = this.uniformLocationSettings
        const TEX_NUM : number = 0;
        const TEX_NUM_1 : number = 1;

        const U_IMAGE : string = 'u_image';
        const U_FDoG : string = 'u_fdog';

        const imageLocation1 = uls.fetchUniformLocation(U_IMAGE);
        const imageLocation2 = uls.fetchUniformLocation(U_FDoG);

        if (!imageLocation1) throw new Error(uls.setUniformLocationError(U_IMAGE))
        if (!imageLocation2) throw new Error(uls.setUniformLocationError(U_FDoG))

        gl.uniform1i(imageLocation1, TEX_NUM);
        gl.uniform1i(imageLocation2, TEX_NUM_1);
    }


    private static readonly fragmentShader = 
        `#version 300 es
        precision mediump float;
        uniform sampler2D u_image;
        uniform sampler2D u_fdog;
        in vec2 v_texCoord;
        out vec4 outColor; 

        void main() {
            vec4 imagePixelColor = texture(u_image, v_texCoord);
            vec4 fdogPixelColor = texture(u_fdog, v_texCoord); // most likely 1.0 or 0.0 rgb values

            vec3 finalColor = imagePixelColor.rgb;
            if (fdogPixelColor.r == 0.0) finalColor = vec3(0.0);

            outColor = vec4(finalColor, 1.0);
        }`
}

export default ShaderSuperImpose;