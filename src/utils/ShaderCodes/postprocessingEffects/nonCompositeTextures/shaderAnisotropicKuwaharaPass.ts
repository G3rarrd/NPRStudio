import WebGLCore from "../../../webGLCore";
import PostProcessingVertexShader from "../../vertexShaders/postProcessingVertexShader";
import { Shader } from "../shader";
import UniformLocationSettings from "./uniformSettings";

class shaderAnisotropicKuwaharaPass implements Shader {
    private readonly wgl : WebGLCore;
    public readonly postProcessing : PostProcessingVertexShader;
    public readonly program: WebGLProgram; 
    private readonly uniformLocationSettings : UniformLocationSettings;
    
    public outputTextureCount : number = 1; // According to the shader below.  
    
    private radius : number = 5;
    private hardness : number = 50;
    private sharpness : number = 18;
    private zeta : number = 2;
    private angle : number = 240;
    private alpha : number = 1;


    constructor (wgl: WebGLCore) {
        this.wgl = wgl;
        this.postProcessing = new PostProcessingVertexShader();
        this.program = this.wgl.compileAndLinkProgram(this.postProcessing.shader, shaderAnisotropicKuwaharaPass.fragmentShader, "Anisotropic Kuwahara pass shader");
        this.uniformLocationSettings = new UniformLocationSettings(this.wgl, this.program);
    }

    public setUniformValues (
        kernelSize : number,
        hardness : number,
        sharpness : number, 
        zeta : number,
        angle : number, 
        alpha : number
    ) {
        this.radius = kernelSize;
        this.hardness = hardness;
        this.sharpness  = sharpness;
        this.zeta = zeta;
        this.angle = angle ;
        this.alpha = alpha;
    }

    public setUniforms() : void {
        const gl: WebGL2RenderingContext = this.wgl.gl;
        const uls : UniformLocationSettings = this.uniformLocationSettings; 
        const TEX_NUM : number = 0;

        // Textures uniforms  
        const U_IMAGE : string = 'u_image';
        const U_ANISOTR0PY : string = 'u_anisotropy';
        const U_X_MAP : string = 'u_x_map';
        const U_Y_MAP : string = 'u_y_map';

        // Floats and integers uniforms
        const U_RADIUS : string = 'u_radius';
        const U_ZETA : string = 'u_zeta';
        const U_ZERO_CROSSING : string = 'u_zero_crossing';
        const U_HARDNESS : string = 'u_hardness';
        const U_SHARPNESS : string = 'u_sharpness';
        const U_ALPHA : string = 'u_alpha';

        // Textures Location
        const imageLocation : WebGLUniformLocation | null = uls.fetchUniformLocation(U_IMAGE);
        const anisotropyLocation : WebGLUniformLocation | null = uls.fetchUniformLocation(U_ANISOTR0PY);
        const xMapLocation : WebGLUniformLocation | null = uls.fetchUniformLocation(U_X_MAP);
        const yMapLocation : WebGLUniformLocation | null = uls.fetchUniformLocation(U_Y_MAP);

        const radiusLocation : WebGLUniformLocation | null = uls.fetchUniformLocation(U_RADIUS);
        const zetaLocation: WebGLUniformLocation | null = uls.fetchUniformLocation(U_ZETA);
        const zeroCrossingLocation : WebGLUniformLocation | null = uls.fetchUniformLocation(U_ZERO_CROSSING);
        const hardnessLocation : WebGLUniformLocation | null = uls.fetchUniformLocation(U_HARDNESS);
        const sharpnessLocation : WebGLUniformLocation | null = uls.fetchUniformLocation(U_SHARPNESS);
        const alphaLocation : WebGLUniformLocation | null = uls.fetchUniformLocation(U_ALPHA);
        
        if (imageLocation === null) throw new Error(uls.setUniformLocationError(U_IMAGE));
        if (anisotropyLocation === null) throw new Error(uls.setUniformLocationError(U_ANISOTR0PY));
        if (xMapLocation === null) throw new Error(uls.setUniformLocationError(U_X_MAP));
        if (yMapLocation === null) throw new Error(uls.setUniformLocationError(U_Y_MAP));
        
        if (radiusLocation === null) throw new Error(uls.setUniformLocationError(U_RADIUS));
        if (zetaLocation === null) throw new Error(uls.setUniformLocationError(U_ZETA));
        if (zeroCrossingLocation === null) throw new Error(uls.setUniformLocationError(U_ZERO_CROSSING));
        if (hardnessLocation === null) throw new Error(uls.setUniformLocationError(U_HARDNESS));
        if (sharpnessLocation === null) throw new Error(uls.setUniformLocationError(U_SHARPNESS));
        if (alphaLocation === null) throw new Error(uls.setUniformLocationError(U_ALPHA));
        
        gl.uniform1i(imageLocation, TEX_NUM);
        gl.uniform1i(anisotropyLocation, TEX_NUM + 1);
        gl.uniform1i(xMapLocation, TEX_NUM + 2);
        gl.uniform1i(yMapLocation, TEX_NUM + 3);
        
        this.angle = (this.angle * Math.PI / 180) / 8.0;
        gl.uniform1i(radiusLocation, this.radius);
        gl.uniform1f(zetaLocation, this.zeta / (this.radius / 2));
        gl.uniform1f(zeroCrossingLocation,  this.angle);
        gl.uniform1f(hardnessLocation, this.hardness);
        gl.uniform1f(sharpnessLocation, this.sharpness);
        gl.uniform1f(alphaLocation, this.alpha);
    }


    private static readonly fragmentShader =
    `#version 300 es
    precision mediump float;
    
    // Textures
    uniform sampler2D u_image;
    uniform sampler2D u_anisotropy;
    uniform sampler2D u_x_map;
    uniform sampler2D u_y_map;
    
    // Values
    uniform int u_radius;
    uniform float u_zeta;
    uniform float u_zero_crossing;
    uniform float u_hardness;
    uniform float u_sharpness;
    uniform float u_alpha;

    in vec2 v_texCoord;
    layout (location = 0) out vec4 outColor; 

    const float sqrt2_2 = sqrt(2.0) / 2.0;

    void main(){
        vec2 texelSize = 1.0 / vec2(textureSize(u_image, 0));
        float r = float(u_radius / 2); // kernel radius

        int k;
        vec4 m[8];
        vec3 s[8];
        
        // Build mean sum and standard deviation sum matrices for each sector
        for (int i = 0; i < 8; ++i) {
            m[i] = vec4(0.0);
            s[i] = vec3(0.0);
        }
            
        // Get eigenvector of least change and anisotropy from the ETF
        float gradientX = texture(u_x_map, v_texCoord).r;
        float gradientY = texture(u_y_map, v_texCoord).r;
        float anisotropy = texture(u_anisotropy, v_texCoord).r;

        float phi = -atan(gradientY, gradientX);

        // kernel axes with clamping calculation
        float a = r * (u_alpha / (u_alpha + anisotropy));
        float b = r * ((u_alpha + anisotropy) / u_alpha);
        a = clamp(a, r, 2.0*r);
        b = clamp(b, 0.5 * r, r);

        // Build Transformation Matrices : Transforms the circle to an ellipse
        float cos_phi = cos(phi);
        float sin_phi = sin(phi);
        
        mat2 S = mat2(
        1.0/a, 0, 
        0, 1.0/b
        );

        mat2 R_phi = mat2(
        cos_phi, -sin_phi, 
        sin_phi, cos_phi
        );

        mat2 SR = S * R_phi;

        // Axis-Aligned Bounding Box (AABB) of a Rotated Ellipse
        // Calculates the smallest rectangle aligned to the x/y axes that fully contains a rotated ellipse
        int max_x = int(sqrt(a * a * cos_phi * cos_phi + b * b * sin_phi * sin_phi));
        int max_y = int(sqrt(a * a * sin_phi * sin_phi + b * b * cos_phi * cos_phi));

        // Precompute filter parameters
        float sinZeroCrossing = sin(u_zero_crossing);
        float eta = (u_zeta + cos(u_zero_crossing)) / (sinZeroCrossing * sinZeroCrossing);
        float hardnessScale = u_hardness * 1000.0;


        for (int y = -max_y; y <= max_y; y++) {
            for (int x = -max_x; x <= max_x; x++) {
                vec2 v = SR * vec2(float(x), float(y));
                if(dot(v, v) > 0.25) continue;
                vec3 c = texture(u_image, v_texCoord + (vec2(x, y) * texelSize)).rgb;
                c = clamp(c, 0.0, 1.0);
                float sum = 1e-4;
                float w[8];
                float z, vxx, vyy;

                vxx =  u_zeta - eta * v.x * v.x;
                vyy =  u_zeta - eta * v.y * v.y;

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

                v = sqrt2_2  * vec2(v.x - v.y, v.x + v.y); // Rotate 45 degrees;

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
            float w = 1.0 / (1.0 + pow(hardnessScale * sigma2, 0.5 * u_sharpness));
            finalColor += vec4(m[k].rgb * w, w);
        }

        outColor = clamp((finalColor / finalColor.a), 0.0, 1.0);
    }
    `
}


export default shaderAnisotropicKuwaharaPass;