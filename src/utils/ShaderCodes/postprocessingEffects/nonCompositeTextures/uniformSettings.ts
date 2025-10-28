import WebGLCore from "../../../webGLCore";

class UniformLocationSettings {
    private wgl : WebGLCore;
    private program : WebGLProgram;
    private uniformLocations : Map<string, WebGLUniformLocation> = new Map<string, WebGLUniformLocation>();

    constructor(wgl : WebGLCore, program : WebGLProgram) {
        this.wgl = wgl;
        this.program = program;
    }

    public fetchUniformLocation(name : string) :  WebGLUniformLocation | null {
        const gl : WebGL2RenderingContext = this.wgl.gl;
        if (this.uniformLocations.has(name)) return this.uniformLocations.get(name)!;
        
        const location = gl.getUniformLocation(this.program, name);
        if (location !== null) this.uniformLocations.set(name, location);
        return location;
    } 

    public setUniformLocationError = (uniformVariable : string) : string => {
        return `Uniform ${uniformVariable} not found`;
    }

}

export default UniformLocationSettings; 