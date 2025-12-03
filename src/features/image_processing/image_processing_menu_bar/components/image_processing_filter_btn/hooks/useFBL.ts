import { useContext } from "react";
import { ImageProcessingContext } from "../../../../components/image_processing_context/image_processing_provider";
import WebGLShaderGraph from "../../../../../../engine/ShaderCodes/postprocessingEffects/WebGLShaderGraph";
import NodeInput from "../../../../../../engine/ShaderCodes/postprocessingEffects/shaderNodes/nodeInput";
import NodeFBL from "../../../../../../engine/ShaderCodes/postprocessingEffects/shaderNodes/nodeFBL";

function useFBL () {
    const {rendererRef,setOpenFilterControl, setSliderMap: setSliderConfigs, filterFuncRef, setFilterName} = useContext(ImageProcessingContext);

    function handleFBLClick () {
        if (!rendererRef || ! rendererRef.current) return;
        
        const filterName : string ="FBL"; 
        
        setFilterName(filterName);

        setOpenFilterControl(() => true);

        const renderer = rendererRef.current;
       
        const graphPipeline : WebGLShaderGraph = new WebGLShaderGraph(renderer.holdCurrentTexture, renderer.pool);
        const inputNode : NodeInput  = graphPipeline.inputNode;
        const fblNode : NodeFBL = new NodeFBL(graphPipeline.generateId(), renderer.pool, renderer.wgl);

        graphPipeline.addNode(fblNode);
        graphPipeline.connect(inputNode.outputSockets[0], fblNode.inputSockets[0]);

        setSliderConfigs({...fblNode.sliderMap}); // Helps initiate the slider(s)

        filterFuncRef.current = (sliders) => {
            for (const [key, slider] of Object.entries(sliders)) {
                fblNode.sliderMap[key] = slider;
            }

            fblNode.updateUniformValues();

            //
            const postprocessedTexture : WebGLTexture | null =  graphPipeline.renderPass(renderer.textureWidth, renderer.textureHeight);
            if (!postprocessedTexture) throw new Error("FBL Texture could not be processed");
            renderer.currentTexture = postprocessedTexture;

            
            renderer.renderScene();
        }

        filterFuncRef.current(fblNode.sliderMap); // Applies on click
    }


    return {handleFBLClick};
}

export default useFBL;
