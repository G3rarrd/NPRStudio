import Texture from "./texture";

class Framebuffer {
    private gl: WebGL2RenderingContext;
    public framebuffer: WebGLFramebuffer | null;
    public tex : Texture;
    public width : number;
    public height : number;
    public textures: WebGLTexture[] = [];

    constructor(
        gl :WebGL2RenderingContext, 
        width : number, 
        height : number,
        textureCount : number,
    ) {
        this.gl = gl;
        this.width = width;
        this.height = height;

        // Setting up the texture for the frame buffer
        this.tex = new Texture(gl);
        this.framebuffer = this.gl.createFramebuffer();

        if (! this.framebuffer) throw new Error("Failed to create framebuffer");

        this.bind();

        // Attach the textures to the frame buffer
        for (let i = 0; i < textureCount; i++) {
            const tex  = this.tex.createFramebufferTexture(width, height);
            this.textures.push(tex);
            
            this.gl.framebufferTexture2D(
                this.gl.FRAMEBUFFER,
                this.gl.COLOR_ATTACHMENT0 + i,
                this.gl.TEXTURE_2D,
                tex,
                0
            );
        }

        this.gl.drawBuffers(this.textures.map((_, i) => this.gl.COLOR_ATTACHMENT0 + i));

        // Check if the frame buffer is valid
        const status = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
        if (status !== this.gl.FRAMEBUFFER_COMPLETE) {
            throw new Error("Framebuffer is not complete: " + status.toString());
        }

        this.unbind();
    }


    public bind() {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
        this.gl.viewport(0, 0, this.width, this.height);
    }

    public getTextures() : WebGLTexture[] {
        return this.textures;
    }

    public getTextureCount() : number {
        return this.textures.length;
    }

    public unbind() {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    }

    public delete() {
        if (this.framebuffer) {
            this.gl.deleteFramebuffer(this.framebuffer);
            this.framebuffer = null;
        }

        this.textures.forEach(tex => this.gl.deleteTexture(tex));
        this.textures = [];
    }
}

export default Framebuffer;