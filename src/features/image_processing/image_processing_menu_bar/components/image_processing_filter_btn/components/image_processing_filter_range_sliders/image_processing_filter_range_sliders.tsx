import { Slider } from '../../../../../../../engine/ShaderCodes/postprocessingEffects/shaderNodes/sliderBuilder';
import styles from './image_processing_filter_range_sliders.module.css';
import React from 'react';

interface SliderActionProps {
    slider : Slider,
    onChange : (value : number) => void,
}


const  ImageProcessingRangeSliders : React.FC<SliderActionProps> = ({slider, onChange}) => {
    const progressBarLength : number = ((slider.value - slider.min) / (slider.max - slider.min) ) * 100;

    return (
        <div className={`${styles.range_slider_container}`}>
            <span style={{width : `${progressBarLength}%`}} className={`${styles.progress_bar}`}></span>
            <label className={`${styles.slider_label}`} htmlFor={slider.name}>{slider.name} : {slider.value}</label>
            <input 
                id={slider.name}
                type='range'
                min={slider.min}
                max={slider.max}
                value={slider.value}
                step={slider.step}
                onChange={(e : React.ChangeEvent<HTMLInputElement>) => onChange(Number(e.target.value))}
                className={`${styles.slider}`}
            />
        </div>
    );
}

export default React.memo(ImageProcessingRangeSliders);