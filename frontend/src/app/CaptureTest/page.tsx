"use client";
import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
import axios from "axios";

const CaptureTest: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch((error) => {
            console.error("Error playing the video", error);
          });
        };
        videoRef.current.onplay = () => {
          console.log("Video is playing");
        };
        setCapturedImage(null);
      }
    } catch (error) {
      console.error("Error accessing the camera", error);
    }
  };
  const sendToBackend = async () => {
    if (capturedImage) {
      // Remove the 'data:image/png;base64,' prefix
      const base64Image = capturedImage.split(",")[1];

      try {
        const response = await axios.post(
          "http://127.0.0.1:5000/detect", // Your Python backend URL
          {
            image: base64Image, // Send only the base64-encoded image data
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        console.log("Image uploaded successfully", response.data);
      } catch (error) {
        console.error("Error uploading the image", error);
      }
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");

      if (!context) {
        console.error("Failed to get canvas context.");
        return;
      }

      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;

      // Check video dimensions
      console.log(
        "Video dimensions:",
        videoRef.current.videoWidth,
        videoRef.current.videoHeight
      );

      // Draw the video frame onto the canvas
      context.drawImage(
        videoRef.current,
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );

      // Generate data URL
      const image = canvasRef.current.toDataURL("image/png");

      // Check data URL length
      console.log("Data URL length:", image.length);
      console.log("Data URL:", image);

      if (image.length > 0) {
        setCapturedImage(image);
      } else {
        console.error("Failed to generate image data URL.");
      }
    } else {
      console.error("Video or canvas reference is null.");
    }
  };

  const stopCamera = () => {
    capturePhoto();
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
  };

  return (
    <div>
      <div className="relative flex justify-center ">
        {capturedImage && !cameraActive && (
          <div className="relative  w-[100vw] h-[100vh] flex flex-col items-center">
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-full object-cover"
            />
            <button
              className="fixed bottom-[20vh] bg-white px-8 py-3 font-bold rounded-[5vh]"
              onClick={sendToBackend}
            >
              {" "}
              See your result
            </button>
          </div>
        )}
        {cameraActive && (
          <div className="relative w-[100vw] h-[100vh] flex flex-col items-center">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
            ></video>
          </div>
        )}
      </div>

      <div className="text-white bg-[#B7E3FE] h-[10vh] font-bold w-full fixed bottom-0 rounded-t-[5vh] px-10 py-10 flex justify-center items-center">
        <Image
          src={"/img/Camera.svg"}
          alt="cover"
          width={80}
          height={80}
          className="z-50 mb-5"
          onClick={cameraActive ? stopCamera : startCamera}
        />

        <div className="z-10 fixed bg-[#B7E3FE] w-[25vw] h-[25vw] p-5 bottom-[1vh] left-1/2 transform -translate-x-1/2 rounded-[10vh]"></div>
      </div>

      <canvas
        ref={canvasRef}
        width="300"
        height="300"
        style={{ display: "none" }}
      ></canvas>
    </div>
  );
};

export default CaptureTest;
