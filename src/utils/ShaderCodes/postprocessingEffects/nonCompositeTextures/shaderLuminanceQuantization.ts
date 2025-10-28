import WebGLCore from "../../../webGLCore";
import PostProcessingVertexShader from "../../vertexShaders/postProcessingVertexShader";
import { Shader } from "../shader";
import UniformLocationSettings from "./uniformSettings";

export enum luminanceQuantizationOutputTextureIndex {
    image = 0
}

enum luminanceQuantizationInputTextureIndex {
    image = 0
}

class ShaderLuminanceQuantization implements Shader {
    private readonly wgl : WebGLCore;
    public readonly postProcessing : PostProcessingVertexShader;
    public readonly program: WebGLProgram; 
    public colorCount : number = 10;

    private readonly uniformLocationSettings : UniformLocationSettings;

    public readonly outputTextureCount : number = Object.keys(luminanceQuantizationOutputTextureIndex).length / 2;

    constructor (wgl : WebGLCore) {
        this.wgl = wgl;
        this.postProcessing = new PostProcessingVertexShader();
        this.program = this.wgl.compileAndLinkProgram(this.postProcessing.shader,ShaderLuminanceQuantization.fragmentShader, "Luminance Quantization Shader");
        this.uniformLocationSettings = new UniformLocationSettings(this.wgl, this.program);
    }

    public setUniformValues (colorCount : number) : void {
        this.colorCount = colorCount;
    }

    public setUniforms () : void {
        const gl: WebGL2RenderingContext = this.wgl.gl;
        const uls : UniformLocationSettings = this.uniformLocationSettings;

        const U_IMAGE : string = 'u_image';
        
        const U_COLOR_COUNT : string = 'u_color_count';

        const imageLocation : WebGLUniformLocation | null = uls.fetchUniformLocation(U_IMAGE);
        const colorCountLocation : WebGLUniformLocation | null = uls.fetchUniformLocation(U_COLOR_COUNT);

        if (!imageLocation) throw new Error(uls.setUniformLocationError(U_IMAGE));
        if (!colorCountLocation) throw new Error(uls.setUniformLocationError(U_COLOR_COUNT));

        /* Set the Uniforms */ 
        gl.uniform1i(imageLocation, luminanceQuantizationInputTextureIndex.image);
        gl.uniform1f(colorCountLocation, this.colorCount);
    };


    private static readonly fragmentShader: string = 
    `#version 300 es
    precision mediump float;

    uniform sampler2D u_image;
    uniform float u_color_count;

    in vec2 v_texCoord;

    layout (location = 0) out vec4 outColor0;

    vec3 rgb2hsv(vec3 c) {
        vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
        vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
        vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

        float d = q.x - min(q.w, q.y);
        float e = 1.0e-10;
        return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
    }

    vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    float luminanceQuantization(float luminance) {
        float n = u_color_count -1.0;
        float newLuminance = floor((luminance  *n ) + 0.5) / n;
        return newLuminance;
    }

    void main() {
        vec3 color = texture(u_image, v_texCoord).rgb;
        vec3 hsvColor = rgb2hsv(color);

        float newLuminance = luminanceQuantization(hsvColor.b);
        vec3 newHSV = vec3(vec2(hsvColor.rg), newLuminance);

        vec3 newColor = hsv2rgb(newHSV);
        outColor0 = vec4(newColor, 1.0);
    }
    `;
}

export default ShaderLuminanceQuantization;