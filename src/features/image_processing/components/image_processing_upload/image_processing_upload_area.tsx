import React, { useContext, useRef} from "react";
import { ImageProcessingContext } from "../image_processing_context/image_processing_provider";
// import ImageProcessingCanvas from "../../../../image_processing_canvas/image_processing_canvas";
import './image_processing_upload_area.css';
import useUpload from "../../../../hooks/useUpload";

function ImageUploadArea () {
    const {src, imageError} = useContext(ImageProcessingContext);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imgIconSrc = "src/assets/76S0MOdD.png";
    const {handleUpload} = useUpload();


    const handleClick = () : void => {
        fileInputRef.current?.click();
    }
    
    if (imageError) {
        return (
            <p>
                ERROR!!!
            </p>
        )
    }

    return (
        <div className="image_upload_container">
        <div className="image_upload_div"onClick={handleClick} > 
            <img className="imgIcon" src={imgIconSrc} alt="imgIcon"/>
            <p>Drop your image here, or <button className='browseBtn'><b>browse</b></button></p>
        </div>
        
        <input 
            type="file" 
            ref={fileInputRef} 
            onChange={(e : React.ChangeEvent<HTMLInputElement>) => handleUpload(e)} 
            style={{display: 'none'}} 
            accept="image/*"
            />
    </div>
    )
}

export default ImageUploadArea;