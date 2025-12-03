import { useContext } from "react";
import { ImageProcessingContext } from "../../../../components/image_processing_context/image_processing_provider";
import WebGLShaderGraph from "../../../../../../engine/ShaderCodes/postprocessingEffects/WebGLShaderGraph";
import NodeInput from "../../../../../../engine/ShaderCodes/postprocessingEffects/shaderNodes/nodeInput";
import NodeBinaryThreshold from "../../../../../../engine/ShaderCodes/postprocessingEffects/shaderNodes/nodeBinaryThreshold";


function useBinaryThreshold () {
    const {rendererRef, setOpenFilterControl, setSliderMap: setSliderConfigs, filterFuncRef, setFilterName} = useContext(ImageProcessingContext);
    
    function handleBinaryThresholdClick() {
        if (!rendererRef || ! rendererRef.current) return;

        setOpenFilterControl(() => true);

        const filterName : string ="Binary Threshold"; 
        
        setFilterName(filterName);
        
        const renderer = rendererRef.current;
       
        const graphPipeline : WebGLShaderGraph = new WebGLShaderGraph(renderer.holdCurrentTexture, renderer.pool);
        const inputNode : NodeInput  = graphPipeline.inputNode;
        const binaryThresholdNode : NodeBinaryThreshold = new NodeBinaryThreshold(graphPipeline.generateId(), renderer.pool, renderer.wgl);

        graphPipeline.addNode(binaryThresholdNode);

        graphPipeline.connect(inputNode.outputSockets[0], binaryThresholdNode.inputSockets[0]);

        setSliderConfigs({...binaryThresholdNode.sliderMap}); // Helps initiate the slider(s)

        filterFuncRef.current = (sliders) => {
            for (const [key, slider] of Object.entries(sliders)) {
                binaryThresholdNode.sliderMap[key] = slider;
            }

            binaryThresholdNode.updateUniformValues();

            const postprocessedTexture : WebGLTexture | null =  graphPipeline.renderPass(renderer.textureWidth, renderer.textureHeight);
            if (!postprocessedTexture) throw new Error("Binary Thereshold Texture could not be processed");
            renderer.currentTexture = postprocessedTexture;

            renderer.renderScene();
        }

        filterFuncRef.current(binaryThresholdNode.sliderMap); // Applies on click
    }

    return {handleBinaryThresholdClick};
}

export default useBinaryThreshold;