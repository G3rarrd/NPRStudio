import { useContext } from "react";
import { ImageProcessingContext } from "../../../../components/image_processing_context/image_processing_provider";
import WebGLShaderGraph from "../../../../../../engine/ShaderCodes/postprocessingEffects/WebGLShaderGraph";
import NodeInput from "../../../../../../engine/ShaderCodes/postprocessingEffects/shaderNodes/nodeInput";
import NodeGrayscale from "../../../../../../engine/ShaderCodes/postprocessingEffects/shaderNodes/nodeGrayscale";


function useGrayscale () {
    const {rendererRef, filterFuncRef, setFilterName} = useContext(ImageProcessingContext);

    function handleGrayscale () {
        if (! rendererRef || !rendererRef.current) return;
        const filterName : string ="Grayscale"; 

        setFilterName(filterName);

        const renderer = rendererRef.current;

        const graphPipeline : WebGLShaderGraph = new WebGLShaderGraph(renderer.holdCurrentTexture, renderer.pool);

        const inputNode : NodeInput = graphPipeline.inputNode;

        const grayscaleNode : NodeGrayscale = new NodeGrayscale(graphPipeline.generateId(), renderer.pool, renderer.wgl);
        graphPipeline.addNode(grayscaleNode);

        graphPipeline.connect(inputNode.outputSockets[0], grayscaleNode.inputSockets[0]);
        
        const postprocessedTexture : WebGLTexture | null =  graphPipeline.renderPass(renderer.textureWidth, renderer.textureHeight);
        
        if (!postprocessedTexture) throw new Error("Grayscale Texture could not be processed");
        
        renderer.currentTexture = postprocessedTexture;

        filterFuncRef.current = () => {};

        renderer.renderScene();
        
        const imgWidth = renderer.img.naturalWidth;
        const imgHeight = renderer.img.naturalHeight;
        renderer.historyStack.add(renderer.currentTexture, imgWidth, imgHeight);

        renderer.holdCurrentTexture = renderer.historyStack.getUndoStackTop();
    }

    return {handleGrayscale};
}

export default useGrayscale;