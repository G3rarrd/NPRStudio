import { useContext } from "react";
import { ImageProcessingContext } from "../../../../components/image_processing_context/image_processing_provider";
import WebGLShaderGraph from "../../../../../../engine/ShaderCodes/postprocessingEffects/WebGLShaderGraph";
import NodeInput from "../../../../../../engine/ShaderCodes/postprocessingEffects/shaderNodes/nodeInput";
import NodeGaussianBlur from "../../../../../../engine/ShaderCodes/postprocessingEffects/shaderNodes/nodeGaussianBlur";

function useGaussianBlur () {
    const {rendererRef, setSliderMap: setSliderConfigs, setOpenFilterControl, filterFuncRef, setFilterName} = useContext(ImageProcessingContext);
    
    function handleGaussianBlurClick() {
        if (!rendererRef || ! rendererRef.current) return;
        
        const filterName : string ="Gaussian Blur"; 
        
        setFilterName(filterName);

        setOpenFilterControl(() => true);

        const renderer = rendererRef.current;
       
        const graphPipeline : WebGLShaderGraph = new WebGLShaderGraph(renderer.holdCurrentTexture, renderer.pool);
        const inputNode : NodeInput  = graphPipeline.inputNode;
        const gaussianBlurNode : NodeGaussianBlur = new NodeGaussianBlur(graphPipeline.generateId(), renderer.pool, renderer.wgl);

        graphPipeline.addNode(gaussianBlurNode);
        graphPipeline.connect(inputNode.outputSockets[0], gaussianBlurNode.inputSockets[0]);

        setSliderConfigs({...gaussianBlurNode.sliderMap}); // Helps initiate the slider(s)

        filterFuncRef.current = (sliders) => {
            for (const [key, slider] of Object.entries(sliders)) {
                gaussianBlurNode.sliderMap[key] = slider;
            }

            gaussianBlurNode.updateUniformValues();

            const postprocessedTexture : WebGLTexture | null =  graphPipeline.renderPass(renderer.textureWidth, renderer.textureHeight);
            if (!postprocessedTexture) throw new Error("Gaussian Blur Texture could not be processed");
            renderer.currentTexture = postprocessedTexture;

            renderer.renderScene();
        }

        filterFuncRef.current(gaussianBlurNode.sliderMap); // Applies on click
    }

    return {handleGaussianBlurClick};
}
export default useGaussianBlur;