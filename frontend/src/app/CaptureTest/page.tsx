"use client";
import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
import axios, { AxiosError } from "axios";
import { stringifyError } from "next/dist/shared/lib/utils";

const CaptureTest: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [showResult, setShowResult] = useState(false); // State to show/hide popup
  const [backendResult, setBackendResult] = useState<string | null>(null); // State to store the backend result
  const [error, setError] = useState<boolean>(false); // State to track if an error occurred

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraActive(true);
    try {
      // List available media devices
      const devices = await navigator.mediaDevices.enumerateDevices();

      // Filter for video input devices
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput"
      );

      // Log the video devices to see available options
      console.log("Available video devices:", videoDevices);

      // Assuming the external camera is the second video input device
      const externalCamera = videoDevices[0];
      if (externalCamera) {
        // Get the stream from the external camera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: externalCamera.deviceId },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch((error) => {
              console.error("Error playing the video", error);
            });
          };
          setCapturedImage(null);
        }
      } else {
        console.error("External camera not found");
      }
    } catch (error) {
      console.error("Error accessing the camera", error);
    }
  };

  const sendToBackend = async () => {
    if (capturedImage) {
      const base64Image = capturedImage.split(",")[1]; // Remove the prefix

      try {
        const response = await axios.post(
          "http://127.0.0.1:3000/detect", // Your Python backend URL
          {
            image: base64Image, // Send only the base64-encoded image data
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (response.status === 200) {
          setBackendResult(response.data.output); // Store the backend result
          setError(false); // No error
        } else {
          setBackendResult(response.data.error || "Unknown error occurred"); // Custom error message
          setError(true); // Mark as error
        }
      } catch (error: any) {
        console.error("Error uploading the image", error);

        // Handle backend error or network error
        if (
          error.response &&
          error.response.data &&
          error.response.data.error
        ) {
          // Backend returned an error
          setBackendResult(error.response.data.error);
        } else {
          // Network or unexpected error
          setBackendResult(error.message || "An unknown error occurred");
        }

        setError(true); // Mark as error
      } finally {
        setShowResult(true); // Show the popup regardless of success or error
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
      context.drawImage(
        videoRef.current,
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );

      const image = canvasRef.current.toDataURL("image/png");

      if (image.length > 0) {
        setCapturedImage(image);
      } else {
        console.error("Failed to generate image data URL.");
      }
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
      <div className="relative flex justify-center">
        {capturedImage && !cameraActive && (
          <div className="relative w-[100vw] h-[100vh] flex flex-col items-center">
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-full object-cover"
            />
            <button
              className="fixed bottom-[20vh] bg-white px-8 py-3 font-bold rounded-[5vh]"
              onClick={sendToBackend}
            >
              See your result
            </button>
          </div>
        )}
        {cameraActive && (
          <div className="relative w-[400px] h-[100vh] flex flex-col items-center">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
            ></video>
          </div>
        )}
      </div>

      <div className="text-white bg-[#B7E3FE] h-[50px] font-bold w-full fixed bottom-0 rounded-t-[5vh] px-10 py-10 flex justify-center items-center">
        <Image
          src={"/img/Camera.svg"}
          alt="cover"
          width={80}
          height={80}
          className="z-50 mb-5"
          onClick={cameraActive ? stopCamera : startCamera}
        />
        <div className="z-10 fixed bg-[#B7E3FE] w-[100px] h-[100px] p-5 bottom-[1vh] left-1/2 transform -translate-x-1/2 rounded-[10vh]"></div>
      </div>

      <canvas
        ref={canvasRef}
        width="300"
        height="300"
        style={{ display: "none" }}
      ></canvas>

      {/* Popup modal */}
      {showResult && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="flex flex-col bg-white p-6 rounded-lg shadow-lg justify-center">
            <h2 className="text-2xl font-bold mb-4 text-center">
              {error ? "Cannot found the test" : "Result"}
            </h2>
            <p>{backendResult}</p>
            <button
              onClick={() => {
                setShowResult(false);
              }}
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded mx-20"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaptureTest;
