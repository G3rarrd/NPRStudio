import { useContext} from "react";
import { ImageProcessingContext } from "../../../../components/image_processing_context/image_processing_provider";
import WebGLShaderGraph from "../../../../../../utils/ShaderCodes/postprocessingEffects/WebGLShaderGraph";
import NodeInput from "../../../../../../utils/ShaderCodes/postprocessingEffects/shaderNodes/nodeInput";
import NodeInvert from "../../../../../../utils/ShaderCodes/postprocessingEffects/shaderNodes/nodeInvert";

function useInvert() {
    const {rendererRef, filterFuncRef, setFilterName} = useContext(ImageProcessingContext);

    function handleInvert () {
        if (! rendererRef || ! rendererRef.current) return;
        const filterName : string ="Invert"; 
        
        setFilterName(filterName);

        const renderer = rendererRef.current;

        const graphPipeline : WebGLShaderGraph = new WebGLShaderGraph(renderer.holdCurrentTexture, renderer.pool);
        
        const inputNode : NodeInput = graphPipeline.inputNode;

        const invertNode : NodeInvert = new NodeInvert(graphPipeline.generateId(), renderer.pool, renderer.wgl);

        graphPipeline.addNode(invertNode);

        graphPipeline.connect(inputNode.outputSockets[0], invertNode.inputSockets[0]);

        const postprocessedTexture : WebGLTexture | null =  graphPipeline.renderPass(renderer.textureWidth, renderer.textureHeight);
        
        if (!postprocessedTexture) throw new Error("Invert Texture could not be processed");
        
        renderer.currentTexture = postprocessedTexture;

        filterFuncRef.current = () => {};

        renderer.renderScene();
        
        const imgWidth = renderer.img.naturalWidth;
        const imgHeight = renderer.img.naturalHeight;
        renderer.historyStack.add(renderer.currentTexture, imgWidth, imgHeight);

        renderer.holdCurrentTexture = renderer.historyStack.getUndoStackTop();
    }

    return {handleInvert};
}

export default useInvert;