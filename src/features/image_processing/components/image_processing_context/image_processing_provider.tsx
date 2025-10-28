import { createContext, useState, ReactNode, useRef} from 'react';
import { ImageProcessingContextProps, defaultValue } from './image_processing_context';
import WebGLRenderer from '../../../../utils/Scene/webGLRender';
import { Slider } from '../../../../utils/ShaderCodes/postprocessingEffects/shaderNodes/sliderBuilder';

export const ImageProcessingContext : React.Context<ImageProcessingContextProps> = createContext<ImageProcessingContextProps>(defaultValue);

export const ImageProcessingProvider : React.FC<{children : ReactNode}> = ({children}) => {
    const [src, setSrc] = useState<string | undefined>(defaultValue.src);
    const [openFilterControl,setOpenFilterControl] = useState<boolean>(false);
    const [imageError, setImageError] = useState<string | null>(null);
    const [sliderMap, setSliderMap] = useState<Record<string, Slider>>({});
    const [filterName, setFilterName] = useState<string>('');

    const glCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const rendererRef = useRef<WebGLRenderer | null>(null);
    
    const filterFuncRef = useRef<(configs: Record<string, Slider>) => void>(() => {});


    const providerValue = {
        setSrc,
        src,

        filterName,
        setFilterName,

        openFilterControl,
        setOpenFilterControl,

        sliderMap,
        setSliderMap,

        imageError,
        setImageError, 


        glCanvasRef, 
        rendererRef,
        filterFuncRef,
    };
    
    return (
        <ImageProcessingContext.Provider value={providerValue}>
            {children}
        </ImageProcessingContext.Provider>
    )
}