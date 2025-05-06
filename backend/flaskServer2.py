from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import base64
from io import BytesIO
import os
import sys
import json
from dotenv import load_dotenv
load_dotenv()

# Import the backend2 module
import backend2

class Server:
    def __init__(self, url):
        self.url = url
        self.app = Flask(__name__)
        # Enable CORS for the React frontend
        CORS(self.app, resources={r"/*": {"origins": "*"}})
        
        # Set up routes
        self.app.add_url_rule("/", "home", self.hello_world, methods=["GET"])
        self.app.add_url_rule("/detect", "detect", self.detect, methods=["POST", "GET"])
        self.app.add_url_rule("/test", "test", self.test, methods=["GET"])
        self.app.add_url_rule("/advice", "advice", self.advice, methods=["GET"])
        
        # Get API key from environment variables or set a default for testing
        self.api_key = os.environ.get('GOOGLE_API_KEY')
        print(f"Server initialized with API endpoint: {self.url}")

    def hello_world(self):
        """Simple endpoint to check if the server is running"""
        return jsonify({"status": "success", "message": "Food recognition API is running"})

    def detect(self):
        """Endpoint to handle food detection from images"""
        if request.method == "POST":
            try:
                print("Receiving image data...")
                # Extract base64 image data from the request
                if not request.json or 'image' not in request.json:
                    return jsonify({"success": False, "error": "Missing image data"}), 400
                
                data = request.json["image"]
                print("Base64 data received, processing...")
                
                # Decode the base64 image
                try:
                    img_bytes = base64.b64decode(data)
                    file_bytes = np.asarray(bytearray(BytesIO(img_bytes).read()), dtype=np.uint8)
                    img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
                    
                    if img is None:
                        raise ValueError("Image decoding failed. The image data may be corrupt.")
                    print("Image decoded successfully.")
                except Exception as e:
                    print(f"Error decoding image: {str(e)}")
                    return jsonify({"success": False, "error": f"Invalid image data: {str(e)}"}), 400

                # Process the image with backend2
                try:
                    result = backend2.run_process(img, "predict", self.api_key)
                    
                    # Format the output for frontend display
                    formatted_output = self._format_output(result)
                    print("Food recognition completed successfully.")
                    
                    return jsonify({"success": True, "output": formatted_output}), 200
                except Exception as e:
                    print(f"Error in backend processing: {str(e)}")
                    return jsonify({"success": False, "error": f"Processing error: {str(e)}"}), 500
            
            except Exception as e:
                print(f"Unexpected error: {str(e)}")
                return jsonify({"success": False, "error": f"Server error: {str(e)}"}), 500
        else:
            # Handle GET request - just return a simple message
            return jsonify({"message": "Send a POST request with a base64 encoded image to detect food"})

    def _format_output(self, result):
        """Format the backend result for better frontend display"""
        try:
            food_name = result.get("food_name", "Unknown")
            confidence = result.get("confidence", 0)
            nutrition = result.get("nutrition", {})
            
            # Create a human-readable output
            formatted_text = f"Detected: {food_name} (Confidence: {confidence:.2f})\n\n"
            formatted_text += "Nutritional Information:\n"
            
            if nutrition:
                for key, value in nutrition.items():
                    if key != "Food name":  # Skip redundant food name
                        formatted_text += f"• {key}: {value}\n"
            
            return formatted_text
        except Exception as e:
            print(f"Error formatting output: {str(e)}")
            return str(result)  # Fallback to string representation

        
    def advice(self):
        """Endpoint to get food advice based on history"""
        try:
            # Get advice data from backend
            advice_data = backend2.run_process(None, "advice", self.api_key)
            
            # Check if advice_data is valid and has the expected structure
            if not advice_data or not isinstance(advice_data, dict):
                return jsonify({"success": False, "error": "Invalid response from backend"}), 400
            
            # Format the advice data for better display
            if "advice" in advice_data and advice_data["advice"]:
                advice = advice_data["advice"]
                # Handle potential missing keys with get() method and default values
                food_name = advice.get('Food name', 'No recommendation')
                reasons = advice.get('Reasons', 'No specific reason provided.')
                
                formatted_advice = f"Recommended: {food_name}\n\n"
                formatted_advice += f"Why: {reasons}"
                
                return jsonify({"success": True, "output": formatted_advice}), 200
            else:
                return jsonify({"success": False, "error": "Could not generate advice"}), 400
        except ValueError as json_err:
            # Specific handling for JSON parsing errors
            print(f"JSON parsing error: {str(json_err)}")
            return jsonify({"success": False, "error": f"Invalid JSON response: {str(json_err)}"}), 400
        except Exception as e:
            # General error handling
            print(f"Error generating advice: {str(e)}")
            return jsonify({"success": False, "error": str(e)}), 400

    def test(self):
        """Test endpoint to verify backend integration"""
        try:
            # Path to test image - make sure this exists in your project
            test_path = "./test2.jpg"
            
            # Check if the test image exists
            if not os.path.exists(test_path):
                return jsonify({"success": False, "error": f"Test image not found at {test_path}"}), 404
            
            # Read and encode test image
            with open(test_path, "rb") as image_file:
                img_data = base64.b64encode(image_file.read()).decode('utf-8')
            
            # Process the test image directly
            img_bytes = base64.b64decode(img_data)
            file_bytes = np.asarray(bytearray(BytesIO(img_bytes).read()), dtype=np.uint8)
            img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
            
            if img is None:
                return jsonify({"success": False, "error": "Test image could not be decoded"}), 400
            
            # Run detection on the test image
            result = backend2.run_process(img, "predict", self.api_key)
            formatted_result = self._format_output(result)
            
            return jsonify({
                "success": True, 
                "message": "Server and backend2 are working properly",
                "test_result": formatted_result
            }), 200
            
        except Exception as e:
            print(f"Test failed: {str(e)}")
            return jsonify({"success": False, "error": f"Test failed: {str(e)}"}), 500

    def run(self):
        """Run the Flask server"""
        try:
            # Parse host and port from the URL
            parts = self.url.split(":")
            host = parts[1].strip("/")
            port = int(parts[2].strip("/")) if len(parts) > 2 else 3000
            
            print(f"\n\033[0;35mStarting server at {self.url}\033[0m")
            self.app.run(host=host if host else "0.0.0.0", 
                         port=port,
                         threaded=True,
                         debug=True)
        except OSError as e:
            print(f"Server error: {str(e)}")
            print("Port may already be in use. Try a different port.")
            sys.exit(1)
        except Exception as e:
            print(f"Unexpected error: {str(e)}")
            sys.exit(1)

app = Server("http://0.0.0.0:3000/").app

if __name__ == "__main__":
    # Default URL
    url = "http://127.0.0.1:3000/"
    
    # Allow command line override of the URL
    if len(sys.argv) > 1:
        url = sys.argv[1]
        if not url.endswith('/'):
            url += '/'
    
    server = Server(url)
    server.run()
    print("Server has been shut down.")