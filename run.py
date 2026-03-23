from app import create_app

app = create_app()


@app.route("/")
def index():
    return app.send_static_file("index.html")


@app.route("/<path:filename>")
def static_files(filename):
    return app.send_static_file(filename)


if __name__ == "__main__":
    app.run(debug=True)
