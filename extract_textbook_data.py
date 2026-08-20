import os
import glob
import base64
import json
import urllib.request
import urllib.error

def main():
    print("=== Textbook Video Data Extractor ===")
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY environment variable is not set!")
        return

    frames_dir = "/home/user/Downloads/IMG_0990_frames"
    frame_files = sorted(glob.glob(os.path.join(frames_dir, "frame_*.jpg")))
    
    if not frame_files:
        print(f"Error: No frame files found in {frames_dir}!")
        return
        
    print(f"Found {len(frame_files)} frames. Preparing batch for Gemini API...")
    
    # We will send the frames in batches of 33 frames
    batch_size = 33
    batches = [frame_files[i:i + batch_size] for i in range(0, len(frame_files), batch_size)]
    
    all_extracted_data = []
    
    for idx, batch in enumerate(batches):
        print(f"\nProcessing Batch {idx+1}/{len(batches)} ({len(batch)} frames)...")
        
        parts = []
        # Add the instruction part
        instruction = (
            "You are an expert textbook OCR analyzer. "
            "Here is a sequence of images extracted from a video where a user is flipping the pages of a math textbook ('よくわかる高校数学Ⅱ問題集'). "
            "Please analyze these images in chronological order to reconstruct the page-to-unit mapping of the textbook. "
            "Look closely at the page numbers (often visible at the corners) and the topic headings on each page. "
            "Extract a list of mappings. For each page or page range identified in this batch, return: "
            "- page: The page number (integer, or range like '54-55') "
            "- unit: The main unit/chapter name (e.g., '三角関数', '指数・対数関数', '微分法と積分法', '複素数と方程式', '図形と方程式', '式と証明') "
            "- topic: The specific section or topic heading on that page "
            "- difficulty: Difficulty estimate (1 = Basic, 2 = Standard, 3 = Advanced, based on question level or star ratings if visible) "
            "- question_count: Estimated number of questions on that page (if visible, otherwise null) \n\n"
            "Return the output STRICTLY as a raw JSON array of objects. Example: "
            '[{"page": "45", "unit": "図形と方程式", "topic": "点と直線の距離", "difficulty": 2, "question_count": 4}]'
        )
        parts.append({"text": instruction})
        
        # Add each image in the batch
        for frame_path in batch:
            try:
                with open(frame_path, "rb") as f:
                    img_data = base64.b64encode(f.read()).decode("utf-8")
                parts.append({
                    "inlineData": {
                        "mimeType": "image/jpeg",
                        "data": img_data
                    }
                })
            except Exception as e:
                print(f"Failed to read {frame_path}: {e}")
                
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={api_key}"
        
        payload = {
            "contents": [
                {
                    "parts": parts
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        }
        
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        
        try:
            with urllib.request.urlopen(req) as res:
                response_data = res.read().decode("utf-8")
                result_json = json.loads(response_data)
                text_response = result_json["candidates"][0]["content"]["parts"][0]["text"]
                
                # Parse the JSON response
                batch_data = json.loads(text_response.strip())
                print(f"Batch {idx+1} successfully parsed! Found {len(batch_data)} page mappings.")
                all_extracted_data.extend(batch_data)
        except urllib.error.HTTPError as he:
            print(f"HTTP Error {he.code}: {he.read().decode('utf-8')}")
        except Exception as e:
            print(f"Error calling API for batch {idx+1}: {e}")
            
    # Save the consolidated mapping list to a JSON file
    output_path = "/home/user/Documents/projects/math-diagnostic-tool/textbook_mapping.json"
    with open(output_path, "w", encoding="utf-8") as out_f:
        json.dump(all_extracted_data, out_f, ensure_ascii=False, indent=2)
        
    print(f"\n=== Completed! ===")
    print(f"Saved {len(all_extracted_data)} total mappings to {output_path}")

if __name__ == "__main__":
    main()
