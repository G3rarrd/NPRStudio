import { SocketType, SocketTypeMap } from "./socketTypeMap";


export class InputSocket<K extends SocketType> {
    public readonly type : K;
    public nodeId : number;
    public source : OutputSocket<K> | null = null;
    constructor(public name : string, type: K, nodeId : number) {
        this.type = type;
        this.nodeId = nodeId;
    }

    public getValue () :SocketTypeMap[K] | null {
        return this.source ? this.source.data : null;
    }
}


export class OutputSocket<K extends SocketType> {
    public readonly type : K;
    public nodeId : number;
    public data : SocketTypeMap[K] | null = null;
    public connections : Set<InputSocket<K>> = new Set();
    constructor (public name : string, type: K , nodeId : number) {
        this.type = type;
        this.nodeId = nodeId;
        this.data = null;
    }

}