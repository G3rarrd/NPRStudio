import WebGLRenderer from "../../../../engine/Scene/webGLRender";
import { Slider } from "../../../../engine/ShaderCodes/postprocessingEffects/shaderNodes/sliderBuilder";

// type Dimensions = {width : number; height: number} | null;

export interface ImageProcessingContextProps {
    src : string | undefined;
    setSrc :React.Dispatch<React.SetStateAction<string | undefined>>;
    
    openFilterControl : boolean;
    setOpenFilterControl : React.Dispatch<React.SetStateAction<boolean>>;
    
    filterName : string;
    setFilterName : React.Dispatch<React.SetStateAction<string>>;

    sliderMap : Record<string, Slider>;
    setSliderMap : React.Dispatch<React.SetStateAction<Record<string, Slider>>>;
    
    imageError : string | null;
    setImageError : (error : string | null) => void;

    glCanvasRef : React.MutableRefObject<HTMLCanvasElement | null>;
    rendererRef : React.MutableRefObject<WebGLRenderer | null>;
    filterFuncRef : React.MutableRefObject<(configs: Record<string, Slider>) => void>;
}

export const defaultValue : ImageProcessingContextProps = {
    src : undefined,
    setSrc : () => {},

    openFilterControl : false,
    setOpenFilterControl : () => {},

    filterName : '',
    setFilterName : () => {},

    sliderMap : {},
    setSliderMap : ()=> {},

    imageError: null,
    setImageError : () => {},


    glCanvasRef :  { current: null },
    rendererRef :  { current: null },
    filterFuncRef : {
        current: () => {},
    } 
}