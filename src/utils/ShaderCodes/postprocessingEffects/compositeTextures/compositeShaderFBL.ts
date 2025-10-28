import FramebufferPool from "../../../framebuffer_textures/framebufferPool";
import WebGLCore from "../../../webGLCore";
import CompositeShaderEdgeTangentFlow, { ETFOutputTextureIndex } from "./CompositeShaderETF";
import Framebuffer from "../../../framebuffer_textures/framebuffer";
import ShaderStreamlineBilateral, { streamlineBilateralOutputTextureIndex } from "../nonCompositeTextures/shaderStreamLineBilateral";
import ShaderGradientAlignedBilateral from "../nonCompositeTextures/shaderGradientAlignedBilateralFilter";
import ShaderLuminanceQuantization from "../nonCompositeTextures/shaderLuminanceQuantization";
import WebGLShaderPass from "../webGLShaderPass";

class CompositeShaderFBL {
    private readonly wgl : WebGLCore;
    private readonly shaderPass : WebGLShaderPass;

    private readonly etf : CompositeShaderEdgeTangentFlow;
    private readonly luminanceQuantization : ShaderLuminanceQuantization;
    private readonly streamlineBilateral : ShaderStreamlineBilateral;
    private readonly gradientAlignedBilateral : ShaderGradientAlignedBilateral;

    private iteration : number = 1.0; 
    private sigmaE : number = 1.0;
    private rangeSigmaE : number = 1.0; 
    private sigmaG : number = 1.0;
    private rangeSigmaG : number = 1.0;
    private colorCount : number = 2; // Ensure the color count is base 2;
    private etfKernelSize : number = 3;
    private etfIteration : number = 2;

    constructor (wgl:WebGLCore) {
        this.wgl = wgl;
        this.etf = new CompositeShaderEdgeTangentFlow(this.wgl);
        this.luminanceQuantization = new ShaderLuminanceQuantization(this.wgl);
        this.streamlineBilateral = new ShaderStreamlineBilateral(this.wgl);
        this.gradientAlignedBilateral = new ShaderGradientAlignedBilateral(this.wgl);
        this.shaderPass = new WebGLShaderPass(this.wgl,);
    }

    public setUniformValues (
        etfKernelSize : number, sigmaE : number, 
        sigmaG : number, rangeSigmaE : number, 
        rangeSigmaG : number, 
        iteration : number,
        etfIteration : number,
        colorCount : number,
    ) {
        this.iteration = iteration;
        this.etfIteration = etfIteration;
        this.sigmaE = sigmaE;
        this.rangeSigmaE = rangeSigmaE;
        this.sigmaG = sigmaG;
        this.rangeSigmaG = rangeSigmaG;
        this.etfKernelSize = etfKernelSize;
        this.colorCount = colorCount;
    }

    private streamlineBilateralPass (pool : FramebufferPool, textureWidth : number, textureHeight : number, inputTextures : WebGLTexture[]) : Framebuffer {
        this.streamlineBilateral.setUniformValues(this.sigmaE, this.rangeSigmaE);
        
        const streamlineBilateralFbo : Framebuffer = pool.getWrite(textureWidth, textureHeight, inputTextures, this.streamlineBilateral.outputTextureCount);
        
        this.shaderPass.writeShader({
            program : this.streamlineBilateral.program,
            inputTextures, 
            textureWidth, textureHeight, 
            fboWrite : streamlineBilateralFbo, 
            setFragmentUniforms : this.streamlineBilateral.setUniforms.bind(this.streamlineBilateral)
        })

        return streamlineBilateralFbo;
    }

    private gradientAlignedBilateralPass (pool : FramebufferPool, textureWidth : number, textureHeight : number, inputTextures : WebGLTexture[]) : Framebuffer {
        this.gradientAlignedBilateral.setUniformValues(this.sigmaG, this.rangeSigmaG);
        const gradientAlignedBilateralFbo : Framebuffer = pool.getWrite(textureWidth, textureHeight, inputTextures, this.gradientAlignedBilateral.outputTextureCount);
        
        this.shaderPass.writeShader({
            program : this.gradientAlignedBilateral.program,
            inputTextures, 
            textureWidth, textureHeight, 
            fboWrite : gradientAlignedBilateralFbo, 
            setFragmentUniforms : this.gradientAlignedBilateral.setUniforms.bind(this.gradientAlignedBilateral)
        })

        return gradientAlignedBilateralFbo;
    }
    
    private luminanceQuantizationPass (pool : FramebufferPool, textureWidth : number, textureHeight : number, inputTextures : WebGLTexture[]) : Framebuffer {
        this.luminanceQuantization.setUniformValues(this.colorCount)
        const luminanceQuantizationFbo : Framebuffer = pool.getWrite(textureWidth, textureHeight, inputTextures, this.luminanceQuantization.outputTextureCount);
        
        this.shaderPass.writeShader({
            program : this.luminanceQuantization.program,
            inputTextures, 
            textureWidth, textureHeight, 
            fboWrite : luminanceQuantizationFbo, 
            setFragmentUniforms : this.luminanceQuantization.setUniforms.bind(this.luminanceQuantization)
        })

        return luminanceQuantizationFbo;
    }
    
    public render(pool : FramebufferPool, textureWidth : number, textureHeight : number, inputTextures : WebGLTexture[]) : Framebuffer{
        // Get the Edge Tangent Flow of the Image
        this.etf.setUniformValues(this.etfKernelSize, this.etfIteration);
        const etfFbo : Framebuffer = this.etf.render(pool, textureWidth, textureHeight, inputTextures);
        const flowfieldTexture : WebGLTexture = etfFbo.getTextures()[ETFOutputTextureIndex.flowField]; 

        let currentTexture : WebGLTexture[] = inputTextures;

        let gradientBilateralFbo : Framebuffer | undefined;
        for (let i = 0; i < this.iteration; i++) {
            // Performs a 1D bilateral filter along the streamline of the edge tangent flow
            const streamlineBilateralInputTextures : WebGLTexture[] = [currentTexture[0], flowfieldTexture]; 
            const streamLineBilateralFbo : Framebuffer = this.streamlineBilateralPass(pool, textureWidth, textureHeight, streamlineBilateralInputTextures);
            const streamLineBilateralTexture : WebGLTexture = streamLineBilateralFbo.getTextures()[streamlineBilateralOutputTextureIndex.image];
            
            // Releases the previous gradientBilateral Fbo 
            if (gradientBilateralFbo !== undefined) pool.release(gradientBilateralFbo);
            
            const gradientBilateralInputTextures : WebGLTexture[] = [streamLineBilateralTexture, flowfieldTexture]; 
            gradientBilateralFbo = this.gradientAlignedBilateralPass(pool, textureWidth, textureHeight, gradientBilateralInputTextures);
            pool.release(streamLineBilateralFbo);

            currentTexture = gradientBilateralFbo.getTextures();
        }

        pool.release(etfFbo); // Etf fbo no longer needed

        // gradientBilateral Fbo (used at the current texture) is no longer needed
        if (gradientBilateralFbo !== undefined) pool.release(gradientBilateralFbo);

        this.luminanceQuantization.setUniformValues(this.colorCount)
        const luminanceQuantizationFbo = this.luminanceQuantizationPass(pool, textureWidth, textureHeight, currentTexture);

        return luminanceQuantizationFbo;
    }
}
export default CompositeShaderFBL;