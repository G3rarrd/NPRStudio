import WebGLCore from "../../../webGLCore";
import { Shader } from "../shader";
import PostProcessingVertexShader from "../../vertexShaders/postProcessingVertexShader";
import UniformLocationSettings from "./uniformSettings";

class ShaderDithering implements Shader {
    private readonly wgl : WebGLCore;
    public readonly postProcessing : PostProcessingVertexShader;
    public readonly program: WebGLProgram; 
    private readonly uniformLocationSettings : UniformLocationSettings;
    
    private bayerType : number = 1;
    private spreadValue : number = 0.3;

    // Bayer2
    private bayers : number[][]= [
    [
        0, 2, 
        3, 1
    ],
    // Bayer4
    [ 
        0, 8, 2, 10, 
        12, 4, 14, 6,
        3, 11, 1, 9,
        15, 7, 13, 5
    ],
    // Bayer8
    [ 
        0, 32,  8, 40,  2, 34, 10, 42,
        48, 16, 56, 24, 50, 18, 58, 26,
        12, 44,  4, 36, 14, 46,  6, 38,
        60, 28, 52, 20, 62, 30, 54, 22,
        3, 35, 11, 43,  1, 33,  9, 41,
        51, 19, 59, 27, 49, 17, 57, 25,
        15, 47,  7, 39, 13, 45,  5, 37,
        63, 31, 55, 23, 61, 29, 53, 21
    ],

    // bayer8Luminance
    [
        16, 11, 10, 16, 24, 40, 51, 61,
        12, 12, 14, 19, 26, 58, 60, 55,
        14, 13, 16, 24, 40, 57, 69, 56,
        14, 17, 22, 29, 51, 87, 80, 62,
        18, 22, 37, 56, 68,109,103, 77,
        24, 35, 55, 64, 81,104,113, 92,
        49, 64, 78, 87,103,121,120,101,
        72, 92, 95, 98,112,100,103, 99
    ]
    ];

    constructor (wgl: WebGLCore) {
        this.wgl = wgl;
        this.postProcessing = new PostProcessingVertexShader();
        this.program = this.wgl.compileAndLinkProgram(this.postProcessing.shader, ShaderDithering.fragmentShader, "Dithering Shader");
        this.uniformLocationSettings = new UniformLocationSettings(this.wgl, this.program);
    }

    public setUniformValues (bayerType : number, spreadValue : number ) : void {
        this.bayerType  = bayerType;
        this.spreadValue = spreadValue;
    }

    public setUniforms () : void {
        const gl : WebGL2RenderingContext= this.wgl.gl;
        const uls : UniformLocationSettings = this.uniformLocationSettings;
        const TEX_NUM : number = 0;

        const U_IMAGE : string= 'u_image';
        const U_BAYER : string = 'u_bayer';
        const U_BAYER_SIZE : string = 'u_bayer_size';
        const U_SPREAD_VALUE : string = 'u_spread_value'

        const imageLocation = uls.fetchUniformLocation(U_IMAGE);
        const bayerLocation = uls.fetchUniformLocation( U_BAYER);

        const bayerSizeLocation = uls.fetchUniformLocation( U_BAYER_SIZE);
        const spreadLocation = uls.fetchUniformLocation(U_SPREAD_VALUE);

        const bayer : number[] = this.bayers[this.bayerType - 1];

        if (! imageLocation) throw new Error(uls.setUniformLocationError(U_IMAGE));
        if (! bayerLocation) throw new Error(uls.setUniformLocationError(U_BAYER));
        if (! bayerSizeLocation) throw new Error(uls.setUniformLocationError(U_BAYER_SIZE));
        if (! spreadLocation) throw new Error(uls.setUniformLocationError(U_SPREAD_VALUE));
        
        gl.uniform1i(imageLocation, TEX_NUM);
        gl.uniform1iv(bayerLocation, bayer);
        gl.uniform1i(bayerSizeLocation, Math.sqrt(bayer.length));
        gl.uniform1f(spreadLocation, this.spreadValue);
    };


    private static readonly fragmentShader =
    `#version 300 es
    precision mediump float;

    uniform sampler2D u_image;

    uniform int u_bayer[256];
    uniform int u_bayer_size;

    uniform float u_spread_value;

    in vec2 v_texCoord;

    layout(location = 0) out vec4 outColor0;

    void main() {
        ivec2 texDimensions = textureSize(u_image, 0);
        vec4 color = texture(u_image, v_texCoord);
        vec3 newColor = vec3(0.0);

        float width = float(texDimensions.x);
        float height = float(texDimensions.y);

        int x = int(v_texCoord.x * width);
        int y = int(v_texCoord.y * height);
        
        x %= u_bayer_size;
        y %= u_bayer_size;

        float M = float(u_bayer[y * u_bayer_size + x]);

        float mSize = float(u_bayer_size*u_bayer_size);
        float noise = ((M * (1.0 / mSize)) - 0.5) * u_spread_value;

        vec3 ditheredColor = color.rgb + vec3(noise);

        newColor = color.rgb + vec3(noise);

        outColor0 = vec4(newColor, color.a);
    }`;
}


export default ShaderDithering;
