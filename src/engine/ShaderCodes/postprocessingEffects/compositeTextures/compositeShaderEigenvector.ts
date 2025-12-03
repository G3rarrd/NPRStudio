import WebGLCore from "../../../webGLCore";
import CompositeShaderGaussianBlur from './compositeShaderGaussianBlur';
import Framebuffer from "../../../framebuffer_textures/framebuffer";
import ShaderStructuredTensor from "../nonCompositeTextures/shaderStructuredTensor";
import ShaderEigenvector from "../nonCompositeTextures/shaderEigenvector";
import WebGLShaderPass from "../webGLShaderPass";
import FramebufferPool from "../../../framebuffer_textures/framebufferPool";


class CompositeShaderETFEigenvector{
    private readonly wgl : WebGLCore;
    public readonly gBlur : CompositeShaderGaussianBlur;
    public readonly structuredTensor : ShaderStructuredTensor;
    public readonly etfEigenvector : ShaderEigenvector;
    public shaderPass : WebGLShaderPass;
    public sigmaC : number = 1.6;
    public outputTextureCount : number = 3;
    
    constructor (wgl:WebGLCore) {
        this.wgl = wgl;
        this.structuredTensor = new ShaderStructuredTensor(this.wgl);
        this.gBlur = new CompositeShaderGaussianBlur(this.wgl);
        this.etfEigenvector = new ShaderEigenvector(this.wgl);
        this.shaderPass = new WebGLShaderPass(this.wgl);
    }

    public setUniformValues (sigmaC : number) {
        this.sigmaC = sigmaC;
    }
    

    public render(
        pool : FramebufferPool,
        textureWidth : number, 
        textureHeight : number,
        inputTextures : WebGLTexture[]
    ) : Framebuffer {
        // Pass 1: Structured Tensor texture pass
        let structuredTensorFbo : Framebuffer = pool.getRead(textureWidth, textureHeight, this.structuredTensor.outputTextureCount);
        let fboWrite : Framebuffer = pool.getWrite(textureWidth, textureHeight, inputTextures, this.structuredTensor.outputTextureCount);

        this.shaderPass.writeShader({program : this.structuredTensor.program, inputTextures, 
            textureWidth, textureHeight, 
            fboWrite, setFragmentUniforms : this.structuredTensor.setUniforms.bind(this.structuredTensor)
        });

        [fboWrite, structuredTensorFbo] = [structuredTensorFbo, fboWrite];
        pool.release(fboWrite);

        // Pass 2: Gaussian Blur texture Pass
        const structuredTensorTextures : WebGLTexture[] = structuredTensorFbo.getTextures();
        this.gBlur.setUniformValues(this.sigmaC);
        let gaussianBlurFbo : Framebuffer = this.gBlur.render(pool, textureWidth, textureHeight, structuredTensorTextures);
        pool.release(structuredTensorFbo);

        // Final Pass: Eigenvector texture pass
        const gaussianBlurTextures : WebGLTexture[] = gaussianBlurFbo.getTextures();
        let eigenvectorFbo : Framebuffer = pool.getRead(textureWidth, textureHeight, this.etfEigenvector.outputTextureCount);
        fboWrite = pool.getWrite(textureWidth, textureHeight, gaussianBlurTextures, this.etfEigenvector.outputTextureCount);

        this.shaderPass.writeShader({
            program : this.etfEigenvector.program, 
            inputTextures : gaussianBlurTextures, 
            textureWidth, textureHeight, 
            fboWrite, setFragmentUniforms : this.etfEigenvector.setUniforms.bind(this.etfEigenvector)
        });

        [fboWrite, eigenvectorFbo] = [eigenvectorFbo, fboWrite];
        pool.release(fboWrite);
        pool.release(gaussianBlurFbo);

        this.outputTextureCount = eigenvectorFbo.getTextureCount();

        return eigenvectorFbo;
    }
}

export default CompositeShaderETFEigenvector;