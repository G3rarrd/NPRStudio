import { ImageProcessingContext} from "./components/image_processing_context/image_processing_provider";

import ImageUploadArea from './components/image_processing_upload/image_processing_upload_area';

import './image_processing_index.css'
import ImageProcessingMenuBar from "./image_processing_menu_bar/components/image_processing_menu_bar";
import ImageProcessingFilterControlPanel from "./image_processing_menu_bar/components/image_processing_filter_btn/components/image_processing_filter_control_panel/image_processing_filter_control_panel";
import ImageProcessingCanvas from "./image_processing_canvas/image_processing_canvas";
import { useContext } from "react";

function ImageProcessingIndex () {
    const {src} = useContext(ImageProcessingContext);
    // console.log(src)
    return (
        <>
            <ImageProcessingMenuBar/>
            <ImageProcessingFilterControlPanel/>
            {src ? <ImageProcessingCanvas/> : <ImageUploadArea/>}
        </>
    )
}

export default ImageProcessingIndex;