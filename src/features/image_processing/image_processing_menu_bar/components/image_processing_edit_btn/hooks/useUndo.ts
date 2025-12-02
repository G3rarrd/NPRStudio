import { useContext } from "react";
import { ImageProcessingContext } from "../../../../components/image_processing_context/image_processing_provider";

function useUndo() {
    const {rendererRef, sliderMap} = useContext(ImageProcessingContext);
    function handleUndo () {
        const sliderCount : number = Object.entries(sliderMap).length;
        if (! rendererRef || ! rendererRef.current || sliderCount > 0) return;
        
        rendererRef.current.holdCurrentTexture = rendererRef.current.historyStack.undo();
        rendererRef.current.currentTexture = rendererRef.current.holdCurrentTexture;
        rendererRef.current.renderScene();
    }
    return {handleUndo};
}

export default useUndo;