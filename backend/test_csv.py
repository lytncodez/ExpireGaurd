import requests

# Open the CSV file
with open(r"C:\Users\Lenovo\Desktop\products.csv", "rb") as f:
    files = {"file": f}
    response = requests.post("http://localhost:8000/imports/csv", files=files)
    print(response.json())