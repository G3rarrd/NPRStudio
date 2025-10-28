import { useContext } from "react";
import { ImageProcessingContext } from "../../../../components/image_processing_context/image_processing_provider";
import WebGLShaderGraph from "../../../../../../utils/ShaderCodes/postprocessingEffects/WebGLShaderGraph";
import NodeInput from "../../../../../../utils/ShaderCodes/postprocessingEffects/shaderNodes/nodeInput";
import NodeXDoG from "../../../../../../utils/ShaderCodes/postprocessingEffects/shaderNodes/nodeXDoG";

function useXDoG () {
    const {rendererRef, filterFuncRef, setSliderMap: setSliderConfigs, setOpenFilterControl, setFilterName} = useContext(ImageProcessingContext);
    
    function handleXDoGClick() {
        if (!rendererRef || ! rendererRef.current) return;
        
        const filterName : string ="XDoG"; 
        
        setFilterName(filterName);

        setOpenFilterControl(() => true);

        const renderer = rendererRef.current;
       
        const graphPipeline : WebGLShaderGraph = new WebGLShaderGraph(renderer.holdCurrentTexture, renderer.pool);
        const inputNode : NodeInput  = graphPipeline.inputNode;
        const xDoGNode : NodeXDoG = new NodeXDoG(graphPipeline.generateId(), renderer.pool, renderer.wgl);

        graphPipeline.addNode(xDoGNode);
        graphPipeline.connect(inputNode.outputSockets[0], xDoGNode.inputSockets[0]);

        setSliderConfigs({...xDoGNode.sliderMap}); // Helps initiate the slider(s)

        filterFuncRef.current = (sliders) => {
            for (const [key, slider] of Object.entries(sliders)) {
                xDoGNode.sliderMap[key] = slider;
            }

            xDoGNode.updateUniformValues();

            //
            const postprocessedTexture : WebGLTexture | null =  graphPipeline.renderPass(renderer.textureWidth, renderer.textureHeight);
            if (!postprocessedTexture) throw new Error("XDoG Texture could not be processed");
            renderer.currentTexture = postprocessedTexture;

            
            renderer.renderScene();
        }

        filterFuncRef.current(xDoGNode.sliderMap); // Applies on click   
    }

    return {handleXDoGClick};
}
export default useXDoG;