import WebGLCore from "../../../webGLCore";
import PostProcessingVertexShader from "../../vertexShaders/postProcessingVertexShader";
import { Shader } from "../shader";
import UniformLocationSettings from "./uniformSettings";

export enum subtractFDoGOutputTextureIndex {
    dog = 0
}

enum subtractFDoGInputTextureIndex {
    image1 = 0,
    image2 = 1
}

class ShaderSubtractFDoG implements Shader{
    private readonly wgl : WebGLCore;
    private readonly postProcessing : PostProcessingVertexShader;
    public program : WebGLProgram;
    private p : number = 1.0; // Variable name based on the paper

    private uniformLocationSettings : UniformLocationSettings;
    public readonly outputTextureCount : number = Object.keys(subtractFDoGOutputTextureIndex).length / 2;

    constructor (wgl: WebGLCore) {
        this.wgl = wgl;
        this.postProcessing = new PostProcessingVertexShader();
        this.program = this.wgl.compileAndLinkProgram(this.postProcessing.shader, ShaderSubtractFDoG.fragmentShader, "Subtract FDoG Shader");
        this.uniformLocationSettings = new UniformLocationSettings(this.wgl, this.program);
    }

    public setUniformValues(p : number) {
        this.p = p;
    }

    public setUniforms() : void  {
        const gl: WebGL2RenderingContext = this.wgl.gl;
        const uls : UniformLocationSettings = this.uniformLocationSettings;

        const U_IMAGE_1 : string = 'u_image_1';
        const U_IMAGE_2 : string = 'u_image_2';
        const U_P : string = 'u_p';
        
        const imageLocation1 : WebGLUniformLocation | null = uls.fetchUniformLocation(U_IMAGE_1);
        const imageLocation2 : WebGLUniformLocation | null  = uls.fetchUniformLocation(U_IMAGE_2);
        const pLocation : WebGLUniformLocation | null = uls.fetchUniformLocation(U_P);

        if (imageLocation1 === null) throw new Error(uls.setUniformLocationError(U_IMAGE_1));
        if (imageLocation2 === null) throw new Error(uls.setUniformLocationError(U_IMAGE_2));
        if (pLocation == null) throw new Error(uls.setUniformLocationError(U_P))
        
        gl.uniform1i(imageLocation1, subtractFDoGInputTextureIndex.image1);
        gl.uniform1i(imageLocation2, subtractFDoGInputTextureIndex.image2);
        gl.uniform1f(pLocation, this.p);
    }

    private static readonly fragmentShader = 
        `#version 300 es
        precision mediump float;
        uniform sampler2D u_image_1;
        uniform sampler2D u_image_2;
        uniform float u_p;

        in vec2 v_texCoord;
        layout (location = 0) out vec4 dog; // Difference of Gaussian

        void main() {
            vec4 color1 = texture(u_image_1, v_texCoord);
            vec4 color2 = texture(u_image_2, v_texCoord);

            vec3 subtract = vec3(color1) - (u_p * vec3(color2)) ;

            dog = vec4(subtract, color1.a);
        }`
}

export default ShaderSubtractFDoG;