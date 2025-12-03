import Framebuffer from "../../../framebuffer_textures/framebuffer";
import FramebufferPool from "../../../framebuffer_textures/framebufferPool";
import WebGLShaderPass from "../webGLShaderPass";
import DependencyResolver from "./dependencyResolver";
import { InputSocket, OutputSocket } from "./socket";
import { SocketType } from "./socketTypeMap";

export interface ShaderNode {
    id : number;
    inputSockets : InputSocket<SocketType>[];
    outputSockets : OutputSocket<SocketType>[];
    framebuffer : Framebuffer | null;
    dependencyResolver : DependencyResolver;
    shaderPass? : WebGLShaderPass;

    render  (pool : FramebufferPool, textureWidth : number, textureHeight : number, inputTextures : WebGLTexture[]) : WebGLTexture | null ;
    isNodeNeeded() : boolean;
}

// The question marks are for the input node as it does not need the marked attributes and methods