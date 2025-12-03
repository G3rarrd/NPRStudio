import WebGLCore from "../../../webGLCore";
import ShaderEdgeBlurPass from "../nonCompositeTextures/shaderEdgeBlur";
import ShaderStreamlineBlur from "../nonCompositeTextures/shaderStreamlineBlur";
import ShaderXDoGSubtract from "../nonCompositeTextures/shaderXDoGSubtract";
import Framebuffer from "../../../framebuffer_textures/framebuffer";
import CompositeShaderETFEigenvector from "./compositeShaderEigenvector";
import WebGLShaderPass from "../webGLShaderPass";
import FramebufferPool from "../../../framebuffer_textures/framebufferPool";
import ShaderLabColorSpace from "../nonCompositeTextures/shaderLabColorSpace";
import ShaderXDoGThreshold from "../nonCompositeTextures/shaderXDoGThreshold";
import { eigenvectorOutputTextureIndex } from "../nonCompositeTextures/shaderEigenvector";

class CompositeShaderXDoG {
    private readonly wgl : WebGLCore;
    public readonly shaderPass : WebGLShaderPass;
    
    private readonly etfEigenvector : CompositeShaderETFEigenvector;
    private readonly edgeBlur : ShaderEdgeBlurPass;
    private readonly xDoGSubtract : ShaderXDoGSubtract;
    private readonly streamlineBlur : ShaderStreamlineBlur;
    private readonly xDoGThreshold : ShaderXDoGThreshold;
    private readonly lab : ShaderLabColorSpace;
    private readonly k : number = 1.6; // Scalar for the second edge blur (sigma E * k )
    
    private sigmaE : number = 1.0;
    private sigmaC : number = 1.6
    private sigmaM : number = 1.0;
    private sigmaA : number = 1.0;
    private phi : number = 1.0;
    private epsilon : number = 0.9;
    private tau : number = 1.0;

    constructor (wgl : WebGLCore) {
        this.wgl = wgl;
        this.shaderPass = new WebGLShaderPass(this.wgl);
        this.etfEigenvector = new CompositeShaderETFEigenvector(this.wgl);
        this.edgeBlur = new ShaderEdgeBlurPass(this.wgl);
        this.xDoGSubtract = new ShaderXDoGSubtract(this.wgl);
        this.streamlineBlur = new ShaderStreamlineBlur(this.wgl);
        this.xDoGThreshold = new ShaderXDoGThreshold(this.wgl);
        this.lab = new ShaderLabColorSpace(this.wgl);
    }

    public setUniformValues(
        sigmaC : number, sigmaE : number, sigmaM : number, sigmaA : number,
        tau : number, phi : number, epsilon : number)
    {
        this.sigmaE = sigmaE;
        this.sigmaC = sigmaC; // Structured Tensor blur
        this.sigmaM = sigmaM;
        this.sigmaA = sigmaA;
        this.tau = tau;
        this.phi = phi;
        this.epsilon = epsilon;
    }   

    private labColorSpace(pool : FramebufferPool, textureWidth : number, textureHeight : number, inputTextures : WebGLTexture[] )  : Framebuffer{
        const labFbo : Framebuffer = pool.getWrite(textureWidth, textureHeight, inputTextures, this.lab.outputTextureCount);
        this.shaderPass.writeShader({
            program : this.lab.program,
            inputTextures, 
            textureWidth, textureHeight, 
            fboWrite : labFbo, 
            setFragmentUniforms : this.lab.setUniforms.bind(this.lab)
        });
        return labFbo;
    }

    private computeETF(pool : FramebufferPool, textureWidth : number, textureHeight : number, inputTextures : WebGLTexture[] ) : Framebuffer{
        this.etfEigenvector.setUniformValues(this.sigmaC);
        const etfEigenvectorFbo : Framebuffer = this.etfEigenvector.render(pool, textureWidth, textureHeight, inputTextures);
        // const xyMapTextures : WebGLTexture[] = etfEigenvectorFbo.getTextures().slice(1);
        return etfEigenvectorFbo;
    }

    /**
    * Applies a dual 1D edge blur of varying sigmas.
    * @returns [edgeBlur1Fbo, edgeBlur2Fbo]
    */
    private dualEdgeBlurPass(pool : FramebufferPool, textureWidth : number, textureHeight : number, inputTextures : WebGLTexture[])  : Framebuffer[]{
        const edgeBlur1Fbo : Framebuffer = pool.getWrite(textureWidth, textureHeight, inputTextures, this.edgeBlur.outputTextureCount);
        this.edgeBlur.setUniformValues(this.sigmaE);
        this.shaderPass.writeShader({
            program : this.edgeBlur.program,
            inputTextures,
            textureWidth, textureHeight, 
            fboWrite : edgeBlur1Fbo, 
            setFragmentUniforms : this.edgeBlur.setUniforms.bind(this.edgeBlur)
        });

        const edgeBlur2Fbo : Framebuffer = pool.getWrite(textureWidth, textureHeight, inputTextures, this.edgeBlur.outputTextureCount);
        this.edgeBlur.setUniformValues(this.sigmaE * this.k) ;
        this.shaderPass.writeShader({
            program : this.edgeBlur.program,
            inputTextures,
            textureWidth, textureHeight, 
            fboWrite : edgeBlur2Fbo, 
            setFragmentUniforms : this.edgeBlur.setUniforms.bind(this.edgeBlur)
        });

        return [edgeBlur1Fbo, edgeBlur2Fbo];
    }

    private applyXDoGSubtract (pool : FramebufferPool, textureWidth : number, textureHeight : number, inputTextures : WebGLTexture[]) : Framebuffer {
        const xDoGSubtractFbo : Framebuffer = pool.getWrite(textureWidth, textureHeight, inputTextures, this.xDoGSubtract.outputTextureCount); 
        this.xDoGSubtract.setUniformValues(this.tau);
        this.shaderPass.writeShader({
            program : this.xDoGSubtract.program,
            inputTextures, 
            textureWidth, textureHeight, 
            fboWrite : xDoGSubtractFbo, 
            setFragmentUniforms : this.xDoGSubtract.setUniforms.bind(this.xDoGSubtract)
        });

        return xDoGSubtractFbo;
    }
    
    private streamlineBlurPass1(pool : FramebufferPool, textureWidth : number, textureHeight : number, inputTextures : WebGLTexture[]) : Framebuffer {
        const streamlineBlur1Fbo : Framebuffer = pool.getWrite(textureWidth, textureHeight, inputTextures, this.streamlineBlur.outputTextureCount); 
        this.streamlineBlur.setUniformValues(this.sigmaM);
        this.shaderPass.writeShader({
            program : this.streamlineBlur.program,
            inputTextures,
            textureWidth, textureHeight, 
            fboWrite : streamlineBlur1Fbo, 
            setFragmentUniforms : this.streamlineBlur.setUniforms.bind(this.streamlineBlur)
        });

        return streamlineBlur1Fbo
    }

    private applyXDoGThreshold (pool : FramebufferPool, textureWidth : number, textureHeight : number, inputTextures : WebGLTexture[]) : Framebuffer {
        const xDoGThresholdFbo : Framebuffer = pool.getWrite(textureWidth, textureHeight, inputTextures, this.xDoGSubtract.outputTextureCount); 
        this.xDoGThreshold.setUniformValues(this.epsilon, this.phi);
        this.shaderPass.writeShader({
            program : this.xDoGThreshold.program,
            inputTextures, 
            textureWidth, textureHeight, 
            fboWrite : xDoGThresholdFbo, 
            setFragmentUniforms : this.xDoGThreshold.setUniforms.bind(this.xDoGThreshold)
        });

        return xDoGThresholdFbo;
    }

    private antialiasingPass(pool : FramebufferPool, textureWidth : number, textureHeight : number, inputTextures : WebGLTexture[]) : Framebuffer {
        const streamlineBlur2Fbo : Framebuffer = pool.getWrite(textureWidth, textureHeight, inputTextures, this.streamlineBlur.outputTextureCount); 
        this.streamlineBlur.setUniformValues(this.sigmaA);
        this.shaderPass.writeShader({
            program : this.streamlineBlur.program,
            inputTextures, 
            textureWidth, textureHeight, 
            fboWrite : streamlineBlur2Fbo, 
            setFragmentUniforms : this.streamlineBlur.setUniforms.bind(this.streamlineBlur)
        });
        return streamlineBlur2Fbo;
    }

    public render(
        pool : FramebufferPool,
        textureWidth : number, 
        textureHeight : number,
        inputTextures : WebGLTexture[]
    ) : Framebuffer{
        // Pass 1: Grayscale;
        const labFbo : Framebuffer =  this.labColorSpace(pool, textureWidth, textureHeight, inputTextures);
        const labTextures : WebGLTexture[] = labFbo.getTextures();
        
        // Pass 2: Compute Edge Tangent Flow;
        const etfEigenvectorFbo : Framebuffer = this.computeETF(pool, textureWidth, textureHeight, labTextures);
        const xyMapTexture : WebGLTexture = etfEigenvectorFbo.getTextures()[eigenvectorOutputTextureIndex.xyFlowMap];
        
        // Pass 3: Apply 2 Edge Aligned blurs of different sigmas
        const edgeBlurInputTextures : WebGLTexture[] =  [...labTextures, xyMapTexture];
        const dualEdgeBlurFbos : Framebuffer[] = this.dualEdgeBlurPass(pool, textureWidth, textureHeight, edgeBlurInputTextures);
        const edgeBlurTextures : WebGLTexture[] = [...dualEdgeBlurFbos[0].getTextures(), ...dualEdgeBlurFbos[1].getTextures()];
        pool.release(labFbo);

        // Pass 4: Find the differnce of both blurs
        const xDoGSubtractFbo : Framebuffer = this.applyXDoGSubtract(pool, textureWidth, textureHeight, edgeBlurTextures);
        const xDoGSubtractTextures : WebGLTexture[] = xDoGSubtractFbo.getTextures();
        pool.release(dualEdgeBlurFbos[0]);
        pool.release(dualEdgeBlurFbos[1]);

        // Pass 5: Implement a streamline blur across the threshold
        const streamlineBlur1InputTextures : WebGLTexture[] = [...xDoGSubtractTextures, xyMapTexture];
        const streamlineBlurFbo : Framebuffer = this.streamlineBlurPass1(pool, textureWidth, textureHeight, streamlineBlur1InputTextures);
        const streamlineBlurOutputTextures : WebGLTexture[] = streamlineBlurFbo.getTextures();
        pool.release(xDoGSubtractFbo);

        const xDoGthresholdFbo : Framebuffer = this.applyXDoGThreshold(pool, textureWidth, textureHeight, streamlineBlurOutputTextures);
        const xDoGThresholdTextures : WebGLTexture[] = xDoGthresholdFbo.getTextures();
        pool.release(streamlineBlurFbo);

        const antialiasingInputTextures : WebGLTexture[] = [...xDoGThresholdTextures, xyMapTexture];
        const antialiasingFbo : Framebuffer = this.antialiasingPass(pool, textureWidth, textureHeight, antialiasingInputTextures)
        
        pool.release(xDoGthresholdFbo);
        pool.release(etfEigenvectorFbo);

        return antialiasingFbo ;
    }
}

export default CompositeShaderXDoG;