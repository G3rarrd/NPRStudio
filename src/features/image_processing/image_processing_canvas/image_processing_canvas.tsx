import React, { useContext, useEffect} from 'react';
import { ImageProcessingContext } from '../components/image_processing_context/image_processing_provider';

import './image_processing_canvas.css';
import useWebGL2DScene from './hooks/useWebGL2DCamera';



const ImageProcessingCanvas = () => {
    // const srcCanvasRef = useRef<HTMLCanvasElement | null>(null);

    const { glCanvasRef} = useContext(ImageProcessingContext);
    const {handleWheel, handleMouseDown, handleMouseUp, handleMouseMove} = useWebGL2DScene();
    // const [scale, setScale] = useState<number>(1);
    // const [errorText, setErrorText] = useState<string>('');
    useEffect(() => {
        const canvas = glCanvasRef.current;
        if (!canvas) return;

        const handler = (e: WheelEvent) => {
            e.preventDefault();      
        };

        canvas.addEventListener("wheel", handler, { passive: false });

        return () => {
            canvas.removeEventListener("wheel", handler);
        };
        }, []);
    return (
    <>
        {/* <canvas onClick={downloadCanvas} className="image_processing_canvas" ref={srcCanvasRef}></canvas> */}
        <div className='image_processing_canvas_container'>
            <canvas className="image_processing_webgl" 
            ref={glCanvasRef} 
            onWheel={(e: React.WheelEvent<HTMLCanvasElement>) => handleWheel(e)}
            onMouseDown={(e: React.WheelEvent<HTMLCanvasElement>) => handleMouseDown(e)}
            onMouseMove={(e: React.WheelEvent<HTMLCanvasElement>) => handleMouseMove(e)}
            onMouseUp={() => handleMouseUp()}
        >

        </canvas>
        </div>
        
    </>
    );
}

export default ImageProcessingCanvas;