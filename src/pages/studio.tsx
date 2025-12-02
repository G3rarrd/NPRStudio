import { ImageProcessingProvider } from "../features/image_processing/components/image_processing_context/image_processing_provider";
import ImageProcessingIndex from "../features/image_processing/image_processing_index";
import ImageProcessingPageLayout from "../layouts/image_processing_layout/image_processing_page_layout";

export function Studio() {
    return (
        <ImageProcessingPageLayout>
            <ImageProcessingProvider>
                <ImageProcessingIndex/>
            </ImageProcessingProvider>
        </ImageProcessingPageLayout>
    )
}