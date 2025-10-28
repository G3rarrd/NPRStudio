import { useContext } from "react";
import { ImageProcessingContext } from "../../../../components/image_processing_context/image_processing_provider";
import WebGLShaderGraph from "../../../../../../utils/ShaderCodes/postprocessingEffects/WebGLShaderGraph";
import NodeInput from "../../../../../../utils/ShaderCodes/postprocessingEffects/shaderNodes/nodeInput";
import NodeQunatization from "../../../../../../utils/ShaderCodes/postprocessingEffects/shaderNodes/nodeQuantization";

function useQuantization () {
    const {rendererRef, setSliderMap: setSliderConfigs, setOpenFilterControl, filterFuncRef, setFilterName} = useContext(ImageProcessingContext);
    
    function handleQuantization() {
        if (!rendererRef || ! rendererRef.current) return;
        const filterName : string ="Quantization"; 
        
        setFilterName(filterName);

        setOpenFilterControl(() => true);

        const renderer = rendererRef.current;
       
        const graphPipeline : WebGLShaderGraph = new WebGLShaderGraph(renderer.holdCurrentTexture, renderer.pool);
        const inputNode : NodeInput  = graphPipeline.inputNode;
        const quantizationNode : NodeQunatization = new NodeQunatization(graphPipeline.generateId(), renderer.pool, renderer.wgl);

        graphPipeline.addNode(quantizationNode);
        graphPipeline.connect(inputNode.outputSockets[0], quantizationNode.inputSockets[0]);

        setSliderConfigs({...quantizationNode.sliderMap}); // Helps initiate the slider(s)

        filterFuncRef.current = (sliders) => {
            for (const [key, slider] of Object.entries(sliders)) {
                quantizationNode.sliderMap[key] = slider;
            }

            quantizationNode.updateUniformValues();

            const postprocessedTexture : WebGLTexture | null =  graphPipeline.renderPass(renderer.textureWidth, renderer.textureHeight);
            if (!postprocessedTexture) throw new Error("Quantization Texture could not be processed");
            renderer.currentTexture = postprocessedTexture;

            renderer.renderScene();
        }

        filterFuncRef.current(quantizationNode.sliderMap); // Applies on click
    }

    return { handleQuantization};
}
export default useQuantization;