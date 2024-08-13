"use client";
import axios from "axios";
import React, { useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";

const CameraCapture: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoIsShow, setVideoIsShow] = useState<Boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        setVideoIsShow(true);
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
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context?.drawImage(
        videoRef.current,
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );
      setCapturedImage(canvasRef.current.toDataURL("image/png"));
      stopCamera();
    }
  };
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream; // Type assertion
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
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
    <div className="">
      <div className="p-5 text-white bg-blue-500 h-[10vh] font-bold text-2xl flex items-center justify-start">
        <FontAwesomeIcon icon={faArrowLeft} className="mr-10" />
        CAPTURE TEST
      </div>
      <div className="relative flex justify-center mt-[10vh]">
        <div className="relative z-50 w-[80vw] h-[50vh] border-[0.8vh] border-green-500 p-4 rounded-[1vh]">
          {/* Ensure the content div has relative positioning */}
        </div>
        {/* <div className="overlay-outside"></div> */}
        <video
          ref={videoRef}
          width="300"
          height="300"
          className="absolute w-full h-full z-10 object-cover"
        ></video>
      </div>
      <h1 className="z-50 relative flex justify-center bg-white mt-10 font-bold text-[2vh]">
        See your results
      </h1>
      <div className="z-50 relative flex justify-center space-x-4 mt-4">
        <button
          onClick={startCamera}
          className="bg-blue-500 text-white p-2 rounded-md"
        >
          Start Camera
        </button>
        <button onClick={capturePhoto}>Capture Photo</button>
      </div>
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
