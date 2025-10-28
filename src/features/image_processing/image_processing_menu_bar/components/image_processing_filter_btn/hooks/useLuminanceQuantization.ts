import { useContext } from "react";
import { ImageProcessingContext } from "../../../../components/image_processing_context/image_processing_provider";
import WebGLShaderGraph from "../../../../../../utils/ShaderCodes/postprocessingEffects/WebGLShaderGraph";
import NodeInput from "../../../../../../utils/ShaderCodes/postprocessingEffects/shaderNodes/nodeInput";
import NodeLuminanceQuantization from "../../../../../../utils/ShaderCodes/postprocessingEffects/shaderNodes/nodeLuminanceQuantization";

function useLuminanceQuantization () {
    const {rendererRef, setSliderMap: setSliderConfigs, setOpenFilterControl, filterFuncRef, setFilterName} = useContext(ImageProcessingContext);
    
    function handleLuminanceQuantizationClick() {
        if (!rendererRef || ! rendererRef.current) return;

        const filterName : string ="Luminance Quantization"; 
        
        setFilterName(filterName);

        setOpenFilterControl(() => true);

        const renderer = rendererRef.current;
       
        const graphPipeline : WebGLShaderGraph = new WebGLShaderGraph(renderer.holdCurrentTexture, renderer.pool);
        const inputNode : NodeInput  = graphPipeline.inputNode;
        const luminanceQuantizationNode : NodeLuminanceQuantization = new NodeLuminanceQuantization(graphPipeline.generateId(), renderer.pool, renderer.wgl);

        graphPipeline.addNode(luminanceQuantizationNode);
        graphPipeline.connect(inputNode.outputSockets[0], luminanceQuantizationNode.inputSockets[0]);

        setSliderConfigs({...luminanceQuantizationNode.sliderMap}); // Helps initiate the slider(s)

        filterFuncRef.current = (sliders) => {
            for (const [key, slider] of Object.entries(sliders)) {
                luminanceQuantizationNode.sliderMap[key] = slider;
            }

            luminanceQuantizationNode.updateUniformValues();


            const postprocessedTexture : WebGLTexture | null =  graphPipeline.renderPass(renderer.textureWidth, renderer.textureHeight);
            if (!postprocessedTexture) throw new Error("Luminance Quantization Texture could not be processed");
            renderer.currentTexture = postprocessedTexture;

            renderer.renderScene();
        }
        filterFuncRef.current(luminanceQuantizationNode.sliderMap); // Applies on click
    }

    return {handleLuminanceQuantizationClick};

}

export default useLuminanceQuantization;