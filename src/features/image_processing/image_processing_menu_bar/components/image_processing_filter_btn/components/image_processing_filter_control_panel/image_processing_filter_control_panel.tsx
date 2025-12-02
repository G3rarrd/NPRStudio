import { useCallback, useContext, useEffect } from "react";
import ImageProcessingRangeSliders from "../image_processing_filter_range_sliders/image_processing_filter_range_sliders";
import { ImageProcessingContext } from "../../../../../components/image_processing_context/image_processing_provider";

import styles from './image_processing_filter_control_panel.module.css'
import SliderBuilder, { Slider } from "../../../../../../../utils/ShaderCodes/postprocessingEffects/shaderNodes/sliderBuilder";
function ImageProcessingFilterControlPanel () {
    const {rendererRef, sliderMap, openFilterControl, setOpenFilterControl, setSliderMap, filterFuncRef, filterName} = useContext(ImageProcessingContext);
    
    const handleSliderChange = useCallback((key : string, newValue : number) => {
        setSliderMap(prev => updateSlider(prev, key, newValue))
    }, [setSliderMap]);

    function updateSlider(sliders : Record<string, Slider>, name : string, newValue : number ) : Record<string, Slider> {
        const oldSlider : Slider = sliders[name];
        const updatedSlider : Slider = new SliderBuilder(name)
            .min(oldSlider.min).max(oldSlider.max).step(oldSlider.step).value(newValue).build();
            return {...sliders, [name] : updatedSlider}
    }

    const handleClose =(() => {
        
        if (!rendererRef || !rendererRef.current) return;
        
        setOpenFilterControl(() => false);
        
        const renderer = rendererRef.current;
        
        renderer.currentTexture = renderer.holdCurrentTexture;

        renderer.renderScene();
        setSliderMap({});
    })

    const handleApply = (() => {
        if (!rendererRef || !rendererRef.current) return;

        setOpenFilterControl(() => false);

        const renderer = rendererRef.current;

        renderer.historyStack.add(renderer.currentTexture, renderer.img.naturalWidth,  renderer.img.naturalHeight);
        
        renderer.holdCurrentTexture = renderer.historyStack.getUndoStackTop(); // A new texture is born
        setSliderMap({});
    }) 


    useEffect (() => {
        const sliderMapCount : number = Object.entries(sliderMap).length; // prevents the filterFuncRef from triggering when sliderMap is no longer in use
        if (filterFuncRef.current && sliderMapCount > 0){
            filterFuncRef.current(sliderMap);
        }    
    }, [sliderMap])


    return (
        <div className={`${styles.filter_control_panel_container} ${openFilterControl ? styles.visible : styles.hidden}`}  >
            <div className={`${styles.filter_control_panel_title_container}`}>
                <span className={`${styles.filter_control_panel_title}`}>{filterName}</span>
                <button onClick={handleClose} className={`${styles.filter_control_panel_close_btn}`}> </button>
            </div>
            
            {Object.entries(sliderMap).map(([label, slider]) => (

                <ImageProcessingRangeSliders
                    key={label}
                    slider={slider}
                    onChange={(value : number) => handleSliderChange(label, value)}
                />

            ))}
            
            <button onClick={handleApply} className={`${styles.filter_control_panel_apply_btn}`}>Apply</button>
        </div>
    )
}

export default ImageProcessingFilterControlPanel;