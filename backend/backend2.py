import numpy as np
import cv2
import os
import tempfile
import matplotlib.pyplot as plt
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
import pandas as pd
import time

# Gemini AI integration
from langchain_core.prompts import ChatPromptTemplate
from langchain.output_parsers import ResponseSchema, StructuredOutputParser
from langchain_google_genai import ChatGoogleGenerativeAI

# Initialize model
def initialize_model():
    # Check if model exists, otherwise download it
    model_path = 'vgg_tune_model.h5'
    if not os.path.exists(model_path):
        import gdown
        file_id = "1ZAugiwySVQxz7WJogd3eRJOU76uWRILZ"
        gdown.download(f"https://drive.google.com/uc?id={file_id}", model_path)
    
    # Load the model
    model = load_model(model_path)
    return model

# Global variables
model = initialize_model()
class_names = ['Burger', 'Kapao', 'Soup', 'Salad', 'PorkFriedRice', 'Steak', 'KhaoTomGoong', 'Noodles', 'Chicken-Rice']
history_df = pd.DataFrame()

# -------------------- SCHEMA --------------------
nutrition_schema = [
    ResponseSchema(name="Food name", description="Name of the food (No Additional explanation)"),
    ResponseSchema(name="Calories(kcal)", description="Calories of the food in kcal"),
    ResponseSchema(name="Fat(g)", description="Fat in grams"),
    ResponseSchema(name="Protein(g)", description="Protein in grams"),
    ResponseSchema(name="Carbohydrates(g)", description="Carbohydrates in grams"),
]

advice_schema = [
    ResponseSchema(name="Food name", description="Name of the recommended food (No Additional explanation)"),
    ResponseSchema(name="Reasons", description="Reasons why this food is recommended"),
]

nutrition_parser = StructuredOutputParser.from_response_schemas(nutrition_schema)
advice_parser = StructuredOutputParser.from_response_schemas(advice_schema)

# -------------------- PROMPTS --------------------
prompt_nutrition = ChatPromptTemplate.from_template("""
You are an AI that answers nutrition information about food (only numbers value for nutrition).

Answer ONLY in this JSON format:
{nutrition_format}

Food name: {input}
""")

prompt_advice = ChatPromptTemplate.from_template("""
You are an AI that gives meal advice based on user history.

Here is the history of foods the user ate:
{history}

Step 1: List all food names above → These are FORBIDDEN for recommendation.
Step 2: Think about what nutrients user ate too much or too little.
Step 3: Recommend a NEW dish not in history (very common dish that even children know).

Answer ONLY in this JSON format:
{advice_format}
""")

def predict_food(img):
    """Predict food class from image"""
    # Save image to temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp_file:
        temp_path = tmp_file.name

    cv2.imwrite(temp_path, img)
    
    # Process image
    img_data = image.load_img(temp_path, target_size=(150, 150))
    img_array = image.img_to_array(img_data) / 255.0
    img_array = np.expand_dims(img_array, axis=0)
    
    # Predict
    preds = model.predict(img_array)
    idx = np.argmax(preds)
    confidence = preds[0][idx]
    
    # Clean up
    os.remove(temp_path)
    
    return class_names[idx], confidence

def get_nutrition_info(food_name, api_key):
    """Get nutrition information for a food item"""
    global history_df
    
    # Initialize Gemini AI
    llm = ChatGoogleGenerativeAI(
        google_api_key=api_key,
        model="gemini-2.0-flash",
        temperature=0
    )
    
    nutrition_chain = prompt_nutrition | llm
    
    # Get nutrition information
    response = nutrition_chain.invoke({
        "input": food_name,
        "nutrition_format": nutrition_parser.get_format_instructions()
    })
    
    parsed_data = nutrition_parser.parse(response.content)
    
    # Update history
    df = pd.DataFrame([parsed_data])
    history_df = pd.concat([history_df, df], ignore_index=True)
    
    return parsed_data

def get_advice(api_key):
    """Get food advice based on history"""
    global history_df
    
    # Initialize Gemini AI
    llm = ChatGoogleGenerativeAI(
        google_api_key=api_key,
        model="gemini-2.0-flash",
        temperature=0
    )
    
    advice_chain = prompt_advice | llm
    
    # Get history text
    history_text = ""
    for _, row in history_df.tail(3).iterrows():
        history_text += f'{row["Food name"]}\n'
    
    # Get valid advice
    def get_valid_advice():
        while True:
            response = advice_chain.invoke({
                "history": history_text,
                "advice_format": advice_parser.get_format_instructions()
            })
            
            parsed_data = advice_parser.parse(response.content)
            recommended_dish = parsed_data["Food name"].strip()
            
            if recommended_dish in history_df["Food name"].values:
                time.sleep(1)
                continue
            else:
                return parsed_data
    
    if history_df.empty:
        return {"Food name": "No history yet", "Reasons": "Please scan some food first."}
    
    return get_valid_advice()

def run_process(img, operation="predict", api_key="AIzaSyC2Ub6OCsfQ7A0xHJETCS6fpzjaYFC_Cdw"):
    """Main function to process the image"""
    if operation == "predict":
        # Convert BGR to RGB for the model
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        food_name, confidence = predict_food(img_rgb)
        
        # Get nutrition information if API key is provided
        if api_key:
            nutrition_info = get_nutrition_info(food_name, api_key)
            return {
                "food_name": food_name,
                "confidence": float(confidence),
                "nutrition": nutrition_info
            }
        else:
            return {
                "food_name": food_name,
                "confidence": float(confidence)
            }
    
    elif operation == "advice":
        if api_key:
            advice = get_advice(api_key)
            return {"advice": advice}
        else:
            return {"error": "API key required for advice"}
    
    else:
        return {"error": "Invalid operation"}