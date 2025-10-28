import Framebuffer from "../../../framebuffer_textures/framebuffer";
import FramebufferPool from "../../../framebuffer_textures/framebufferPool";
import WebGLCore from "../../../webGLCore";
import CompositeShaderXDoG from "../compositeTextures/compositeShaderXDoG";
import DependencyResolver from "./dependencyResolver";
import { ShaderNode } from "./shaderNode";
import SliderBuilder, { Slider } from "./sliderBuilder";
import { InputSocket, OutputSocket } from "./socket";
import { SocketType } from "./socketTypeMap";

const SLIDER_CONFIG = [
    {min: 0.01, max: 60, step : 0.001, value: 1.0, label: "radius e"},
    {min: 0.01, max: 60, step : 0.001, value: 1.6, label: "radius c"},
    {min: 0.01, max: 60, step : 0.001, value: 1.0, label: "radius m"},
    {min: 0.01, max: 60, step : 0.001, value: 1.0, label: "radius a"},
    {min: 0.01, max: 200, step : 0.01, value: 1.0, label: "tau"},
    {min: 0.01, max: 1.0, step : 0.001, value: 0.7, label: "epsilon"},
    {min: 0.01, max: 60, step : 0.01, value: 1.0, label: "phi"},
]

export class NodeXDoG implements ShaderNode {
    public readonly  filter : CompositeShaderXDoG;
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
        this.filter = new CompositeShaderXDoG(wgl);
        
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
        const radiusE : number = this.sliderMap["radius e"].value;
        const radiusC : number = this.sliderMap["radius c"].value;
        const radiusM : number = this.sliderMap["radius m"].value;
        const radiusA : number = this.sliderMap["radius a"].value;
        const tau : number = this.sliderMap["tau"].value;
        const epsilon : number = this.sliderMap["epsilon"].value;
        const phi : number = this.sliderMap["phi"].value;

        this.filter.setUniformValues(radiusC, radiusE, radiusM, radiusA, tau, phi, epsilon);
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

export default NodeXDoG;