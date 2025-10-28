import WebGLCore from "../../../webGLCore";
import { Shader } from "../shader";
import PostProcessingVertexShader from "../../vertexShaders/postProcessingVertexShader";
import GaussianCalculations from '../../../math/gaussianCalculation';
import UniformLocationSettings from "./uniformSettings";

export enum streamlineOutputTextureIndex {
    image = 0
}

enum streamlineInputTextureIndex {
    dog = 0,
    xyFlowMap = 1
}

class ShaderStreamlineBlur implements Shader {
    private static readonly MAX_KERNEL_SIZE : number= 1000;
    private readonly wgl : WebGLCore;
    private readonly postProcessing : PostProcessingVertexShader;
    public readonly gaussianCalc : GaussianCalculations;
    public readonly program: WebGLProgram; 
    private readonly uniformLocationSettings : UniformLocationSettings;
    
    private sigmaM : number = 1.0;
    private kernel1D : number[] = [0, 1, 0];
    public kernelSize : number = 3;

    public outputTextureCount : number = Object.keys(streamlineOutputTextureIndex).length / 2;
    
    constructor (wgl:WebGLCore) {
        this.wgl = wgl;
        this.postProcessing = new PostProcessingVertexShader();
        this.gaussianCalc = new GaussianCalculations();
        this.program = this.wgl.compileAndLinkProgram(this.postProcessing.shader, ShaderStreamlineBlur.fragmentShader, "Streamline Blur Shader");
        this.uniformLocationSettings = new UniformLocationSettings(this.wgl, this.program);
    }

    public setUniformValues(sigmaM : number) : void {
        this.sigmaM = sigmaM;
        this.kernelSize = this.gaussianCalc.getKernelSize(this.sigmaM);
        this.kernel1D = this.gaussianCalc.get1DGaussianKernel(this.kernelSize, this.sigmaM);
    }

    public setUniforms ( ) : void {
        const gl: WebGL2RenderingContext = this.wgl.gl; 
        const uls : UniformLocationSettings = this.uniformLocationSettings;

        const U_DoG : string = 'u_dog';
        const U_FLOW_MAP : string = 'u_flow_map';
        const U_KERNEL_SIZE : string = 'u_kernel_size';
        const U_KERNEL : string = 'u_kernel';

        const KERNEL_SIZE : number = this.kernel1D.length;

        const dogLocation : WebGLUniformLocation | null = uls.fetchUniformLocation( U_DoG);
        const flowMapLocation : WebGLUniformLocation | null = uls.fetchUniformLocation( U_FLOW_MAP);
        const kernelSizeLocation: WebGLUniformLocation | null = uls.fetchUniformLocation( U_KERNEL_SIZE);
        const kernelLocation: WebGLUniformLocation | null = uls.fetchUniformLocation( U_KERNEL);
        
        if (!kernelLocation) throw new Error(uls.setUniformLocationError(U_KERNEL));
        if (!dogLocation) throw new Error(uls.setUniformLocationError(U_DoG));
        if (!flowMapLocation) throw new Error(uls.setUniformLocationError(U_FLOW_MAP));
        if (!kernelSizeLocation) throw new Error(uls.setUniformLocationError(U_KERNEL_SIZE));  

        if (KERNEL_SIZE > ShaderStreamlineBlur.MAX_KERNEL_SIZE)  
            throw new Error(`Kernel size ${KERNEL_SIZE} exceeds maximum supported size of ${ShaderStreamlineBlur.MAX_KERNEL_SIZE}.`);

        /* Set the Uniforms */ 
        gl.uniform1i(dogLocation, streamlineInputTextureIndex.dog);
        gl.uniform1i(flowMapLocation, streamlineInputTextureIndex.xyFlowMap);

        gl.uniform1i(kernelSizeLocation, KERNEL_SIZE);
        gl.uniform1fv(kernelLocation, this.kernel1D);
    };


    private static readonly fragmentShader: string = 
    `#version 300 es
    precision mediump float;

    #define MAX_KERNEL_SIZE 1000

    // Input textures
    uniform sampler2D u_dog;       // input DoG texture
    uniform sampler2D u_flow_map;     // ETF x y flow map component

    uniform int u_kernel_size;
    uniform float u_kernel[MAX_KERNEL_SIZE];

    in vec2 v_texCoord;
    layout(location = 0) out vec4 outColor;

    /**
     * Normalizes a 2D vector with fallback for zero-length vectors
     */
    vec2 normalizeVector(vec2 vector) {
        float len = length(vector);
        return (len < 1e-4) ? vec2(1.0, 0.0) : vector / len;
    }

    /**
     * Gets the ETF direction at a given coordinate
     */
    vec2 getETFDirection(vec2 coord) {
        coord = clamp(coord, vec2(0.0), vec2(1.0));
        vec2 vector = texture(u_flow_map, coord).rg;
        return normalizeVector(vector);
    }

    void main() {
        int halfSize = u_kernel_size / 2;
        int center = halfSize;
        
        vec2 texelSize = vec2(1.0) / vec2(textureSize(u_dog, 0));
        
        // Initialize with center sample
        vec4 colorSum = texture(u_dog, v_texCoord) * u_kernel[center];
        
        // Forward ETF streamline convolution
        vec2 coord = v_texCoord;
        for (int i = 1; i <= halfSize; i++) {
            // Get current ETF direction and take a step
            vec2 dir = getETFDirection(coord);
            coord += dir * texelSize;
            coord = clamp(coord, vec2(0.0), vec2(1.0));
            colorSum += texture(u_dog, coord) * u_kernel[center + i];
        }
        
        // Backward ETF streamline convolution  
        coord = v_texCoord;
        for (int i = 1; i <= halfSize; i++) {
            // Get current ETF direction and take a step backward
            vec2 dir = getETFDirection(coord);
            coord -= dir * texelSize;
            coord = clamp(coord, vec2(0.0), vec2(1.0));
            colorSum += texture(u_dog, coord) * u_kernel[center - i];
        }
        
        outColor = colorSum;
    }`;
}


export default ShaderStreamlineBlur;
