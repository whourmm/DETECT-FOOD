import axios from "axios";
import React, { useRef, useState } from "react";

const CameraCapture: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error("Error accessing the camera", error);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      if (context) {
        context.drawImage(
          videoRef.current,
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height
        );
        const imageData = canvasRef.current.toDataURL("image/png");
        setCapturedImage(imageData);
      }
    }
  };

  const sendToBackend = async () => {
    if (capturedImage) {
      try {
        const response = await axios.post(
          "http://your-backend-api.com/upload",
          {
            image: capturedImage,
          }
        );
        console.log("Image uploaded successfully", response.data);
      } catch (error) {
        console.error("Error uploading the image", error);
      }
    }
  };

  return (
    <div>
      <h1>Camera Capture</h1>
      <video ref={videoRef} width="300" height="300"></video>
      <button onClick={startCamera}>Start Camera</button>
      <button onClick={capturePhoto}>Capture Photo</button>
      <canvas
        ref={canvasRef}
        width="300"
        height="300"
        style={{ display: "none" }}
      ></canvas>
      {capturedImage && (
        <div>
          <img src={capturedImage} alt="Captured" />
          <button onClick={sendToBackend}>Upload to Backend</button>
        </div>
      )}
    </div>
  );
};

export default CameraCapture;
