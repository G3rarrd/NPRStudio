import WebGLCore from '../../../webGLCore';
import PostProcessingVertexShader from '../../vertexShaders/postProcessingVertexShader';

import { Shader } from '../shader';
import UniformLocationSettings from './uniformSettings';

class ShaderLabColorSpace implements Shader{
    private readonly wgl : WebGLCore;
    public readonly program : WebGLProgram;
    public readonly postProcessing : PostProcessingVertexShader;
    private readonly uniformLocationSettings : UniformLocationSettings;

    public outputTextureCount : number = 1;

    constructor (wgl: WebGLCore) {
        this.wgl = wgl;
        this.postProcessing = new PostProcessingVertexShader();
        this.program = this.wgl.compileAndLinkProgram(this.postProcessing.shader, ShaderLabColorSpace.fragmentShader, "Grayscale Shader");
        this.uniformLocationSettings = new UniformLocationSettings(this.wgl, this.program);
    }

    public setUniforms()  {
        const gl: WebGL2RenderingContext = this.wgl.gl;
        const uls : UniformLocationSettings = this.uniformLocationSettings;

        const TEX_NUM : number = 0; 
        
        const U_IMAGE = 'u_image';

        const imageLocation : WebGLUniformLocation | null = uls.fetchUniformLocation(U_IMAGE);
        
        if (imageLocation === null) throw new Error(uls.setUniformLocationError(U_IMAGE));
        
        gl.uniform1i(imageLocation, TEX_NUM);
    }

    private static readonly fragmentShader = 
    `#version 300 es
    precision highp float;
    
    uniform sampler2D u_image;
    
    in vec2 v_texCoord;

    layout(location = 0) out vec4 outColor0;

    vec3 srgbToLinear(vec3 srgb) {
        return mix(
            srgb / 12.92, 
            pow((srgb + 0.055) / 1.055, vec3(2.4)), 
            step(vec3(0.04045), srgb)
        );
    }

    vec3 linearRGBToXYZ(vec3 linear) {
        const mat3 M = mat3(
            0.4124564, 0.3575761, 0.1804375,
            0.2126729, 0.7151522, 0.0721750,
            0.0193339, 0.1191920, 0.9503041
        );
        return M * linear;
    }

    vec3 xyzToLab(vec3 xyz) {
        // D65 reference white
        const vec3 white = vec3(0.95047, 1.00000, 1.08883);
        vec3 scaled = xyz / white;

        vec3 f;
        for (int i = 0; i < 3; i++) {
            f[i] = (scaled[i] > 0.008856)
                ? pow(scaled[i], 1.0 / 3.0)
                : (7.787 * scaled[i] + 16.0 / 116.0);
        }

        float L = (116.0 * f.y) - 16.0;
        float a = 500.0 * (f.x - f.y);
        float b = 200.0 * (f.y - f.z);
        return vec3(L, a, b);
    }

    vec3 rgbToLab(vec3 srgb) {
        vec3 linear = srgbToLinear(srgb);
        vec3 xyz = linearRGBToXYZ(linear);
        vec3 lab = xyzToLab(xyz);

        float l = lab.x / 100.0; // L is in [0,100]
        float a = 0.5 + 0.5 * ( lab.y / 127.0 ); // a in [-128, 127]
        float b = 0.5 + 0.5 * ( lab.z / 127.0 ); // b in [-128, 127]
        return vec3(l, a, b);
    }

    void main() {
        vec4 color = texture(u_image, v_texCoord);
         vec3 lab = rgbToLab(color.rgb);

        
        outColor0 = vec4(lab.x, lab.y, lab.z, 1.0);
    }`
}
export default ShaderLabColorSpace;
