from flask import Flask
from flask import request
import json
import backend
import cv2

class Server:
    def __init__(self,url):
        self.url = url
        self.app = Flask(__name__)
        self.app.add_url_rule("/", "home", self.hello_world, methods=["GET"])#set route to handle requests
        self.app.add_url_rule("/detect","detect",self.detect,methods=["POST","GET"])#handles for each function

    def hello_world(self):
        if request.method == "POST":
            print("hello world")
        return "<p>Hello, World!</p>"
    
    def detect(self):
        if request.method == "POST":

            print(request.get_json()["img"])
            img = cv2.imread(request.get_json()["img"])
            # print(self.app.request_class.method)
            output = backend.run_process(img)
        return {"output":output}

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

if __name__ == "__main__":
    img = cv2.imread(r"data/die.jpg")
    url = "http://localhost:5000/"
    server = Server(url)
    server.run()
    print("server is closed")