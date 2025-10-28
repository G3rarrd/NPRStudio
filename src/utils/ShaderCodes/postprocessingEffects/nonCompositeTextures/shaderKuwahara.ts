import { Shader } from "../shader";
import WebGLCore from '../../../webGLCore';
import PostProcessingVertexShader from "../../vertexShaders/postProcessingVertexShader";
import UniformLocationSettings from "./uniformSettings";

class ShaderKuwahara implements Shader {
    private readonly wgl : WebGLCore;
    public readonly postProcessing : PostProcessingVertexShader;
    public readonly program : WebGLProgram;
    private readonly uniformLocationSettings : UniformLocationSettings;
    
    private radius : number = 6;

    constructor (wgl: WebGLCore) {
        this.wgl = wgl;
        this.postProcessing = new PostProcessingVertexShader();
        this.program = this.wgl.compileAndLinkProgram(this.postProcessing.shader, ShaderKuwahara.fragmentShader, "Kuwahara shader")
        this.uniformLocationSettings = new UniformLocationSettings(this.wgl, this.program);
    }

    public setUniformValues(radius : number) {
        this.radius = radius;
    }

    public setUniforms() {
        const gl : WebGL2RenderingContext = this.wgl.gl;
        const uls : UniformLocationSettings = this.uniformLocationSettings;
        
        const TEX_NUM : number = 0;

        const U_IMAGE : string = 'u_image';
        
        const U_KERNEL_SIZE : string = 'u_kernel_size';

        const imageLocation : WebGLUniformLocation | null = uls.fetchUniformLocation(U_IMAGE);
        const kernelSizeLocation : WebGLUniformLocation | null = uls.fetchUniformLocation(U_KERNEL_SIZE);

        if (imageLocation === null) throw new Error(uls.setUniformLocationError(U_IMAGE));
        if (kernelSizeLocation  === null) throw new Error(uls.setUniformLocationError(U_KERNEL_SIZE));

        gl.uniform1i(kernelSizeLocation, this.radius);
        gl.uniform1i(imageLocation, TEX_NUM);
    }


    private static readonly fragmentShader = 
    `#version 300 es
    precision mediump float;
    uniform sampler2D u_image;
    uniform int u_kernel_size;

    in vec2 v_texCoord;
    layout (location = 0) out vec4 outColor0;

    vec4 quadStdCalc(int startX, int startY, int endX, int endY, vec2 texelSize) {
        vec3 quadSum = vec3(0.0);
        int count = 0;

        for (int x = startX; x <= endX; x++) {
            for (int y = startY; y <= endY; y++) {
                vec2 offset = vec2(float(x), float(y)) * texelSize;
                quadSum += texture(u_image, v_texCoord + offset).rgb;
                count++;
            }
        }

        vec3 quadMean =  quadSum / float(count);

        vec3 quadStd = vec3(0.0);
        for (int x = startX; x <= endX; x++) {
            for (int y = startY; y <= endY; y++) {
                vec2 offset = vec2(float(x), float(y)) * texelSize;
                vec3 diff  = (texture(u_image, v_texCoord + offset).rgb - quadMean);
                quadStd += diff *diff;
            }
        }

        quadStd /= float(count);
        float intensity = dot(sqrt(quadStd), vec3(1.0)) / 3.0;
        return vec4(quadMean, intensity);
    }

    void main() {
        vec4 pixelColor = texture(u_image, v_texCoord);
        vec2 textureResolution = vec2(textureSize(u_image, 0));
        vec2 texelSize = 1.0 / textureResolution;

        int halfSize = u_kernel_size / 2;
        
        // 
        vec4 topLeftColor = quadStdCalc(-halfSize, -halfSize, 0, 0, texelSize);
        vec4 topRightColor = quadStdCalc(0, -halfSize, halfSize, 0, texelSize);
        vec4 bottomLeftColor = quadStdCalc(-halfSize, 0, 0, halfSize, texelSize);
        vec4 bottomRightColor = quadStdCalc(0, 0, halfSize, halfSize, texelSize);

        // Track min intensity and color
        float minIntensity = topLeftColor.a;
        vec3 minColor = topLeftColor.rgb;

        if (topRightColor.a < minIntensity) {
            minIntensity = topRightColor.a;
            minColor = topRightColor.rgb;
        }
        if (bottomLeftColor.a < minIntensity) {
            minIntensity = bottomLeftColor.a;
            minColor = bottomLeftColor.rgb;
        }
        if (bottomRightColor.a < minIntensity) {
            minIntensity = bottomRightColor.a;
            minColor = bottomRightColor.rgb;
        }

        outColor0 = vec4(minColor, 1.0);
    }`
}

export default ShaderKuwahara;