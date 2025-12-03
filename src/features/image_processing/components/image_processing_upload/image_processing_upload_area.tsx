import React, { useContext, useRef} from "react";
import { ImageProcessingContext } from "../image_processing_context/image_processing_provider";
import './image_processing_upload_area.css';
import useUpload from "../../../../hooks/useUpload";
import icon from "/src/assets/76S0MOdD.png";

function ImageUploadArea () {
    const {imageError} = useContext(ImageProcessingContext);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
            <img className="imgIcon" src={icon} alt="imgIcon"/>
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