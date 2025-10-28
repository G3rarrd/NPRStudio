import { useContext } from "react";
import { ImageProcessingContext } from "../../../../components/image_processing_context/image_processing_provider";
import WebGLShaderGraph from "../../../../../../utils/ShaderCodes/postprocessingEffects/WebGLShaderGraph";
import NodeInput from "../../../../../../utils/ShaderCodes/postprocessingEffects/shaderNodes/nodeInput";
import NodeKuwahara from "../../../../../../utils/ShaderCodes/postprocessingEffects/shaderNodes/nodeKuwahara";


function useKuwahara () {
    const {rendererRef, setSliderMap: setSliderConfigs,setOpenFilterControl, filterFuncRef, setFilterName} = useContext(ImageProcessingContext);
    
    function handleKuwaharaClick () {
        if (!rendererRef || ! rendererRef.current) return;

        const filterName : string ="Kuwahara"; 
        
        setFilterName(filterName);

        setOpenFilterControl(() => true);

        const renderer = rendererRef.current;
       
        const graphPipeline : WebGLShaderGraph = new WebGLShaderGraph(renderer.holdCurrentTexture, renderer.pool);
        const inputNode : NodeInput  = graphPipeline.inputNode;
        const kuwaharaNode : NodeKuwahara = new NodeKuwahara(graphPipeline.generateId(), renderer.pool, renderer.wgl);

        graphPipeline.addNode(kuwaharaNode);
        graphPipeline.connect(inputNode.outputSockets[0], kuwaharaNode.inputSockets[0]);

        setSliderConfigs({...kuwaharaNode.sliderMap}); // Helps initiate the slider(s)

        filterFuncRef.current = (sliders) => {
            for (const [key, slider] of Object.entries(sliders)) {
                kuwaharaNode.sliderMap[key] = slider;
            }

            kuwaharaNode.updateUniformValues();

            const postprocessedTexture : WebGLTexture | null =  graphPipeline.renderPass(renderer.textureWidth, renderer.textureHeight);
            if (!postprocessedTexture) throw new Error("Kuwahara Texture could not be processed");
            renderer.currentTexture = postprocessedTexture;

            renderer.renderScene();
        }

        filterFuncRef.current(kuwaharaNode.sliderMap); // Applies on click
    }

    return {handleKuwaharaClick};
}

export default useKuwahara;