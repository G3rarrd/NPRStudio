import Framebuffer from "../../../framebuffer_textures/framebuffer";
import FramebufferPool from "../../../framebuffer_textures/framebufferPool";
import WebGLCore from "../../../webGLCore";
import CompositeShaderAnisotropicKuwahara from "../compositeTextures/compositeShaderAnisotropicKuwahara";
import DependencyResolver from "./dependencyResolver";
import { ShaderNode } from "./shaderNode";
import SliderBuilder, { Slider } from "./sliderBuilder";
import { InputSocket, OutputSocket } from "./socket";
import { SocketType } from "./socketTypeMap";

const SLIDER_CONFIG = [
    {label : "radius", min: 4, max: 30, step: 2, value: 6 },
    {label : "hardness", min: 1, max: 100, step: 1, value: 50 },
    {label : "sharpness", min: 1, max: 21, step: 1, value: 10 },
    {label : "zeta", min: 1, max: 3, step: 0.1, value: 1 },
    {label : "angle", min: 180, max: 360, step: 0.1, value: 240 },
    {label : "alpha", min: 0.01, max: 2, step: 0.01, value: 1 },
    {label : "sigma", min: 0.01, max: 60, step: 0.01, value: 1.6 }
]

export class NodeAnisotropicKuwahara implements ShaderNode {
    public readonly  filter : CompositeShaderAnisotropicKuwahara;
    public inputSockets: InputSocket<SocketType>[];
    public outputSockets: OutputSocket<SocketType>[];
    public id : number;
    public framebuffer : Framebuffer | null;
    public pool : FramebufferPool; 
    public dependencyResolver : DependencyResolver;
    public textures : WebGLTexture[] = [];

    private sliderConfig = SLIDER_CONFIG;
    public sliderMap: Record<string, Slider> = {} as Record<string, Slider>;;

    constructor (id : number, pool : FramebufferPool, wgl : WebGLCore) {
        this.id = id;
        this.pool = pool;
        this.filter = new CompositeShaderAnisotropicKuwahara(wgl);
        
        this.dependencyResolver = new DependencyResolver();
        this.inputSockets = [
            new InputSocket("input", SocketType.IMAGE, this.id)
        ];
        
        this.outputSockets = [
            new OutputSocket("output", SocketType.IMAGE, this.id)
        ];
        
        this.framebuffer = null;
        this.buildSliders();
    }

    public isNodeNeeded() : boolean {
        return this.dependencyResolver.isResolved();
    }

   public buildSliders () : void {
        for (const {label, min, max, step, value} of this.sliderConfig) {
            const slider = new SliderBuilder(label)
                .min(min).max(max).step(step).value(value).build();
            this.sliderMap[label] = slider;
        }

        this.updateUniformValues();
   }

   public updateUniformValues () : void {
        const radius : number = this.sliderMap["radius"].value;
        const hardness : number = this.sliderMap["hardness"].value;
        const sharpness : number = this.sliderMap["sharpness"].value;
        const zeta : number = this.sliderMap["zeta"].value;
        const angle : number = this.sliderMap["angle"].value;
        const sigma : number = this.sliderMap["sigma"].value;
        const alpha : number = this.sliderMap["alpha"].value;

        this.filter.setUniformValues(radius, hardness, sharpness, zeta, angle, alpha, sigma);
    }

    public render (
        pool : FramebufferPool,
        textureWidth : number, 
        textureHeight : number,
        inputTextures : WebGLTexture[],
    ) : WebGLTexture | null {

        this.framebuffer = this.filter.render(pool, textureWidth, textureHeight, inputTextures);

        for (let i = 0; i < this.outputSockets.length; i++) {
            this.outputSockets[i].data = this.framebuffer.textures[i];
        }   

        return this.outputSockets[0].data;
    }
}

export default NodeAnisotropicKuwahara;