import { useContext } from "react";
import { ImageProcessingContext } from "../../../../components/image_processing_context/image_processing_provider";

function useRedo() {
    const {rendererRef, sliderMap} = useContext(ImageProcessingContext);
    
    function handleRedo () {
        const sliderCount : number = Object.entries(sliderMap).length;
        if (! rendererRef || ! rendererRef.current || sliderCount > 0) return;
        
        rendererRef.current.holdCurrentTexture = rendererRef.current.historyStack.redo();
        rendererRef.current.currentTexture = rendererRef.current.holdCurrentTexture;
        rendererRef.current.renderScene();
    }
    return {handleRedo};
}

export default useRedo;