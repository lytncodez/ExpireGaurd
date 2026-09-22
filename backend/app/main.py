from fastapi import FastAPI
app = FastAPI (title = "ExpireGaurd API")

@app.get("/")
def root():
    return {
        "message": "ExpireGaurd API is resting"
    }