import WebGLCore from "../../../webGLCore";
import CompositeShaderEdgeTangentFlow from "./CompositeShaderETF";
import ShaderGrayScale, { grayscaleOutputTexture } from "../nonCompositeTextures/shaderGrayscale";
import FramebufferPool from '../../../framebuffer_textures/framebufferPool';
import Framebuffer from "../../../framebuffer_textures/framebuffer";
import ShaderEdgeBlurPass, { edgeBlurOutputTextureIndex } from "../nonCompositeTextures/shaderEdgeBlur";
import ShaderSuperImpose from "../nonCompositeTextures/shaderSuperImpose";
import ShaderStreamlineBlur from "../nonCompositeTextures/shaderStreamlineBlur";
import ShaderTanhThreshold, { tanhThresholdOutputTextureIndex } from "../nonCompositeTextures/shaderTanhThreshold";
import ShaderSubtractFDoG from "../nonCompositeTextures/shaderSubtractFDoG";
import WebGLShaderPass from "../webGLShaderPass";
import { ETFSmoothOutputTextureIndex } from "../nonCompositeTextures/shaderETFSmoothingPass";


class CompositeShaderCoherentLineDrawing {
    private static readonly SCALAR : number = 1.6; // for sigmaS according to the paper
    private readonly wgl : WebGLCore;

    private readonly etf : CompositeShaderEdgeTangentFlow;
    private readonly grayscale : ShaderGrayScale;
    private readonly edgeBlur : ShaderEdgeBlurPass;
    private readonly superImpose : ShaderSuperImpose;
    private readonly streamlineBlur : ShaderStreamlineBlur;
    private readonly tanhThreshold : ShaderTanhThreshold;
    private readonly subtractFDoG : ShaderSubtractFDoG;
    private readonly shaderPass : WebGLShaderPass;

    private p : number = 0.9;
    private sigmaS : number = 1.0;
    private sigmaC : number = 1.6;
    private sigmaM : number = 1.5;
    private tau : number = 0.92;
    private iteration : number = 2;
    private etfKernelSize : number = 7;
    private etfIteration : number = 2;
    // public config : RangeSlidersProps[];
    
    constructor (wgl : WebGLCore) {
        this.wgl = wgl;
        this.etf = new CompositeShaderEdgeTangentFlow(this.wgl);
        this.grayscale = new ShaderGrayScale(this.wgl);
        this.edgeBlur = new ShaderEdgeBlurPass(this.wgl);
        this.superImpose = new ShaderSuperImpose(this.wgl);
        this.streamlineBlur = new ShaderStreamlineBlur(this.wgl);
        this.tanhThreshold =  new ShaderTanhThreshold(this.wgl);
        this.subtractFDoG = new ShaderSubtractFDoG(this.wgl);

        // this.etf = new WebGLETF(this.wgl, this.compiledFilters, this.framebufferPool);
        // this.config = [
        //     {min: 0.01, max: 60, step : 0.001, value: this.sigmaC, label: "Thickness"},
        //     {min: 0.01, max: 60, step : 0.001, value: this.sigmaM, label: "Radius M"},
        //     {min: 3, max: 21, step : 2, value: this.etfKernelSize, label: "ETF Kernel Size"},
        //     {min: 1, max: 5, step : 1, value: this.etfIteration, label: "ETF Iteration"},
        //     {min: 0.1, max: 1, step : 0.0001, value: this.tau, label: "Tau"},
        //     {min: 1, max: 5, step : 1, value: this.iteration, label: "Iteration"},
        //     {min: 0.1, max: 1.0, step : 0.0001, value: this.p, label: "P"},
        // ]

        this.shaderPass = new WebGLShaderPass(this.wgl);
    }

    public setUniformValues(
        sigmaC : number, sigmaM : number, 
        etfKernelSize : number, tau : number, 
        p : number, iteration : number,
        etfIteration : number
    ) : void {
        this.p = p;
        this.sigmaS = sigmaC * CompositeShaderCoherentLineDrawing.SCALAR;
        this.tau = tau;
        this.etfKernelSize = etfKernelSize;
        this.sigmaM = sigmaM;
        this.iteration = iteration;
        this.etfIteration = etfIteration;
    }

    private grayscalePass(pool : FramebufferPool, textureWidth : number, textureHeight : number, inputTextures : WebGLTexture[] )  : Framebuffer{
        const grayscaleFbo : Framebuffer = pool.getWrite(textureWidth, textureHeight, inputTextures, this.grayscale.outputTextureCount);

        this.shaderPass.writeShader({
            program : this.grayscale.program,
            inputTextures, 
            textureWidth, textureHeight, 
            fboWrite : grayscaleFbo, 
            setFragmentUniforms : this.grayscale.setUniforms.bind(this.grayscale)
        });

        return grayscaleFbo;
    }
    private subtractFDoGPass(pool : FramebufferPool, textureWidth : number, textureHeight : number, inputTextures : WebGLTexture[] )  : Framebuffer{
        const subtractFDoGFbo : Framebuffer = pool.getWrite(textureWidth, textureHeight, inputTextures, this.subtractFDoG.outputTextureCount);

        this.shaderPass.writeShader({
            program : this.subtractFDoG.program,
            inputTextures, 
            textureWidth, textureHeight, 
            fboWrite : subtractFDoGFbo, 
            setFragmentUniforms : this.subtractFDoG.setUniforms.bind(this.subtractFDoG)
        });

        return subtractFDoGFbo;
    }

    private edgeBlurPass(pool : FramebufferPool, textureWidth : number, textureHeight : number, inputTextures : WebGLTexture[])  : Framebuffer{
        const edgeBlurFbo : Framebuffer = pool.getWrite(textureWidth, textureHeight, inputTextures, this.edgeBlur.outputTextureCount);
        
        this.shaderPass.writeShader({
            program : this.edgeBlur.program,
            inputTextures,
            textureWidth, textureHeight, 
            fboWrite : edgeBlurFbo, 
            setFragmentUniforms : this.edgeBlur.setUniforms.bind(this.edgeBlur)
        });

        return edgeBlurFbo;
    }

    private streamlineBlurPass(pool : FramebufferPool, textureWidth : number, textureHeight : number, inputTextures : WebGLTexture[]) : Framebuffer {
        const streamlineBlurFbo : Framebuffer = pool.getWrite(textureWidth, textureHeight, inputTextures, this.streamlineBlur.outputTextureCount); 
        this.shaderPass.writeShader({
            program : this.streamlineBlur.program,
            inputTextures,
            textureWidth, textureHeight, 
            fboWrite : streamlineBlurFbo, 
            setFragmentUniforms : this.streamlineBlur.setUniforms.bind(this.streamlineBlur)
        });

        return streamlineBlurFbo
    }

    private applyTanhThreshold (pool : FramebufferPool, textureWidth : number, textureHeight : number, inputTextures : WebGLTexture[]) : Framebuffer {
        const tanhThresholdFbo : Framebuffer = pool.getWrite(textureWidth, textureHeight, inputTextures, this.tanhThreshold.outputTextureCount); 
        this.shaderPass.writeShader({
            program : this.tanhThreshold.program,
            inputTextures, 
            textureWidth, textureHeight, 
            fboWrite : tanhThresholdFbo, 
            setFragmentUniforms : this.tanhThreshold.setUniforms.bind(this.tanhThreshold)
        });

        return tanhThresholdFbo;
    }

    private applySuperImpose (pool : FramebufferPool, textureWidth : number, textureHeight : number, inputTextures : WebGLTexture[]) : Framebuffer {
        const superImposeFbo : Framebuffer = pool.getWrite(textureWidth, textureHeight, inputTextures, this.tanhThreshold.outputTextureCount); 
        this.shaderPass.writeShader({
            program : this.superImpose.program,
            inputTextures, 
            textureWidth, textureHeight, 
            fboWrite : superImposeFbo, 
            setFragmentUniforms : this.superImpose.setUniforms.bind(this.superImpose)
        });

        return superImposeFbo;
    }


    public render(pool : FramebufferPool, textureWidth : number, textureHeight : number, inputTextures : WebGLTexture[]) : Framebuffer {
        const grayscaleFbo : Framebuffer = this.grayscalePass(pool, textureWidth, textureHeight, inputTextures);
        const grayscaleTexture : WebGLTexture[] = grayscaleFbo.getTextures();

        this.etf.setUniformValues(this.etfKernelSize, this.etfIteration);
        const etfFbo : Framebuffer = this.etf.render(pool, textureWidth, textureHeight, inputTextures);
        const etfTextures : WebGLTexture[] = etfFbo.getTextures();


        // Get the Edge Tangent Flow of the image
        
        let currentFbo = grayscaleFbo;
        let currentInputTextures : WebGLTexture[] = grayscaleTexture;
        for (let i = 0; i < this.iteration; i++) {
            // Apply two distinct edge blurs of varying sigma sizes
            this.edgeBlur.setUniformValues(this.sigmaC);
            const edgeBlur1InputTextures : WebGLTexture[] = [currentInputTextures[0], etfTextures[ETFSmoothOutputTextureIndex.xyVector]];
            const edgeBlur1Fbo = this.edgeBlurPass(pool, textureWidth, textureHeight, edgeBlur1InputTextures);
            const edgeBlur1Textures : WebGLTexture[] = edgeBlur1Fbo.getTextures();

            // 
            this.edgeBlur.setUniformValues(this.sigmaS);
            const edgeBlur2InputTextures : WebGLTexture[] = [currentInputTextures[0], etfTextures[ETFSmoothOutputTextureIndex.xyVector]];
            const edgeBlur2Fbo  = this.edgeBlurPass(pool, textureWidth, textureHeight, edgeBlur2InputTextures);
            const edgeBlur2Textures : WebGLTexture[] = edgeBlur2Fbo.getTextures();

            // Get the difference of gaussian of the two blurred textures
            this.subtractFDoG.setUniformValues(this.p);
            const subtractFDoGInputTextures : WebGLTexture[] = [edgeBlur1Textures[edgeBlurOutputTextureIndex.image], edgeBlur2Textures[edgeBlurOutputTextureIndex.image]];
            const subtractFDoGFbo : Framebuffer = this.subtractFDoGPass(pool, textureWidth, textureHeight, subtractFDoGInputTextures);
            const subtractFDoGTextures : WebGLTexture[] = subtractFDoGFbo.getTextures();

            // Edge Blur 1 and 2 fbos are not needed again for this iteration
            pool.release(edgeBlur1Fbo); 
            pool.release(edgeBlur2Fbo);
            
            // Apply a stream aligned blur on the difference of gaussian texture
            this.streamlineBlur.setUniformValues(this.sigmaM);
            const streamlineBlurFbo = this.streamlineBlurPass(pool, textureWidth, textureHeight, subtractFDoGTextures);
            const streamlineBlurTextures : WebGLTexture[] = streamlineBlurFbo.getTextures();  

            pool.release(subtractFDoGFbo) // subtractFDoGFbo is not needed again for this iteration

            // Apply a threshold to accentuate the edge lines
            this.tanhThreshold.setUniformValues(this.tau);
            const tanhThresholdFbo = this.applyTanhThreshold(pool, textureWidth, textureHeight, streamlineBlurTextures);
            const tanhThresholdTexture : WebGLTexture[] = tanhThresholdFbo.getTextures();

            pool.release(streamlineBlurFbo) // streamLineBlurFbo is not needed for this iteration
            
            if (i !== this.iteration - 1){
                const superImposeInputTexture : WebGLTexture[] = [inputTextures[0], tanhThresholdTexture[tanhThresholdOutputTextureIndex.threshold]];
                const superImposeFbo = this.applySuperImpose(pool, textureWidth, textureHeight, superImposeInputTexture);
                pool.release(tanhThresholdFbo) // tanhThresholdFbo is not needed again for this iteration
                pool.release(currentFbo); // The current fbo at the start of the iteration is not in use again
                currentFbo = superImposeFbo;
            } else {
                pool.release(currentFbo);
                currentFbo = tanhThresholdFbo;
            }

        }

        pool.release(etfFbo);



        return currentFbo;   
    }
}

export default CompositeShaderCoherentLineDrawing;