import WebGLCore from "../../../webGLCore";
import Framebuffer from "../../../framebuffer_textures/framebuffer";
import FramebufferPool from '../../../framebuffer_textures/framebufferPool';
import ShaderGrayScale from "../nonCompositeTextures/shaderGrayscale";

import CompositeShaderETFEigenvector from "./compositeShaderEigenvector";
import WebGLShaderPass from "../webGLShaderPass";
import shaderAnisotropicKuwaharaPass from "../nonCompositeTextures/shaderAnisotropicKuwaharaPass";

class CompositeShaderAnisotropicKuwahara{
    private readonly wgl : WebGLCore;
    private readonly shaderPass : WebGLShaderPass;
    
    // Shaders (Composite and Non-Composite)
    public grayscale : ShaderGrayScale;
    public eigenvector : CompositeShaderETFEigenvector;
    public anisotropicKuwahara : shaderAnisotropicKuwaharaPass;

    // Uniform Values
    private sigma : number = 1.6;
    private alpha : number = 1;
    private zeroCrossing : number = 240; // degrees
    private sharpness : number = 18;
    private zeta : number = 2;
    private radius : number = 4;
    private hardness : number = 100;
    
    constructor (wgl:WebGLCore) {
        this.wgl = wgl;
        this.shaderPass = new WebGLShaderPass(this.wgl);
        
        this.grayscale = new ShaderGrayScale(this.wgl);
        this.eigenvector = new CompositeShaderETFEigenvector(this.wgl);
        this.anisotropicKuwahara = new shaderAnisotropicKuwaharaPass(this.wgl);
    }

    public setUniformValues (
        radius : number,
        hardness : number,
        sharpness : number,
        zeta : number,
        zeroCrossing : number,
        alpha : number,
        sigma : number,
    ) {
        this.radius = radius;
        this.hardness = hardness;
        this.sharpness = sharpness;
        this.zeta = zeta;
        this.zeroCrossing = zeroCrossing * (Math.PI / 8.0);
        this.alpha = alpha;
        this.sigma = sigma;
    }

    public render(
        pool : FramebufferPool,
        textureWidth : number, 
        textureHeight : number,
        inputTextures : WebGLTexture[]
    ) : Framebuffer {

        // Pass 1: Grayscale;
        let fboWrite : Framebuffer = pool.getWrite(textureWidth, textureHeight, inputTextures, this.grayscale.outputTextureCount);
        let grayscaleFbo : Framebuffer = pool.getRead(textureWidth, textureHeight, this.grayscale.outputTextureCount);

        this.shaderPass.writeShader({
            program : this.grayscale.program,inputTextures, 
            textureWidth, textureHeight, 
            fboWrite, setFragmentUniforms : this.grayscale.setUniforms.bind(this.grayscale)
        });

        [fboWrite, grayscaleFbo] = [grayscaleFbo, fboWrite];
        pool.release(fboWrite);

        // Pass 2: Compute Edge Tangent Flow; 
        const grayscaleTextures : WebGLTexture[] =  grayscaleFbo.getTextures();
        this.eigenvector.setUniformValues(this.sigma);
        const eigenvectorFbo : Framebuffer = this.eigenvector.render(pool, textureWidth, textureHeight, grayscaleTextures);
        pool.release(grayscaleFbo);

        // Final Pass: Anisotropic Kuwahara filtering
        const etfTextures : WebGLTexture[] = eigenvectorFbo.getTextures();
        const anisotropicInputTextures : WebGLTexture[] = [...inputTextures, ...etfTextures] // main image + edge tangent flow.
        this.anisotropicKuwahara.setUniformValues(this.radius, this.hardness, this.sharpness, this.zeta, this.zeroCrossing, this.alpha);
        fboWrite  = pool.getWrite(textureWidth, textureHeight, anisotropicInputTextures, this.anisotropicKuwahara.outputTextureCount);
        let anisotropicFbo : Framebuffer = pool.getRead(textureWidth, textureHeight, this.anisotropicKuwahara.outputTextureCount);

        this.shaderPass.writeShader({
            program : this.anisotropicKuwahara.program,
            inputTextures : anisotropicInputTextures, 
            textureWidth, textureHeight, 
            fboWrite, setFragmentUniforms : this.anisotropicKuwahara.setUniforms.bind(this.anisotropicKuwahara)
        });

        [fboWrite, anisotropicFbo] = [anisotropicFbo, fboWrite];
        pool.release(fboWrite);
        pool.release(eigenvectorFbo);

        return anisotropicFbo;
    }
}

export default CompositeShaderAnisotropicKuwahara;