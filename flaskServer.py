from flask import Flask
from flask import request
from flask import Response
import requests
import json
import backend
import cv2
import numpy as np
import base64
from io import BytesIO

class Server:
    def __init__(self,url):
        self.url = url
        self.app = Flask(__name__)
        self.app.add_url_rule("/", "home", self.hello_world, methods=["GET"])#set route to handle requests
        self.app.add_url_rule("/detect","detect",self.detect,methods=["POST","GET"])
        self.app.add_url_rule("/test","test",self.test,methods=["GET"])

    def hello_world(self):
        if request.method == "POST":
            print("hello world")
        return "<p>Hello, World!</p>"
    
    def detect(self): #function to handle the request, POST to this function with img: base64 encoded image or base64 str 

        if request.method == "POST":

            try:
                data = request.json["img"]
                print("data recieved")

            except KeyError:
                return Response(response=json.dumps({"error":"field \"img\" does not exist"}),status=400)
            
            if type(data) == bytes or type(data) == str:
                try:
                    file_bytes = np.asarray(bytearray(BytesIO(base64.b64decode(data)).read()), dtype=np.uint8)
                    img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)

                except Exception as e:
                    return Response(response=json.dumps({"invalid data":str(e)}),status=400) #check if the data is valid
                
            else:
                return Response(response=json.dumps({"error":"wrong data type"}),status=400) #wrong data type
            
            try:
                output = backend.run_process(img)
            except Exception as e:
                return Response(response=json.dumps({"error":str(e)}),status=500) #error handler for CV backend
            
            return {"output":output} #output is here
        
        else:
            return "<p>Hello, Detector!</p>" #GET request

    def run(self):#code to run flask server
        try:
            self.app.run(host="0.0.0.0",
                        port=int(self.url.split(":")[-1][:-1:]),
                        threaded=True,
                        debug=True)
            print("\033[0;35m" + f"\nlisten(GET): {url}" +"\n\033[0m")
        except OSError:
            print("bruh moment")
            exit()
    
    def test(self):#run by calling GET to http://127.0.0.1:5000/test 
                   #to test the server and the AI backened with a test image

        testPath =  "data/die.jpg" #path to test image, will not break if directory structure is not messed with
        with open(testPath, "rb") as image_file:
            data = base64.b64encode(image_file.read())

        r = requests.post("http://127.0.0.1:5000/detect", json={'img': data})

        if r.status_code == 200:
            return "<p>server and backend is working properly</p>"
        else:
            return "<p>check the backend</p>"

if __name__ == "__main__":
    url = "http://localhost:5000/"
    server = Server(url)
    server.run()
    print("server is closed")