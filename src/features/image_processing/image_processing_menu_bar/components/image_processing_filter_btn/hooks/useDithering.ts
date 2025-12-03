import { useContext } from "react";
import { ImageProcessingContext } from "../../../../components/image_processing_context/image_processing_provider";
import WebGLShaderGraph from "../../../../../../engine/ShaderCodes/postprocessingEffects/WebGLShaderGraph";
import NodeInput from "../../../../../../engine/ShaderCodes/postprocessingEffects/shaderNodes/nodeInput";
import NodeDithering from "../../../../../../engine/ShaderCodes/postprocessingEffects/shaderNodes/nodeDithering";


function useDithering () {
    const {rendererRef, setSliderMap: setSliderConfigs, setOpenFilterControl, filterFuncRef, setFilterName} = useContext(ImageProcessingContext);
    
    function handleDithering() {
        if (!rendererRef || ! rendererRef.current) return;
        const filterName : string ="Dithering"; 
        
        setFilterName(filterName);

        setOpenFilterControl(() => true);

        const renderer = rendererRef.current;
       
        const graphPipeline : WebGLShaderGraph = new WebGLShaderGraph(renderer.holdCurrentTexture, renderer.pool);
        const inputNode : NodeInput  = graphPipeline.inputNode;
        const ditheringNode : NodeDithering = new NodeDithering(graphPipeline.generateId(), renderer.pool, renderer.wgl);

        graphPipeline.addNode(ditheringNode);
        graphPipeline.connect(inputNode.outputSockets[0], ditheringNode.inputSockets[0]);

        setSliderConfigs({...ditheringNode.sliderMap}); // Helps initiate the slider(s)

        filterFuncRef.current = (sliders) => {
            for (const [key, slider] of Object.entries(sliders)) {
                ditheringNode.sliderMap[key] = slider;
            }
            
            ditheringNode.updateUniformValues();

            const postprocessedTexture : WebGLTexture | null =  graphPipeline.renderPass(renderer.textureWidth, renderer.textureHeight);
            if (!postprocessedTexture) throw new Error("Dithering Texture could not be processed");
            renderer.currentTexture = postprocessedTexture;

            renderer.renderScene();
        }

        filterFuncRef.current(ditheringNode.sliderMap); // Applies on click
    }

    return {handleDithering};
}
export default useDithering;