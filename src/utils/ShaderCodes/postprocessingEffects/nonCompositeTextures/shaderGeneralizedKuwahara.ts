import WebGLCore from "../../../webGLCore";
import PostProcessingVertexShader from "../../vertexShaders/postProcessingVertexShader";
import UniformLocationSettings from "./uniformSettings";

class ShaderGeneralizedKuwahara {
    private readonly wgl : WebGLCore;
    public readonly postProcessing : PostProcessingVertexShader;
    public readonly program: WebGLProgram; 
    private readonly uniformLocationSettings : UniformLocationSettings;

    private radius : number = 5;
    private hardness : number = 50;
    private sharpness : number = 15;
    private u_zeta : number = 2;
    private angle : number = 240;

    
    constructor (wgl: WebGLCore) {
        this.wgl = wgl;
        this.postProcessing = new PostProcessingVertexShader();
        this.program = this.wgl.compileAndLinkProgram(this.postProcessing.shader, ShaderGeneralizedKuwahara.fragmentShader, "Generalized Kuwahara shader")
        this.uniformLocationSettings = new UniformLocationSettings(this.wgl, this.program);
    }

    public setUniformValues (
        radius : number,
        hardness : number,
        sharpness : number,
        u_zeta : number,
        angle : number
    ) {
        this.radius = radius;
        this.hardness = hardness;
        this.sharpness  = sharpness;
        this.u_zeta = u_zeta;
        this.angle = angle * (Math.PI / 8.0);
    }

    public setUniforms()  {
        const gl: WebGL2RenderingContext = this.wgl.gl;
        const uls : UniformLocationSettings = this.uniformLocationSettings;

        const TEX_NUM : number = 0; 
        const U_IMAGE = 'u_image';
        const U_RADIUS = 'u_radius';
        const U_ZETA : string = 'u_zeta';
        const U_ANGLE : string = 'u_angle';
        const U_HARDNESS : string = 'u_hardness';
        const U_SHARPNESS : string = 'u_sharpness';

        const imageLocation : WebGLUniformLocation | null = uls.fetchUniformLocation(U_IMAGE);
        const kernelSizeLocation : WebGLUniformLocation | null = uls.fetchUniformLocation(U_RADIUS);
        const zetaLocation: WebGLUniformLocation | null = uls.fetchUniformLocation(U_ZETA);
        const angleLocation : WebGLUniformLocation | null = uls.fetchUniformLocation(U_ANGLE);
        const hardnessLocation : WebGLUniformLocation | null = uls.fetchUniformLocation(U_HARDNESS);
        const sharpnessLocation : WebGLUniformLocation | null = uls.fetchUniformLocation(U_SHARPNESS);
        
        if (imageLocation === null) throw new Error(uls.setUniformLocationError(U_IMAGE));
        if (kernelSizeLocation === null) throw new Error(uls.setUniformLocationError(U_RADIUS));
        if (zetaLocation === null) throw new Error(uls.setUniformLocationError(U_ZETA));
        if (angleLocation === null) throw new Error(uls.setUniformLocationError(U_ANGLE));
        if (hardnessLocation === null) throw new Error(uls.setUniformLocationError(U_HARDNESS));
        if (sharpnessLocation === null) throw new Error(uls.setUniformLocationError(U_SHARPNESS));
        
        this.angle = (this.angle * (Math.PI / 180)) / 8;
        gl.uniform1i(imageLocation, TEX_NUM);
        gl.uniform1i(kernelSizeLocation, this.radius);
        gl.uniform1f(zetaLocation, this.u_zeta / (this.radius / 2));
        gl.uniform1f(angleLocation, this.angle);
        gl.uniform1f(hardnessLocation, this.hardness);
        gl.uniform1f(sharpnessLocation, this.sharpness);
    }


    private static readonly fragmentShader =
    `#version 300 es
    precision mediump float;
    
    uniform sampler2D u_image;
    uniform int u_radius;
    uniform float u_zeta;
    uniform float u_angle;
    uniform float u_hardness;
    uniform float u_sharpness;


    in vec2 v_texCoord;
    out vec4 outColor;

    const float sqrt2_2 = sqrt(2.0) / 2.0;
    void main() {
        vec2 texelSize = 1.0 / vec2(textureSize(u_image, 0));
        
        int k;
        vec4 m[8];
        vec3 s[8];

        for (int i = 0; i < 8; ++i) {
            m[i] = vec4(0.0);
            s[i] = vec3(0.0);
        }

        int kernelRadius = u_radius / 2;
        float sinZeroCrossing = sin(u_angle);
        float eta = (u_zeta + cos(u_angle)) / (sinZeroCrossing * sinZeroCrossing);

        for (int y = -kernelRadius; y <= kernelRadius; y++) {
            for (int x = -kernelRadius; x <= kernelRadius;x++) {
                vec2 v = vec2(x, y) / float(kernelRadius);
                vec3 c = texture(u_image, v_texCoord + (vec2(x, y)  * texelSize)).rgb;
                c = clamp(c, 0.0, 1.0);
                float sum = 1e-12;
                float w[8];
                float z, vxx, vyy;

                // Polynomial weights calculation
                vxx = u_zeta - eta * v.x * v.x;
                vyy = u_zeta - eta * v.y * v.y;

                z = max(0.0, v.y + vxx);
                w[0] = z*z;
                sum += w[0];

                z = max(0.0, -v.x + vyy);
                w[2] = z*z;
                sum += w[2];

                z = max(0.0, -v.y + vxx);
                w[4] = z*z;
                sum += w[4];

                z = max(0.0, v.x + vyy);
                w[6] = z*z;
                sum += w[6];

                v = sqrt2_2 * vec2(v.x - v.y, v.x + v.y); // Rotate 45 degrees;

                vxx = u_zeta - eta * v.x * v.x;
                vyy = u_zeta - eta * v.y * v.y;

                z = max(0.0, v.y + vxx);
                w[1] = z*z;
                sum += w[1];

                z = max(0.0, -v.x + vyy);
                w[3] = z*z;
                sum += w[3];

                z = max(0.0, -v.y + vxx);
                w[5] = z*z;
                sum += w[5];

                z = max(0.0, v.x + vyy);
                w[7] = z*z;
                sum += w[7];

                float g = exp(-3.125 * dot(v, v)) / sum;

                for (int k = 0; k < 8; k++) {
                    float wk = w[k] * g;
                    m[k] += vec4(c * wk, wk);
                    s[k] += c * c * wk;
                }
            }
        }
            
        vec4 finalColor = vec4(0.0);
        for (k = 0; k < 8; k++) {
            m[k].rgb /= m[k].a;
            s[k] = abs(s[k] / m[k].a - m[k].rgb * m[k].rgb);

            float sigma2 = s[k].r + s[k].g + s[k].b;
            float w = 1.0 / (1.0 + pow(u_hardness * 1000.0 * sigma2, 0.5 * u_sharpness));
            finalColor += vec4(m[k].rgb * w, w);
        }

        outColor = clamp((finalColor / finalColor.a), 0.0, 1.0);
    }`
}


export default ShaderGeneralizedKuwahara;