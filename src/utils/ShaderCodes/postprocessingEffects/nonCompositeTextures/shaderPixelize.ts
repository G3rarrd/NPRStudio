import WebGLCore from "../../../webGLCore";
import { Shader } from "../shader";
import PostProcessingVertexShader from "../../vertexShaders/postProcessingVertexShader";
import UniformLocationSettings from "./uniformSettings";

class ShaderPixelize implements Shader {
    private readonly wgl : WebGLCore;
    public readonly program: WebGLProgram; 
    public readonly postProcessing : PostProcessingVertexShader;
    private readonly uniformLocationSettings : UniformLocationSettings;

    private blockSize : number = 5;

    constructor (wgl : WebGLCore) {
        this.wgl = wgl;
        this.postProcessing = new PostProcessingVertexShader();
        this.program = this.wgl.compileAndLinkProgram(this.postProcessing.shader, ShaderPixelize.fragmentShader, "Pixelize Shader");
        this.uniformLocationSettings = new UniformLocationSettings(this.wgl, this.program);
    }

    public setUniformValues (blockSize : number) : void {
        this.blockSize = blockSize;
    }

    public setUniforms () : void {
        const gl: WebGL2RenderingContext = this.wgl.gl;
        const uls : UniformLocationSettings = this.uniformLocationSettings;
        
        const U_IMAGE : string = 'u_image';
        const U_BLOCK_SIZE : string = 'u_block_size';

        const imageLocation : WebGLUniformLocation | null = uls.fetchUniformLocation(U_IMAGE);
        const blockSizeLocation: WebGLUniformLocation | null = uls.fetchUniformLocation(U_BLOCK_SIZE);

        if (imageLocation === undefined) throw new Error(uls.setUniformLocationError(U_IMAGE));
        if (blockSizeLocation === undefined) throw new Error(uls.setUniformLocationError(U_BLOCK_SIZE));
        
        /* Set the Uniforms */ 
        gl.uniform1i(imageLocation, 0);
        gl.uniform1i(blockSizeLocation, this.blockSize);
    };


    private static readonly fragmentShader: string = 
        `#version 300 es
        precision mediump float;

        uniform sampler2D u_image;
        uniform int u_block_size;

        in vec2 v_texCoord;
        layout(location = 0) out vec4 outColor0;

        void main() {
            vec2 pixelSize = vec2(textureSize(u_image, 0));
            vec2 texelSize = 1.0 / pixelSize;
            vec2 pixelPos = pixelSize * v_texCoord;

            float blockSize = float(u_block_size);
            
            vec2 blockUV = floor(pixelPos / blockSize) * blockSize + (blockSize * 0.5);

            blockUV /= pixelSize;

            outColor0 = texture(u_image, blockUV);
        }`;
    }


export default ShaderPixelize;
