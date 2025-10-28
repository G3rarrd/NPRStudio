import { useContext } from "react";
import { ImageProcessingContext } from "../../../../components/image_processing_context/image_processing_provider";
import WebGLShaderGraph from "../../../../../../utils/ShaderCodes/postprocessingEffects/WebGLShaderGraph";
import NodeInput from "../../../../../../utils/ShaderCodes/postprocessingEffects/shaderNodes/nodeInput";
import { NodeAnisotropicKuwahara } from "../../../../../../utils/ShaderCodes/postprocessingEffects/shaderNodes/nodeAnisotropicKuwahara";


function useAnisotropicKuwahara () {
    const {rendererRef, setSliderMap: setSliderConfigs,setOpenFilterControl, filterFuncRef, setFilterName} = useContext(ImageProcessingContext);
    function handleAnisotropicKuwaharaClick () {
        if (!rendererRef || ! rendererRef.current) return;
        
        const filterName : string ="Anisotropic Kuwahara"; 
        
        setFilterName(filterName);

        setOpenFilterControl(() => true);

        const renderer = rendererRef.current;
       
        const graphPipeline : WebGLShaderGraph = new WebGLShaderGraph(renderer.holdCurrentTexture, renderer.pool);
        const inputNode : NodeInput  = graphPipeline.inputNode;
        const anisotropicKuwaharaNode : NodeAnisotropicKuwahara = new NodeAnisotropicKuwahara(graphPipeline.generateId(), renderer.pool, renderer.wgl);

        graphPipeline.addNode(anisotropicKuwaharaNode);
        graphPipeline.connect(inputNode.outputSockets[0], anisotropicKuwaharaNode.inputSockets[0]);

        setSliderConfigs({...anisotropicKuwaharaNode.sliderMap}); // Helps initiate the slider(s)

        filterFuncRef.current = (sliders) => {
            for (const [key, slider] of Object.entries(sliders)) {
                anisotropicKuwaharaNode.sliderMap[key] = slider;
            }

            anisotropicKuwaharaNode.updateUniformValues();

            //
            const postprocessedTexture : WebGLTexture | null =  graphPipeline.renderPass(renderer.textureWidth, renderer.textureHeight);
            if (!postprocessedTexture) throw new Error("Anisotropic Kuwahara Texture could not be processed");
            renderer.currentTexture = postprocessedTexture;

            
            renderer.renderScene();
        }

        filterFuncRef.current(anisotropicKuwaharaNode.sliderMap); // Applies on click
    }
    return {handleAnisotropicKuwaharaClick};
}

export default useAnisotropicKuwahara;