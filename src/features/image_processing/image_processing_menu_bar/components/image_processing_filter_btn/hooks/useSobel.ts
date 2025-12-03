import { useContext} from "react";
import { ImageProcessingContext } from "../../../../components/image_processing_context/image_processing_provider";
import WebGLShaderGraph from "../../../../../../engine/ShaderCodes/postprocessingEffects/WebGLShaderGraph";
import NodeInput from "../../../../../../engine/ShaderCodes/postprocessingEffects/shaderNodes/nodeInput";
import NodeSobel from "../../../../../../engine/ShaderCodes/postprocessingEffects/shaderNodes/nodeSobel";

function useSobel() {
    const {rendererRef, filterFuncRef, setFilterName} = useContext(ImageProcessingContext);

    function handleSobel () {
       if (! rendererRef || ! rendererRef.current) return;
        
        const filterName : string = "Sobel"; 
        
        setFilterName(filterName);

        const renderer = rendererRef.current;

        const graphPipeline : WebGLShaderGraph = new WebGLShaderGraph(renderer.holdCurrentTexture, renderer.pool);
        
        const inputNode : NodeInput = graphPipeline.inputNode;

        const embossNode : NodeSobel = new NodeSobel(graphPipeline.generateId(), renderer.pool, renderer.wgl);
        
        graphPipeline.addNode(embossNode);

        graphPipeline.connect(inputNode.outputSockets[0], embossNode.inputSockets[0]);
        
        filterFuncRef.current = () => {};

        const postprocessedTexture : WebGLTexture | null =  graphPipeline.renderPass(renderer.textureWidth, renderer.textureHeight);
        if (!postprocessedTexture) throw new Error("Sobel Texture could not be processed");
        renderer.currentTexture = postprocessedTexture;

        renderer.renderScene();
        
        const imgWidth = renderer.img.naturalWidth;
        const imgHeight = renderer.img.naturalHeight;
        renderer.historyStack.add(renderer.currentTexture, imgWidth, imgHeight);
        renderer.holdCurrentTexture  = renderer.historyStack.getUndoStackTop();
    }

    return {handleSobel};
}

export default useSobel;