from PIL import Image

def remove_bg_and_resize(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    datas = img.getdata()

    new_data = []
    for item in datas:
        # Check if the pixel is black or very dark (r < 10, g < 10, b < 10)
        if item[0] < 15 and item[1] < 15 and item[2] < 15:
            new_data.append((255, 255, 255, 0)) # transparent
        else:
            new_data.append(item)

    img.putdata(new_data)
    
    # Resize to 512x512
    img = img.resize((512, 512), Image.Resampling.LANCZOS)
    img.save(output_path, "PNG")

input_file = r"C:\Users\baba\.gemini\antigravity-ide\brain\d3a4fdea-d497-418f-9144-69c3d8f68505\.user_uploaded\media_1790261247606.png"
output_file = r"C:\Users\baba\Desktop\udba\public\logo.png"

remove_bg_and_resize(input_file, output_file)
print("Image processed successfully.")
