import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
// import ImageProcessingIndex from './features/image_processing/image_processing_index';
import Home from './pages/homes';
import { Studio } from './pages/studio';
import NoPage from './pages/noPage';

function App() {

  return (
    <>
    <BrowserRouter>
      <Routes>
        <Route index element={<Studio/>} />
        {/* <Route path="/home" element={<Home/>} /> */}
        <Route path="/studio" element={<Studio/>} />
        <Route path="*" element={<NoPage/>} />
      </Routes>
    </BrowserRouter>
    </>
  )
}

export default App
