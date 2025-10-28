import WebGLCore from "../../../webGLCore";
import WebGLShaderPass from "../webGLShaderPass";
import Framebuffer from "../../../framebuffer_textures/framebuffer";
import FramebufferPool from '../../../framebuffer_textures/framebufferPool';
import ShaderGaussianBlurPass from "../nonCompositeTextures/shaderGaussianBlurPass";

class CompositeShaderGaussianBlur {
    private readonly wgl : WebGLCore;
    private readonly shaderPass : WebGLShaderPass;
    public gBlurX :  ShaderGaussianBlurPass;
    public gBlurY :  ShaderGaussianBlurPass;
    public outputTextureCount: number;
    public uniformValues: Map<string, number> = new Map<string, number>([]);

    public radius : number = 1.6; 
    constructor (wgl:WebGLCore) {
        this.wgl = wgl;
        
        // Pass 1
        this.gBlurX = new ShaderGaussianBlurPass(wgl);
        this.gBlurX.direction = [1, 0];

        // Final Pass
        this.gBlurY = new ShaderGaussianBlurPass(wgl);
        this.gBlurY.direction = [0, 1];

        this.outputTextureCount = this.gBlurY.outputTextureCount;

        this.shaderPass = new WebGLShaderPass(wgl);
    }

    public setUniformValues (radius : number) {
        this.radius = radius;
    }


    public render(
        pool : FramebufferPool,
        textureWidth : number, 
        textureHeight : number,
        inputTextures : WebGLTexture[]
    ) : Framebuffer {

        // Pass 1: Horizontal Blur
        this.gBlurX.setUniformValues(this.radius, [1, 0]);
        let fboWrite = pool.getWrite(textureWidth, textureHeight, inputTextures, this.gBlurX.outputTextureCount);
        let blurXFbo = pool.getRead(textureWidth, textureHeight, this.gBlurX.outputTextureCount);

        this.shaderPass.writeShader({
            program : this.gBlurX.program,inputTextures, 
            textureWidth, textureHeight, 
            fboWrite, setFragmentUniforms : this.gBlurX.setUniforms.bind(this.gBlurX)
        });

        [fboWrite, blurXFbo] = [blurXFbo, fboWrite];
        pool.release(fboWrite);

        // Pass 2: Vertical Blur; 
        const blurXTextures : WebGLTexture[] =  blurXFbo.getTextures();
        this.gBlurY.setUniformValues(this.radius, [0, 1]);
        fboWrite = pool.getWrite(textureWidth, textureHeight, blurXTextures , this.gBlurY.outputTextureCount);
        let blurYFbo = pool.getRead(textureWidth, textureHeight, this.gBlurY.outputTextureCount);

        this.shaderPass.writeShader({
            program : this.gBlurY.program, 
            inputTextures : blurXTextures, 
            textureWidth, textureHeight, 
            fboWrite, setFragmentUniforms : this.gBlurY.setUniforms.bind(this.gBlurY)
        });

        [fboWrite, blurYFbo] = [blurYFbo, fboWrite];
        pool.release(fboWrite);
        pool.release(blurXFbo);

        return blurYFbo;
    }
}

export default CompositeShaderGaussianBlur;