import Framebuffer from '../../framebuffer_textures/framebuffer';
import FramebufferPool from '../../framebuffer_textures/framebufferPool';
import { ShaderNode } from './shaderNodes/shaderNode';
import { InputSocket, OutputSocket } from './shaderNodes/socket';
import { SocketType } from './shaderNodes/socketTypeMap';
import NodeInput from './shaderNodes/nodeInput';


class ShaderLink {
    public fromSocket : OutputSocket<SocketType>;
    public toSocket : InputSocket<SocketType>;

    constructor (
        fromSocket: OutputSocket<SocketType>,
        toSocket : InputSocket<SocketType>,
    ) {
        this.fromSocket = fromSocket;
        this.toSocket = toSocket;
    };

    public connect() {
        if (this.fromSocket.type !== this.toSocket.type) {
            throw new Error("Socket types do not match")
        }
        this.fromSocket.connections.add(this.toSocket); // input connections 
        this.toSocket.source = this.fromSocket;
    };

    public disconnect() {
        this.fromSocket.connections.delete(this.toSocket);
        this.toSocket.source = null;
    }
}


class WebGLShaderGraph {
    private id : number = 0;
    private nodes : Map<number,ShaderNode> = new Map();
    public links : Set<ShaderLink> = new Set(); 
    public inputNode : NodeInput; // Abstracting the input node initializers for every graph call;
    private framebufferPool : FramebufferPool; 

    constructor (startTexture : WebGLTexture, framebufferPool : FramebufferPool) {
        this.framebufferPool = framebufferPool;

        this.inputNode = new NodeInput(this.generateId(), startTexture);
        this.addNode(this.inputNode);
    }

    public addNode(shaderNode : ShaderNode) : number {
        this.nodes.set(shaderNode.id, shaderNode);
        return shaderNode.id ;
    }

    public generateId() {
        return this.id++;
    }

    public deleteNode(nodeId : number) {
        const linksToRemove : ShaderLink[] = [];

        for(const link of this.links) {
            if (link.fromSocket.nodeId === nodeId || link.toSocket.nodeId === nodeId) {
                linksToRemove.push(link);
            }
        }

        for(const link of linksToRemove) {
            this.disconnect(link);
        }

        this.nodes.delete(nodeId);
    }

    public connect(fromSocket : OutputSocket<SocketType>,toSocket : InputSocket<SocketType> ) {
        const link = new ShaderLink(fromSocket, toSocket);
        const node : ShaderNode | undefined = this.nodes.get(fromSocket.nodeId);

        if (node) node.dependencyResolver.totalDependantCount++;

        link.connect();
        this.links.add(link);
    }

    public disconnect(link : ShaderLink) {
        const node : ShaderNode | undefined = this.nodes.get(link.fromSocket.nodeId);

        if (node) node.dependencyResolver.totalDependantCount--;

        link.disconnect();
        this.links.delete(link);
    }

    public getNode(id : number) : ShaderNode | undefined {
        return this.nodes.get(id);
    }

    private buildAdjacencyMap()  : Map<number, number[]> {
        const adjacencyMap : Map<number, number[]> = new Map();

        for (const link of this.links) {
            const from = link.fromSocket.nodeId;
            const to = link.toSocket.nodeId;

            if (!adjacencyMap.has(from)) adjacencyMap.set(from, []);
            
            const getId = adjacencyMap.get(from);

            if (! getId) throw new Error(`Node ${from} not found`);
            
            getId.push(to);
        }

        return adjacencyMap;
    }

    private topoSort() {
        const result : number[] = [];
        const adjacency = this.buildAdjacencyMap();
        
        // Initialize inDegree of all the nodes
        const inDegree : Map<number, number> = new Map<number, number>();
        for (const nodeId of this.nodes.keys()) {
            inDegree.set(nodeId, 0);
        }
        
        // Count the dependencies (inDegree) of each node
        for (const [_, toList] of adjacency) {
            for (const to of toList ) {
                const degree : number | undefined = inDegree.get(to);
                inDegree.set(to, (degree ?? 0) + 1);                
            }
        }

        const queue : number[] = [];

        // Assign the nodes without dependencies to the queue 
        for (const [nodeId, degree] of inDegree) {
            if (degree === 0) {
                queue.push(nodeId);
            }
        }

        while(queue.length > 0) {
            const nodeId : number = queue.shift()!;
            result.push(nodeId);
            const neighbors : number[] | undefined = adjacency.get(nodeId);
            
            if (neighbors === undefined) continue;

            for (const neighbor of neighbors) {
                let degree : number | undefined = inDegree.get(neighbor);
                
                if (degree === undefined) continue;
        
                degree--;
                inDegree.set(neighbor,  degree);
                
                if (degree === 0) queue.push(neighbor);
            }
        }

        if (result.length !== this.nodes.size) {
            throw new Error("Graph contains a cycle");
        }

        return result;
    }

    public getNodeInputTextures (shaderNode : ShaderNode ) : WebGLTexture[] | null{ 
        const textures : WebGLTexture[] = []; 
        for (let i = 0; i < shaderNode.inputSockets.length; i++) {
            const tex : WebGLTexture | null = shaderNode.inputSockets[i].getValue();
            
            if (tex === null) {
                console.warn(`Missing input texture at socket ${i} for node ${shaderNode.id}`)
                return null;
            } 

            textures.push(tex);
        }

        return textures;
    }

    public renderPass (textureWidth : number, textureHeight : number) : WebGLTexture | null {
        const renderSequence : number[] = this.topoSort();
        let postProcessedTexture : WebGLTexture | null = null;

        for (let i = 0; i < renderSequence.length; i++) {
            const shaderNode : ShaderNode | undefined = this.nodes.get(renderSequence[i]);

            if (shaderNode)  {
                const inputTextures : WebGLTexture[] | null = this.getNodeInputTextures(shaderNode); 
                
                if (inputTextures !== null) {
                    const curTexture : WebGLTexture | null  = shaderNode.render(this.framebufferPool, textureWidth, textureHeight, inputTextures);
                    
                    if (curTexture)
                        postProcessedTexture = curTexture;
                }

                this.reduceDependencies(shaderNode);

                // Ensures the last framebuffer is removed
                if(i === renderSequence.length - 1) {
                    this.releaseFramebuffer(shaderNode.framebuffer);
                }
            }
        }
        
        return postProcessedTexture;
    }

    private releaseFramebuffer (nodeFramebuffer : Framebuffer | null) : void {
        if (nodeFramebuffer) {
            this.framebufferPool.release(nodeFramebuffer);
        }
    }

    private reduceDependencies(shaderNode : ShaderNode) : void {
        const inputSockets : InputSocket<SocketType>[] = shaderNode.inputSockets;
        for (let socket of inputSockets) {
            const dependecyOutputSocket : OutputSocket<SocketType> | null= socket.source;
            if (dependecyOutputSocket) {
                const dependecyNodeId : number = dependecyOutputSocket.nodeId;
                const shaderNode = this.nodes.get(dependecyNodeId);

                if (shaderNode && shaderNode.isNodeNeeded() ) {
                    this.releaseFramebuffer(shaderNode.framebuffer);
                } 
            }
            
        }
    }
}

export default WebGLShaderGraph;