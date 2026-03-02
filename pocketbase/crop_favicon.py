from PIL import Image

def crop_transparent(image_path, output_path):
    img = Image.open(image_path)
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    # Get the bounding box of the non-transparent alpha channel
    bbox = img.getbbox()
    if bbox:
        cropped_img = img.crop(bbox)
        # Create a square image by padding the cropped image equally, or just save the cropped image
        # Browsers will scale it to fit. Let's make it square
        width, height = cropped_img.size
        new_size = max(width, height)
        
        # Center the image in the new square
        new_img = Image.new('RGBA', (new_size, new_size), (0, 0, 0, 0))
        new_img.paste(cropped_img, ((new_size - width) // 2, (new_size - height) // 2))
        
        new_img.save(output_path)
        print(f"Saved cropped and squared icon to {output_path}")
    else:
        print("Image is entirely transparent")

crop_transparent('public/logo.png', 'public/favicon.png')
