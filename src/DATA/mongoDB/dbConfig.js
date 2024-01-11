import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config()


const URI = 'mongodb+srv://JuanManuelFilippetti:Mongodb333@cluster0.zyjymia.mongodb.net/bd?retryWrites=true&w=majority'
mongoose.connect(URI)
  .then(() => console.log('Conectado a la base de datos'))
  .catch((error) => {
    console.error('Error al conectar a la base de datos:', error);
  });