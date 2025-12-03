import { useContext} from "react";
import { ImageProcessingContext } from "../../../../components/image_processing_context/image_processing_provider";
import WebGLShaderGraph from "../../../../../../engine/ShaderCodes/postprocessingEffects/WebGLShaderGraph";
import NodeInput from "../../../../../../engine/ShaderCodes/postprocessingEffects/shaderNodes/nodeInput";
import NodeSharpen from "../../../../../../engine/ShaderCodes/postprocessingEffects/shaderNodes/nodeSharpen";

function useSharpen() {
    const {rendererRef, filterFuncRef, setFilterName} = useContext(ImageProcessingContext);

    function handleSharpen () {
        if (! rendererRef || ! rendererRef.current) return;
        
        const filterName : string = "Sharpen"; 
        
        setFilterName(filterName);

        const renderer = rendererRef.current;

        const graphPipeline : WebGLShaderGraph = new WebGLShaderGraph(renderer.holdCurrentTexture, renderer.pool);
        
        const inputNode : NodeInput = graphPipeline.inputNode;

        const sharpenNode : NodeSharpen = new NodeSharpen(graphPipeline.generateId(), renderer.pool, renderer.wgl);
        
        graphPipeline.addNode(sharpenNode);

        graphPipeline.connect(inputNode.outputSockets[0], sharpenNode.inputSockets[0]);
        
        filterFuncRef.current = () => {};

        const postprocessedTexture : WebGLTexture | null =  graphPipeline.renderPass(renderer.textureWidth, renderer.textureHeight);
        if (!postprocessedTexture) throw new Error("Sharpen Texture could not be processed");
        renderer.currentTexture = postprocessedTexture;

        renderer.renderScene();
        
        const imgWidth = renderer.img.naturalWidth;
        const imgHeight = renderer.img.naturalHeight;
        renderer.historyStack.add(renderer.currentTexture, imgWidth, imgHeight);
        renderer.holdCurrentTexture  = renderer.historyStack.getUndoStackTop();
    }

    return {handleSharpen};
}

export default useSharpen;