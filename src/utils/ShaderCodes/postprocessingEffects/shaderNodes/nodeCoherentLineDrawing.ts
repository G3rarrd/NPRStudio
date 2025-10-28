import Framebuffer from "../../../framebuffer_textures/framebuffer";
import FramebufferPool from "../../../framebuffer_textures/framebufferPool";
import WebGLCore from "../../../webGLCore";
import CompositeShaderCoherentLineDrawing from "../compositeTextures/compositeShaderCoherentLineDrawing";
import DependencyResolver from "./dependencyResolver";
import { ShaderNode } from "./shaderNode";
import SliderBuilder, { Slider } from "./sliderBuilder";
import { InputSocket, OutputSocket } from "./socket";
import { SocketType } from "./socketTypeMap";




const SLIDER_CONFIG = [
            {min: 0.01, max: 60, step : 0.001, value: 1.6, label: "thickness"},  // sigma c
            {min: 0.01, max: 60, step : 0.001, value: 1.5, label: "radius m"},  // sigma m
            {min: 3, max: 21, step : 2, value: 7, label: "etf kernel size"},
            {min: 0.1, max: 1, step : 0.0001, value: 0.92, label: "tau"},
            {min: 1, max: 5, step : 1, value: 2, label: "iteration"},
            {min: 1, max: 5, step : 1, value: 2, label: "etf iteration"},
            {min: 0.1, max: 1.0, step : 0.0001, value:0.9, label: "p"},
        ]

export class NodeCoherentLineDrawing implements ShaderNode {
    public readonly  filter : CompositeShaderCoherentLineDrawing;
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
        this.filter = new CompositeShaderCoherentLineDrawing(wgl);
        
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
        const thickness     : number = this.sliderMap["thickness"].value;
        const radiusM       : number = this.sliderMap["radius m"].value;
        const etfKernelSize : number = this.sliderMap["etf kernel size"].value;
        const tau           : number = this.sliderMap["tau"].value;
        const iteration     : number = this.sliderMap["iteration"].value;
        const etfIteration  : number = this.sliderMap["etf iteration"].value;
        const p             : number = this.sliderMap["p"].value;

        this.filter.setUniformValues(thickness, radiusM, etfKernelSize, tau, p, iteration, etfIteration);
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

export default NodeCoherentLineDrawing;