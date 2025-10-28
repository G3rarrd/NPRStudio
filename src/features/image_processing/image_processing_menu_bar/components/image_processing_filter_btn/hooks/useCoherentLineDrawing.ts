import { useContext } from "react";
import { ImageProcessingContext } from "../../../../components/image_processing_context/image_processing_provider";
import WebGLShaderGraph from "../../../../../../utils/ShaderCodes/postprocessingEffects/WebGLShaderGraph";
import NodeInput from "../../../../../../utils/ShaderCodes/postprocessingEffects/shaderNodes/nodeInput";
import NodeCoherentLineDrawing from "../../../../../../utils/ShaderCodes/postprocessingEffects/shaderNodes/nodeCoherentLineDrawing";

function useCoherentLineDrawing () {
    const {rendererRef,setOpenFilterControl, filterFuncRef, setSliderMap: setSliderConfigs, setFilterName} = useContext(ImageProcessingContext);
    
    function handleFDoGClick() {
        if (!rendererRef || ! rendererRef.current) return;
        
        const filterName : string ="Coherent Line Drawing"; 
        
        setFilterName(filterName);

        setOpenFilterControl(() => true);

        const renderer = rendererRef.current;
       
        const graphPipeline : WebGLShaderGraph = new WebGLShaderGraph(renderer.holdCurrentTexture, renderer.pool);
        const inputNode : NodeInput  = graphPipeline.inputNode;
        const coherentLineDrawingNode : NodeCoherentLineDrawing = new NodeCoherentLineDrawing(graphPipeline.generateId(), renderer.pool, renderer.wgl);

        graphPipeline.addNode(coherentLineDrawingNode);
        graphPipeline.connect(inputNode.outputSockets[0], coherentLineDrawingNode.inputSockets[0]);

        setSliderConfigs({...coherentLineDrawingNode.sliderMap}); // Helps initiate the slider(s)

        filterFuncRef.current = (sliders) => {
            for (const [key, slider] of Object.entries(sliders)) {
                coherentLineDrawingNode.sliderMap[key] = slider;
            }

            coherentLineDrawingNode.updateUniformValues();

            //
            const postprocessedTexture : WebGLTexture | null =  graphPipeline.renderPass(renderer.textureWidth, renderer.textureHeight);
            if (!postprocessedTexture) throw new Error("Coherent Line Drawing Texture could not be processed");
            renderer.currentTexture = postprocessedTexture;

            
            renderer.renderScene();
        }

        filterFuncRef.current(coherentLineDrawingNode.sliderMap); // Applies on click
    }
    return {handleFDoGClick};
}
export default useCoherentLineDrawing;