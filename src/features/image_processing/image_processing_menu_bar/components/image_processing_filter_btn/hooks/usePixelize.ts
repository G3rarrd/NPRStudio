import { useContext } from "react";
import { ImageProcessingContext } from "../../../../components/image_processing_context/image_processing_provider";
import WebGLShaderGraph from "../../../../../../engine/ShaderCodes/postprocessingEffects/WebGLShaderGraph";
import NodeInput from "../../../../../../engine/ShaderCodes/postprocessingEffects/shaderNodes/nodeInput";
import NodePixelize from "../../../../../../engine/ShaderCodes/postprocessingEffects/shaderNodes/nodePixelize";

function usePixelize () {
    const {rendererRef, setSliderMap: setSliderConfigs, setOpenFilterControl, filterFuncRef, setFilterName} = useContext(ImageProcessingContext);
    
    function handlePixelizeClick() {
        if (!rendererRef || ! rendererRef.current) return;
        const filterName : string ="Pixelize"; 
        
        setFilterName(filterName);
        
        setOpenFilterControl(() => true);
        
        const renderer = rendererRef.current;
        
        const graphPipeline : WebGLShaderGraph = new WebGLShaderGraph(renderer.holdCurrentTexture, renderer.pool);

        const inputNode : NodeInput = graphPipeline.inputNode;
        
        const pixelizeNode : NodePixelize = new NodePixelize(graphPipeline.generateId(), renderer.pool, renderer.wgl);
        
        graphPipeline.addNode(pixelizeNode);

        graphPipeline.connect(inputNode.outputSockets[0], pixelizeNode.inputSockets[0]);
        
        setSliderConfigs({...pixelizeNode.sliderMap}); // Helps initiate the slider(s)

        filterFuncRef.current = (sliders) => {
            for (const [key, slider] of Object.entries(sliders)) {
                pixelizeNode.sliderMap[key] = slider;
            }

            pixelizeNode.updateUniformValues();

            //
            const postprocessedTexture : WebGLTexture | null =  graphPipeline.renderPass(renderer.textureWidth, renderer.textureHeight);
            if (!postprocessedTexture) throw new Error("Pixelize Texture could not be processed");
            renderer.currentTexture = postprocessedTexture;

            renderer.renderScene();
        }


        filterFuncRef.current(pixelizeNode.sliderMap); // Applies on click
    }
    return {handlePixelizeClick};
}

export default usePixelize;