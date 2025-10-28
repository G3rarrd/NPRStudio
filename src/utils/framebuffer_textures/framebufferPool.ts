import Framebuffer from './framebuffer';
class FramebufferPool {
    public pool: Framebuffer[] = [];
    private gl : WebGL2RenderingContext;
    public inUse : Set<Framebuffer> = new Set();

    constructor (gl : WebGL2RenderingContext) {
        this.gl = gl;
    };

    public getRead(width : number, height : number, readTextureCount : number) : Framebuffer{
        for (const fbo of this.pool) {
            const fboInUse : boolean = this.inUse.has(fbo);
            
            const sizeMatch : boolean = fbo.width === width && fbo.height  === height;
            
            const textureCountMatch : boolean = fbo.textures.length === readTextureCount;
            
            if (!fboInUse && sizeMatch && textureCountMatch) {
                this.inUse.add(fbo);
                return fbo;
            }
        }

        // Add a new Framebuffer if all the framebuffers in the pool are in use
        const newFbo = new Framebuffer(this.gl, width, height, readTextureCount);
        this.pool.push(newFbo);
        this.inUse.add(newFbo);
        return newFbo;
    }

    public getWrite(width : number, height : number, inputTextures : WebGLTexture[], writeTextureCount : number) : Framebuffer {
        for (const fbo of this.pool) {
            
            const notInUse : boolean = ! this.inUse.has(fbo);
            
            const sizeMatch : boolean = fbo.width === width && fbo.height === height;
            
            const textureCountMatch : boolean = fbo.textures.length === writeTextureCount;

            const textures : WebGLTexture[] = fbo.getTextures();

            const notUsedAsInput : boolean = textures.every(tex => !inputTextures.includes(tex)); // checking if none of the textures are includeed in the inputTextures

            if(notInUse && sizeMatch && textureCountMatch && notUsedAsInput) {
                this.inUse.add(fbo);
                return fbo;
            }
        }

        const newFbo = new Framebuffer(this.gl, width, height, writeTextureCount);
        this.pool.push(newFbo);
        this.inUse.add(newFbo);
        return newFbo;
    }

    public release(fbo : Framebuffer): void {
        if (!this.inUse.has(fbo)) {
            console.warn("Trying to release framebuffer that is not currently in use!");
            return;
        }
        this.inUse.delete(fbo); // framebuffer is no longer needed
    }

    public clear () : void{
        // use when a new image has been loaded
        this.inUse.clear();
        this.pool.forEach(fbo => fbo.delete()); // call gl.deleteFramebuffer etc.
        this.pool = [];
    }
}

export default FramebufferPool;