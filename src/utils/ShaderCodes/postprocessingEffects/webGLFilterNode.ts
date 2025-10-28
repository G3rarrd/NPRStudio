import { InputSocket, OutputSocket } from "./shaderNodes/socket";
import { SocketType } from "./shaderNodes/socketTypeMap";
import { Shader } from "./shader";

class WebGLShaderNode {
    public readonly id : number;
    public inputs: InputSocket<SocketType>[] = [];
    public outputs: OutputSocket<SocketType>[] = [];
    public shader : Shader;
    public useCount : number;

    constructor (shader : Shader, id : number) {
        this.shader = shader;
        this.useCount = 0;
        this.id = id;
    }

}

export default WebGLShaderNode;