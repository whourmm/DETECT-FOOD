"use client";
import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
import axios from "axios";

// Define the backend API URL (should match your server)
const API_URL = "http://127.0.0.1:3000";

const CaptureTest: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [backendResult, setBackendResult] = useState<string | null>(null);
  const [error, setError] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    // Start camera when component mounts
    startCamera();
    return () => {
      // Cleanup on unmount
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraActive(true);
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput"
      );

      // Select the first available camera
      const camera = videoDevices[0];
      if (camera) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: camera.deviceId,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 },
          },
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
        console.error("No cameras found");
        setError(true);
        setBackendResult("No camera devices found. Please check your permissions.");
        setShowResult(true);
      }
    } catch (error) {
      console.error("Error accessing the camera", error);
      setError(true);
      setBackendResult("Error accessing camera. Please check your permissions.");
      setShowResult(true);
    }
  };

  const sendToBackend = async () => {
    if (capturedImage) {
      setLoading(true);
      // Extract base64 data from image URL
      const base64Image = capturedImage.split(",")[1];

      try {
        const response = await axios.post(
          `${API_URL}/detect`,
          {
            image: base64Image,
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
            timeout: 30000, // 30 seconds timeout
          }
        );

        if (response.status === 200 && response.data.success) {
          setBackendResult(response.data.output);
          setError(false);
        } else {
          setBackendResult(response.data.error || "Unknown error occurred");
          setError(true);
        }
      } catch (error: any) {
        console.error("Error sending image to backend:", error);

        if (error.response && error.response.data) {
          setBackendResult(error.response.data.error || "Error processing request");
        } else if (error.code === "ECONNABORTED") {
          setBackendResult("Request timeout. The server took too long to respond.");
        } else {
          setBackendResult(error.message || "An unknown error occurred");
        }
        setError(true);
      } finally {
        setLoading(false);
        setShowResult(true);
      }
    }
  };

  const getAdvice = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_URL}/advice`,
        {
          timeout: 10000, // 10 seconds timeout
        }
      );

      if (response.status === 200 && response.data.success) {
        setBackendResult(response.data.output);
        setError(false);
      } else {
        setBackendResult(response.data.error || "Unknown error occurred");
        setError(true);
      }
    } catch (error: any) {
      console.error("Error getting advice:", error);
      setBackendResult(error.response?.data?.error || "Error getting advice");
      setError(true);
    } finally {
      setLoading(false);
      setShowResult(true);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");

      if (!context) {
        console.error("Failed to get canvas context.");
        return;
      }

      // Set canvas dimensions to match video feed
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      
      // Draw the current video frame to the canvas
      context.drawImage(
        videoRef.current,
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );

      // Get the image from the canvas
      const image = canvasRef.current.toDataURL("image/jpeg", 0.9);

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

  const resetCamera = () => {
    setCapturedImage(null);
    setShowResult(false);
    setBackendResult(null);
    setError(false);
    startCamera();
  };

  return (
    <div className="h-screen w-full bg-gray-100 flex flex-col items-center justify-center">
      <div className="relative flex justify-center mb-16">
        {capturedImage && !cameraActive && (
          <div className="relative flex flex-col items-center">
            <img
              src={capturedImage}
              alt="Captured"
              className="object-cover rounded-lg shadow-lg"
              style={{ width: "400px", height: "70vh" }}
            />
            <div className="flex space-x-4 mt-4">
              <button
                className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 font-bold rounded-lg transition-colors shadow-md"
                onClick={sendToBackend}
                disabled={loading}
              >
                {loading ? "Processing..." : "Analyze Food"}
              </button>
              <button
                className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 font-bold rounded-lg transition-colors shadow-md"
                onClick={getAdvice}
                disabled={loading}
              >
                Get Food Advice
              </button>
            </div>
          </div>
        )}
        {cameraActive && (
          <div className="relative flex flex-col items-center">
            <video
              ref={videoRef}
              className="object-cover rounded-lg shadow-lg"
              style={{ width: "400px", height: "70vh" }}
              autoPlay
              playsInline
            ></video>
          </div>
        )}
      </div>

      <div className="text-white bg-blue-400 h-16 font-bold w-full fixed bottom-0 rounded-t-3xl px-10 py-4 flex justify-center items-center">
        <div className="z-10 fixed bg-blue-500 w-20 h-20 p-4 bottom-4 left-1/2 transform -translate-x-1/2 rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:bg-blue-600 transition-colors">
          <Image
            src="/img/Camera.svg"
            alt="camera"
            width={40}
            height={40}
            className="z-50"
            onClick={cameraActive ? stopCamera : startCamera}
          />
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width="300"
        height="300"
        style={{ display: "none" }}
      ></canvas>

      {showResult && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4 text-center text-gray-800">
              {error ? "Error" : "Food Analysis"}
            </h2>
            <div className="max-h-64 overflow-y-auto mb-4 whitespace-pre-line">
              <p className="text-gray-700">{backendResult}</p>
            </div>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setShowResult(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={resetCamera}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                New Photo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaptureTest;