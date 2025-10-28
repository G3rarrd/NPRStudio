import WebGLCore from "../../../webGLCore";
import ShaderETFSmoothingPass, { ETFSmoothOutputTextureIndex } from "../nonCompositeTextures/shaderETFSmoothingPass";
import ShaderFlowField, { flowFieldOutputTextureIndex } from "../nonCompositeTextures/shaderFlowField";
import Framebuffer from "../../../framebuffer_textures/framebuffer";
import WebGLShaderPass from "../webGLShaderPass";
import FramebufferPool from "../../../framebuffer_textures/framebufferPool";
import ShaderGrayScale from "../nonCompositeTextures/shaderGrayscale";

export enum ETFOutputTextureIndex {
    flowField = ETFSmoothOutputTextureIndex.xyVector,
}

class CompositeShaderEdgeTangentFlow {
    private readonly wgl : WebGLCore;
    public readonly shaderPass : WebGLShaderPass;

    private readonly flowField : ShaderFlowField;
    private readonly grayscale : ShaderGrayScale;
    private readonly etfSmoothPass : ShaderETFSmoothingPass;
    
    private  etfKernelSize : number = 3;
    private etfIteration : number = 2;


    constructor (wgl: WebGLCore) {
        this.wgl = wgl;
        this.flowField = new ShaderFlowField(this.wgl);
        this.etfSmoothPass = new ShaderETFSmoothingPass(this.wgl);
        this.grayscale = new ShaderGrayScale(this.wgl);
        this.shaderPass = new WebGLShaderPass(this.wgl);
    }

    public setUniformValues (etfKernelSize : number, etfIteration : number) {
        this.etfKernelSize = etfKernelSize;
        this.etfIteration = etfIteration;
    }

    private computeFlowField (pool : FramebufferPool, textureWidth : number, textureHeight : number, inputTextures : WebGLTexture[] ) : Framebuffer {
        const flowFieldFbo : Framebuffer = pool.getWrite(textureWidth, textureHeight, inputTextures, this.flowField.outputTextureCount)
        this.shaderPass.writeShader({
            program : this.flowField.program,
            inputTextures,
            textureWidth, textureHeight,
            fboWrite : flowFieldFbo,
            setFragmentUniforms :  this.flowField.setUniforms.bind(this.flowField)
        });

        return flowFieldFbo;
    }

    private computeETFSmooth (pool : FramebufferPool, textureWidth : number, textureHeight : number, inputTextures : WebGLTexture[]) : Framebuffer {
        const etfSmoothFbo : Framebuffer = pool.getWrite(textureWidth, textureHeight, inputTextures, this.etfSmoothPass.outputTextureCount);
        this.shaderPass.writeShader({
            program : this.etfSmoothPass.program,
            inputTextures,
            textureWidth, textureHeight,
            fboWrite : etfSmoothFbo ,
            setFragmentUniforms :  this.etfSmoothPass.setUniforms.bind(this.etfSmoothPass)
        });

        return etfSmoothFbo;
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
    
    public render(
        pool : FramebufferPool,
        textureWidth : number, 
        textureHeight : number,
        inputTextures : WebGLTexture[]) : Framebuffer{

        
        // Grayscale the image
        const grayscaleFbo = this.grayscalePass(pool, textureWidth, textureHeight, inputTextures);
        const grayscaleTextures : WebGLTexture[] = grayscaleFbo.getTextures();

        // Compute the flow field
        const flowFieldFbo : Framebuffer = this.computeFlowField(pool, textureWidth,  textureHeight, grayscaleTextures);
        const flowFieldTextures : WebGLTexture[] = flowFieldFbo.getTextures();
        pool.release(grayscaleFbo);
        
        // Store the magnitude
        let etfSmoothPassInputTextures : WebGLTexture[] = flowFieldTextures;
        
        let currentFbo : Framebuffer = flowFieldFbo;
        for (let i = 0; i < this.etfIteration; i++) {
            this.etfSmoothPass.setUniformValues([0, 1], this.etfKernelSize);
            const etfVerticalSmoothFbo : Framebuffer = this.computeETFSmooth(pool, textureWidth, textureHeight, etfSmoothPassInputTextures);
            const etfVerticalTextures : WebGLTexture[] = etfVerticalSmoothFbo.getTextures();

            if (i > 0) pool.release(currentFbo);

            const etfHorizontalInputTextures : WebGLTexture[] = [flowFieldTextures[flowFieldOutputTextureIndex.MAGNITUDE], ...etfVerticalTextures];
            this.etfSmoothPass.setUniformValues([1, 0], this.etfKernelSize);
            currentFbo = this.computeETFSmooth(pool, textureWidth, textureHeight, etfHorizontalInputTextures);
            const etfHorizontalSmoothTextures : WebGLTexture[] = currentFbo.getTextures(); 
            
            pool.release(etfVerticalSmoothFbo);
            
            etfSmoothPassInputTextures = [flowFieldTextures[flowFieldOutputTextureIndex.MAGNITUDE], ...etfHorizontalSmoothTextures];
        }

        pool.release(flowFieldFbo);

        return currentFbo ;
    }
}

export default CompositeShaderEdgeTangentFlow;