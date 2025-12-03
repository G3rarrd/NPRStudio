import WebGLCore from "../../../webGLCore";
import { Shader } from "../shader";
import PostProcessingVertexShader from "../../vertexShaders/postProcessingVertexShader";
import UniformLocationSettings from "./uniformSettings";

export enum quantizationOutputTextureIndex {
    image = 0
}

enum quantizationInputTextureIndex {
    image = 0
}

class ShaderQuantization implements Shader {
    private readonly wgl : WebGLCore;
    public readonly postProcessing : PostProcessingVertexShader;
    public readonly program: WebGLProgram;
    private readonly uniformLocationSettings : UniformLocationSettings;

    public colorCount : number = 10;
    
    public readonly outputTextureCount : number = Object.keys(quantizationOutputTextureIndex).length / 2; 


    constructor (wgl : WebGLCore) {
        this.wgl = wgl;
        this.postProcessing = new PostProcessingVertexShader();
        this.program = this.wgl.compileAndLinkProgram(this.postProcessing.shader, ShaderQuantization.fragmentShader, "Quantization Shader");
        this.uniformLocationSettings = new UniformLocationSettings(this.wgl, this.program);
    }

    public setUniformValues (colorCount : number) : void {
        this.colorCount = colorCount;
    }

    public setUniforms () : void {
        const gl: WebGL2RenderingContext = this.wgl.gl 
        const uls : UniformLocationSettings = this.uniformLocationSettings;

        const U_IMAGE : string = 'u_image';

        const U_COLOR_COUNT : string = 'u_color_count'

        const imageLocation : WebGLUniformLocation | null = uls.fetchUniformLocation(U_IMAGE);
        const colorCountLocation : WebGLUniformLocation | null = uls.fetchUniformLocation(U_COLOR_COUNT);

        if (imageLocation === undefined) throw new Error(uls.setUniformLocationError(U_IMAGE));
        if (colorCountLocation === undefined) throw new Error(uls.setUniformLocationError(U_COLOR_COUNT));

        /* Set the Uniforms */ 
        gl.uniform1i(imageLocation, quantizationInputTextureIndex.image);
        gl.uniform1f(colorCountLocation, this.colorCount);
    };


    private static readonly fragmentShader: string = 
    `#version 300 es
    precision mediump float;

    uniform sampler2D u_image;
    uniform float u_color_count;

    in vec2 v_texCoord;

    layout(location = 0) out vec4 outColor0;

    vec3 quantization(vec3 color) {
        float n = u_color_count - 1.0;
        vec3 newColor = floor((color*n) + vec3(0.5)) / n;
        return newColor;
    }

    void main() {
        vec4 color = texture(u_image, v_texCoord);
        vec3 newColor = quantization(color.rgb);
        outColor0 = vec4(newColor, color.a);
    }`;
}

export default ShaderQuantization;
