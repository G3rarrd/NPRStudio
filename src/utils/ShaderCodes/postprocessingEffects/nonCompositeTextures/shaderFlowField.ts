import WebGLCore from "../../../webGLCore";
import { Shader } from "../shader";
import PostProcessingVertexShader from '../../vertexShaders/postProcessingVertexShader';
import UniformLocationSettings from "./uniformSettings";

// Based of their locations in the shader
export enum flowFieldOutputTextureIndex {
    MAGNITUDE = 0,
    XYDIRECTION = 1, 
}

enum flowFieldInputTextureIndex {
    LUMINANCE = 0
}

class ShaderFlowField implements Shader {
    private readonly wgl : WebGLCore;
    private readonly postProcessing : PostProcessingVertexShader;
    public readonly program: WebGLProgram; 

    private readonly uniformLocationSettings : UniformLocationSettings;
    public outputTextureCount = 2;

    constructor (wgl:WebGLCore) {
        this.wgl = wgl;
        this.postProcessing = new PostProcessingVertexShader();
        this.program = this.wgl.compileAndLinkProgram(this.postProcessing.shader, ShaderFlowField.fragmentShader, "Flow Field Shader");
        this.uniformLocationSettings = new UniformLocationSettings(this.wgl, this.program);
    }


    // private setMaxAndMinMagnitude(width : number, height : number) {
    //     const gl = this.wgl.gl;
    //     const pixelData = new Float32Array(width * height * 4);
    //     // gl.readPixels(0, 0, width, height, gl.RGBA, gl.FLOAT, pixelData);
    //     // this.updateMinMaxFromPixels(pixelData);
    // }

    // private updateMinMaxFromPixels(pixelData: Float32Array) {
    //     /* Resets the min and max magnitude for each call */ 
    //     this.minMagnitude = Infinity; 
    //     this.maxMagnitude = -Infinity;
    //     for (let i = 0; i < pixelData.length; i += 4) {
    //         const magnitude = pixelData[i + 2];
    //         if (!isFinite(magnitude)) continue; // Skip Nans/infs
    //         this.minMagnitude = Math.min(this.minMagnitude, magnitude)
    //         this.maxMagnitude = Math.max(this.maxMagnitude, magnitude)
    //     }
    // }

    public setUniforms () {
        const gl: WebGL2RenderingContext = this.wgl.gl;
        const uls : UniformLocationSettings = this.uniformLocationSettings;

        const U_LUMINANCE : string = 'u_luminance';

        const imageLocation = uls.fetchUniformLocation(U_LUMINANCE);

        if (!imageLocation) throw new Error(uls.setUniformLocationError(U_LUMINANCE));

        gl.uniform1i(imageLocation, flowFieldInputTextureIndex.LUMINANCE);
    };

    private static readonly fragmentShader = 
    `#version 300 es
    precision mediump float;

    uniform sampler2D u_luminance; // input image must be grayscaled for accurate result

    in vec2 v_texCoord;

    layout (location = 0) out vec4 magnitude;
    layout (location = 1) out vec4 x_y_direction;

    vec2 getPerpendicularVec(in vec2 v) {
        return vec2(v.y, -v.x);
    }

    vec2 sobelFilter() {
        vec2 onePixel = vec2(1.0) / vec2(textureSize(u_luminance, 0));
        vec2 uv = v_texCoord;

        const vec3 kernelNeg = vec3(-1.0, -2.0, -1.0);
        const vec3 kernelPos = vec3( 1.0,  2.0,  1.0);

        float y00 = texture(u_luminance, uv + vec2(-1.0, -1.0) * onePixel).r;
        float y01 = texture(u_luminance, uv + vec2( 0.0, -1.0) * onePixel).r;
        float y02 = texture(u_luminance, uv + vec2( 1.0, -1.0) * onePixel).r;

        float y10 = texture(u_luminance, uv + vec2(-1.0,  0.0) * onePixel).r;
        float y12 = texture(u_luminance, uv + vec2( 1.0,  0.0) * onePixel).r;

        float y20 = texture(u_luminance, uv + vec2(-1.0,  1.0) * onePixel).r;
        float y21 = texture(u_luminance, uv + vec2( 0.0,  1.0) * onePixel).r;
        float y22 = texture(u_luminance, uv + vec2( 1.0,  1.0) * onePixel).r;

        float gx = 0.0;
        gx += dot(kernelNeg , vec3(y00, y10, y20));
        gx += dot(kernelPos, vec3(y02, y12, y22));

        float gy = 0.0;
        gy += dot(kernelNeg , vec3(y00, y01, y02));
        gy += dot(kernelPos, vec3(y20, y21, y22));

        return vec2(gx, gy); 
    }

    void main() {
        vec2 grad = sobelFilter();
        float mag = length(grad);

        grad = getPerpendicularVec(grad);

        magnitude = vec4(vec3(mag), 1.0);
        x_y_direction = vec4(grad.x, grad.y, 1.0, 1.0);
    }`;
}

export default ShaderFlowField;
