import WebGLCore from "../../../webGLCore";
import { Shader } from "../shader";
import PostProcessingVertexShader from "../../vertexShaders/postProcessingVertexShader";
import GaussianCalculations from '../../../math/gaussianCalculation';
import UniformLocationSettings from "./uniformSettings";

export enum edgeBlurOutputTextureIndex {
    image = 0
}

enum edgeBlurInputTextureIndex {
    image = 0,
    flowMap = 1,
}

class ShaderEdgeBlurPass implements Shader {
    private static readonly MAX_KERNEL_SIZE : number= 1000;
    private readonly wgl : WebGLCore;
    public readonly postProcessing : PostProcessingVertexShader;
    public readonly program: WebGLProgram;
    private readonly uniformLocationSettings : UniformLocationSettings;

    private sigmaE : number = 1.6;
    private kernel1D : number[] = [0, 1, 0];
    private gaussianCalc : GaussianCalculations;
    public kernelSize : number = 3;

    public outputTextureCount : number = Object.keys(edgeBlurOutputTextureIndex).length / 2;
    
    constructor (wgl:WebGLCore) {
        this.wgl = wgl;
        this.postProcessing = new PostProcessingVertexShader();
        this.gaussianCalc = new GaussianCalculations();
        this.program = this.wgl.compileAndLinkProgram(this.postProcessing.shader, ShaderEdgeBlurPass.fragmentShader, "Edge Blur Pass Shader");
        this.uniformLocationSettings = new UniformLocationSettings(this.wgl, this.program);
    }

    public setUniformValues(sigmaE : number) {
        this.sigmaE = sigmaE;
        this.kernelSize = this.gaussianCalc.getKernelSize(this.sigmaE); 
        this.kernel1D = this.gaussianCalc.get1DGaussianKernel(this.kernelSize, sigmaE);
    }

    public setUniforms () : void {
        const gl: WebGL2RenderingContext = this.wgl.gl;
        const uls : UniformLocationSettings = this.uniformLocationSettings;

        const U_IMAGE : string = 'u_image';
        const U_FLOW_MAP : string = 'u_flow_map';
        const U_KERNEL : string = 'u_kernel';
        const U_KERNEL_SIZE : string = 'u_kernel_size';

        const KERNEL_SIZE : number = this.kernel1D.length;

        const imageLocation : WebGLUniformLocation | null = uls.fetchUniformLocation(U_IMAGE);
        const flowMapLocation : WebGLUniformLocation | null = uls.fetchUniformLocation(U_FLOW_MAP);
        const kernelSizeLocation: WebGLUniformLocation | null = uls.fetchUniformLocation(U_KERNEL_SIZE);
        const kernelLocation: WebGLUniformLocation | null = uls.fetchUniformLocation(U_KERNEL);
        
        if (!imageLocation) throw new Error(uls.setUniformLocationError(U_IMAGE));
        if (!flowMapLocation) throw new Error(uls.setUniformLocationError(U_FLOW_MAP));
        if (!kernelLocation) throw new Error(uls.setUniformLocationError(U_KERNEL));
        if (!kernelSizeLocation) throw new Error(uls.setUniformLocationError(U_KERNEL_SIZE));

        if (KERNEL_SIZE > ShaderEdgeBlurPass.MAX_KERNEL_SIZE)  
            throw new Error(`Kernel size ${KERNEL_SIZE} exceeds maximum supported size of ${ShaderEdgeBlurPass.MAX_KERNEL_SIZE}.`);

        /* Set the Uniforms */ 
        gl.uniform1i(imageLocation, edgeBlurInputTextureIndex.image);
        gl.uniform1i(flowMapLocation, edgeBlurInputTextureIndex.flowMap);

        gl.uniform1i(kernelSizeLocation, KERNEL_SIZE);
        gl.uniform1fv(kernelLocation, this.kernel1D);
    };
    

    private static readonly fragmentShader: string = 
        `#version 300 es
        precision mediump float;

        #define MAX_KERNEL_SIZE 1000

        // Textures
        uniform sampler2D u_image; // Our texture (CIE L a b is to be used here thus we will collect the r channel of the texture)
        uniform sampler2D u_flow_map; // x_y_flow_map

        uniform float u_p; // Scalar number
        uniform int u_kernel_size; // Kernel Size
        uniform float u_kernel[MAX_KERNEL_SIZE]; // kernel array with a max size of 1000

        in vec2 v_texCoord;

        layout (location = 0) out vec4 outColor;

        void main() {
            vec2 onePixel = vec2(1.0) / vec2(textureSize(u_image, 0));

            vec2 vector =  texture(u_flow_map, v_texCoord).rg;
            float len = length(vector);
            if (len < 1e-4) {
                vector = vec2(1.0, 0.0); // default direction (e.g., horizontal)
                } else {
                    vector = normalize(vector);
            }
            
            // Perpendicular
            vec2 perp = vec2(-vector.y, vector.x);  // Rotate 90 degrees
            vec2 tangentOffset = perp * onePixel;
            
            int halfSize = u_kernel_size / 2; // Half the kernel Size
            
            float result = 0.0;
            for (int i = -halfSize; i <= halfSize; ++i) {
                int kernelIndex = i + halfSize;
                if (kernelIndex >= 0 && kernelIndex < MAX_KERNEL_SIZE) {
                    vec2 offset = tangentOffset * float(i);
                    float samp = texture(u_image, v_texCoord + offset).r;
                    result +=  samp * u_kernel[kernelIndex];
                }
            }
            
            outColor = vec4(vec3(result), 1.0);
        }`;
}


export default ShaderEdgeBlurPass;
