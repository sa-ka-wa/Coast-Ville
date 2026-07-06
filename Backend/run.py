from App import create_app
from App.Extension import db
from App.Models import UserModel, ApartmentModel  # import your models if needed

app = create_app()

if __name__ == "__main__":
    app.run(port=5555, debug=True)
