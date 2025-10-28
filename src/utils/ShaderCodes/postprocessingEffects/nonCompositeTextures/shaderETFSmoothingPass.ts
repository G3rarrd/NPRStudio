import WebGLCore from "../../../webGLCore";
import { Shader } from "../shader";
import PostProcessingVertexShader from "../../vertexShaders/postProcessingVertexShader";
import UniformLocationSettings from "./uniformSettings";

export enum ETFSmoothOutputTextureIndex {
    xyVector = 0
}

enum ETFSmoothInputTextureIndex {
    MAGNITUDE = 0,
    xyDirection = 1,
}

class ShaderETFSmoothingPass implements Shader {
    private readonly wgl : WebGLCore;
    private readonly postProcessing : PostProcessingVertexShader;
    public readonly program: WebGLProgram;
    private readonly uniformLocationSettings : UniformLocationSettings;

    private minMagnitude : number = 0;
    private maxMagnitude : number = 1;
    private blurAxis: [number, number] = [0, 1];
    private kernelSize : number = 3;

    public readonly outputTextureCount : number = Object.keys(ETFSmoothOutputTextureIndex).length / 2;
    
    constructor (wgl:WebGLCore) {
        this.wgl = wgl;
        this.postProcessing = new PostProcessingVertexShader();
        this.program = this.wgl.compileAndLinkProgram(this.postProcessing.shader, ShaderETFSmoothingPass.fragmentShader, "ETF Smoothing X Pass Shader");
        this.uniformLocationSettings = new UniformLocationSettings(this.wgl, this.program);  
    }

    public setUniformValues(blurAxis : [number, number], kernelSize : number) {
        this.blurAxis = blurAxis;
        this.kernelSize = kernelSize;
    }

    
    public setUniforms () : void {
        const gl: WebGL2RenderingContext = this.wgl.gl;
        const uls : UniformLocationSettings = this.uniformLocationSettings;

        const U_MAGNITUDE : string = 'u_magnitude';
        const U_X_Y_DIRECTION : string = 'u_x_y_direction';

        const U_DIRECTION : string = 'u_direction';
        const U_MAX_MAG : string = 'u_max_mag';
        const U_MIN_MAG : string = 'u_min_mag';
        const U_KERNEL_SIZE : string = 'u_kernel_size';

        

        const magnitudeLocation = uls.fetchUniformLocation(U_MAGNITUDE);
        const xyDirectionLocation = uls.fetchUniformLocation(U_X_Y_DIRECTION);
        
        const maxMagLocation = uls.fetchUniformLocation(U_MAX_MAG);
        const minMagLocation = uls.fetchUniformLocation(U_MIN_MAG);
        const kernelSizeLocation = uls.fetchUniformLocation(U_KERNEL_SIZE);
        const directionLocation = uls.fetchUniformLocation(U_DIRECTION);
        
        if (magnitudeLocation === null) throw new Error(uls.setUniformLocationError(U_MAGNITUDE));
        if (xyDirectionLocation === null) throw new Error(uls.setUniformLocationError(U_X_Y_DIRECTION));
        
        if (minMagLocation === null) throw new Error(uls.setUniformLocationError(U_MIN_MAG));
        if (maxMagLocation === null) throw new Error(uls.setUniformLocationError(U_MAX_MAG));
        if (kernelSizeLocation === null) throw new Error(uls.setUniformLocationError(U_KERNEL_SIZE));
        if (directionLocation === null) throw new Error(uls.setUniformLocationError(U_DIRECTION));

        gl.uniform1i(magnitudeLocation, ETFSmoothInputTextureIndex.MAGNITUDE);
        gl.uniform1i(xyDirectionLocation,  ETFSmoothInputTextureIndex.xyDirection);
        
        gl.uniform1f(maxMagLocation, this.maxMagnitude);
        gl.uniform1f(minMagLocation, this.minMagnitude);
        gl.uniform1i(kernelSizeLocation, this.kernelSize);
        gl.uniform2f(directionLocation, this.blurAxis[0], this.blurAxis[1]);
    };


    private static fragmentShader: string = 
        `#version 300 es
        precision mediump float;
        
        uniform sampler2D u_magnitude; // magnitude;
        uniform sampler2D u_x_y_direction; // tangentFlow field xy;
        
        uniform float u_max_mag;
        uniform float u_min_mag;
        uniform int u_kernel_size;
        uniform vec2 u_direction;
        
        in vec2 v_texCoord;
        layout (location = 0) out vec4 x_y_vector; 
        
        // Equation 1: Normalize magnitude to [0, 1]
        float normalizeMagnitude (float mag) {
            float range = u_max_mag - u_min_mag;
            return range > 0.0 ? (mag - u_min_mag) / range : 0.0;
        }
        
        // Equation 2: spatial weight based on vertical distance
        float spatialWeight(vec2 center, vec2 offset) {
            float dist = distance(center, offset);
            float halfSize = float(u_kernel_size) / 2.0;
            return dist < halfSize ? 1.0 : 0.0; 
        }
        
        // Equation 3
        float magnitudeWeight(float gradientMagnitudeX, float gradientMagnitudeY) {
            return (1.0 + tanh(gradientMagnitudeY - gradientMagnitudeX)) / 2.0;
        }
        
        // Equation 4: vector alignment weight
        float distanceWeight(vec2 centerTan, vec2 offsetTan) {
            return abs(dot(centerTan, offsetTan));
        }
        
        // Equation 5: directional agreement
        float computePhi(vec2 centerTan, vec2 offsetTan) {
            return dot(centerTan, offsetTan) > 0.0? 1.0 : -1.0;
        }
        
        vec2 computeNewVector() {
            int kernelHalf = u_kernel_size / 2;
            vec2 invTexSize = 1.0 / vec2(textureSize(u_x_y_direction, 0));
            
            vec2 centerTan = vec2(
                    texture(u_x_y_direction, v_texCoord).rg
                );
            
            float centerMag = texture(u_magnitude, v_texCoord).r;
            centerMag = normalizeMagnitude(centerMag);
        
            vec2 sum = vec2(0.0);

            for (int i = -kernelHalf; i <= kernelHalf; i++) {
                vec2 offsetDirection = float(i) * u_direction;
                vec2 offsetCoord =  v_texCoord + offsetDirection * invTexSize;
                
                vec2 offsetTan = vec2(
                    texture(u_x_y_direction, offsetCoord).rg
                );

                float offsetMag = texture(u_magnitude, offsetCoord).r;
                offsetMag = normalizeMagnitude(offsetMag);
        
                float phi = computePhi(centerTan, offsetTan);
                float sw = spatialWeight(vec2(0.0), offsetDirection);
                float mw = magnitudeWeight(centerMag, offsetMag);
                float dw = distanceWeight(centerTan, offsetTan);

                sum += phi *offsetTan *sw * mw * dw;
            }
        
            float newMag = length(sum);
            return newMag > 0.0 ? sum / newMag : vec2(0.0);
        }
        
        void main() {
            vec2 newVec = computeNewVector();
            x_y_vector = vec4(newVec.x, newVec.y, 1.0, 1.0);

        }`;
}


export default ShaderETFSmoothingPass;
