import WebGLCore from "../../../webGLCore";
import { Shader } from "../shader";
import PostProcessingVertexShader from "../../vertexShaders/postProcessingVertexShader";
import GaussianCalculations from "../../../math/gaussianCalculation";
import UniformLocationSettings from "./uniformSettings";

class ShaderGaussianBlurPass implements Shader {
    private static readonly MAX_KERNEL_SIZE : number= 1000;
    private readonly wgl : WebGLCore;
    public readonly postProcessing : PostProcessingVertexShader;
    private readonly uniformLocationSettings : UniformLocationSettings;

    public program: WebGLProgram;
    public gaussianCalc : GaussianCalculations;

    public outputTextureCount : number = 1;
    
    public radius : number = 1.6;
    public direction: [number, number] = [0, 1]; // Either (1, 0) or (0, 1);


    constructor (wgl : WebGLCore) {
        this.postProcessing = new PostProcessingVertexShader();
        this.wgl = wgl;
        this.gaussianCalc = new GaussianCalculations();
        this.program = this.wgl.compileAndLinkProgram(this.postProcessing.shader, ShaderGaussianBlurPass.fragmentShader, "Gaussian Blur");
        this.uniformLocationSettings = new UniformLocationSettings(this.wgl, this.program);
    }

    public setUniformValues(radius : number, direction : [number, number]){
        this.radius = radius;
        this.direction = direction;
    }
    

    public setUniforms () : void {
        const gl = this.wgl.gl;
        const uls = this.uniformLocationSettings;
        
        const U_IMAGE : string = 'u_image';

        const U_DIRECTION : string = 'u_direction';
        const U_KERNEL : string = 'u_kernel';
        const U_KERNEL_SIZE : string = 'u_kernel_size'

        const kernelSize : number = this.gaussianCalc.getKernelSize(this.radius);
        const kernel1D  = this.gaussianCalc.get1DGaussianKernel(kernelSize, this.radius) ;

        const imageLocation : WebGLUniformLocation | null = uls.fetchUniformLocation(U_IMAGE);
        const kernelSizeLocation: WebGLUniformLocation | null = uls.fetchUniformLocation(U_KERNEL_SIZE);

        const kernelLocation: WebGLUniformLocation | null = uls.fetchUniformLocation(U_KERNEL);
        const directionLocation : WebGLUniformLocation | null = uls.fetchUniformLocation(U_DIRECTION);
        
        if (!kernelLocation) throw new Error(uls.setUniformLocationError(U_KERNEL));
        if (!imageLocation) throw new Error(uls.setUniformLocationError(U_IMAGE));
        if (! kernelSizeLocation) throw new Error(uls.setUniformLocationError(U_KERNEL_SIZE));
        if (! directionLocation) throw new Error(uls.setUniformLocationError(U_DIRECTION))
        
        if (kernelSize > ShaderGaussianBlurPass.MAX_KERNEL_SIZE)  
            throw new Error(`Kernel size ${kernelSize} exceeds maximum supported size of ${ShaderGaussianBlurPass.MAX_KERNEL_SIZE}.`);

        /* Set the Uniforms */ 
        gl.uniform1i(imageLocation, 0);
        gl.uniform1i(kernelSizeLocation, kernelSize);
        gl.uniform1fv(kernelLocation, kernel1D);
        gl.uniform2f(directionLocation, this.direction[0], this.direction[1]);
    };
    
    private static readonly fragmentShader: string = 
        `#version 300 es
        precision mediump float;

        #define MAX_KERNEL_SIZE 1000

        uniform sampler2D u_image; // Our texture

        uniform int u_kernel_size; // The Kernel Size
        uniform float u_kernel[MAX_KERNEL_SIZE]; // kernel array with a max size of 200
        
        uniform vec2 u_direction;

        in vec2 v_texCoord;

        layout(location = 0) out vec4 outColor0;

        void main() {
            vec2 texelSize = 1.0 / vec2(textureSize(u_image, 0));
            vec4 colorSum = vec4(0.0);
            int halfSize = u_kernel_size / 2; // Half the kernel Size

            for (int i = -halfSize; i <= halfSize; ++i) {
                vec2 offset = float(i) * u_direction * texelSize;
                colorSum += texture(u_image, v_texCoord + offset) * u_kernel[halfSize + i];
            }
            outColor0 = colorSum;
        }`;
}


export default ShaderGaussianBlurPass;
