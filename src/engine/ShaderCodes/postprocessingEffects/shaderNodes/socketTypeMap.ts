export enum SocketType{
    FLOAT = "Float",
    IMAGE = "Image",
    VectorMap = "Vector",
    AngleMap = "Angle",
}

export interface SocketTypeMap {
    [SocketType.FLOAT] : number;
    [SocketType.IMAGE] : WebGLTexture;
    [SocketType.VectorMap] : WebGLTexture;
    [SocketType.AngleMap] : WebGLTexture;
}