import express from 'express';     
import { MongoProductManager } from './DATA/DAOs/productsMongo.dao.js';
import productsRouter from './routes/products.router.js';
import cartsRouter from './routes/carts.router.js';
import crypto from 'crypto';
import { __dirname } from './bcrypt-helper.js';
import handlebars from 'express-handlebars';
import viewsRouter from './routes/views.router.js';
import { Server } from 'socket.io';
import './DATA/mongoDB/dbConfig.js';
import { Message } from './DATA/mongoDB/models/messages.models.js';
import sessionRouter from './routes/sessions.router.js';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import './services/passport/passportStrategies.js'
import { isUser } from './middlewares/auth.middlewares.js'
import session from 'express-session';
import FileStore  from 'session-file-store';
import MongoStore from 'connect-mongo';
import config from './config.js';
import mailsRouter from './routes/mails.router.js';
import { generateFakeProducts } from './mocks/productsMock.js';
import logger from './winston.js';
import { transporter } from './nodemailer.js';
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUiExpress from "swagger-ui-express";
import userModel from './DATA/mongoDB/models/user.model.js';
import userRouter from './routes/users.router.js';
import mongoose from 'mongoose';

const fileStorage = FileStore(session);

const app = express();

mongoose.connect('mongodb+srv://JuanManuelFilippetti:Mongodb333@cluster0.zyjymia.mongodb.net/bd?retryWrites=true&w=majority');

app.use(cookieParser());
app.use(session({
  store:MongoStore.create({
    mongoUrl: 'mongodb+srv://JuanManuelFilippetti:Mongodb333@cluster0.zyjymia.mongodb.net/bd?retryWrites=true&w=majority',
    mongoOptions: {useNewUrlParser: true, useUnifiedTopology: true},
    ttl:50000,
  }),
  secret : 'qwerty123456',
  resave: false,
  saveUninitialized: false
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

app.use(passport.initialize());
app.use(passport.session());

app.engine('handlebars', handlebars.engine())
app.set('views', __dirname + '/views')
app.set('view engine', 'handlebars')

app.use('/api/views', viewsRouter)
app.use('/api/views/delete/:id', viewsRouter)

const productManagerInstance = new MongoProductManager();

app.get('/loggerTest', (req, res) => {
  logger.debug('Probando debug');
  logger.http('Probando http');
  logger.info('Probando info');
  logger.warning('Probando warning');
  logger.error('Probando error');
  logger.fatal('Probando fatal');
  res.send('Endpoint /loggerTest');
});

app.get('/generarError', (req, res) => {
  throw new Error('Error de prueba');
});

app.get('/', (req, res) => {
  res.send('¡Bienvenidos!');
});

app.use('/api/products', productsRouter);
app.use ('/api/views/products', productsRouter);

app.get('/api/mockingproducts', (req, res) => {
  const fakeProducts = [];
  for (let i = 0; i < 100; i++) {
      const productMock = generateFakeProducts(); 
      fakeProducts.push(productMock);
  }
  res.json(fakeProducts);
});


app.use('/api/carts', cartsRouter);

app.get('/chat', isUser, (req, res) => {
  res.render('chat', { messages: [] }); 
});

app.use("/api/session", sessionRouter);
app.use("/api/session/current", sessionRouter);
app.use("/api/session/users/premium", sessionRouter);

app.use("/api/users", userRouter);
app.use("/api/users/delete" , userRouter);
app.use("/api/users/deleteInactive" , userRouter);


app.get('/api/views/admin/users', async (req, res) => {
  try {
    const users = await userModel.find({}, 'first_name last_name email role');
    res.render('adminViews', { users }); 
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


app.use('/api/mail', mailsRouter);


app.get('/api/views/forgot-pwd', (req, res) => {
  res.render('forgotPwd');
});

app.get('/api/views/forgot-pwd-sent', (req, res) => {
  res.render('forgotPwdSent');
});

app.get('/api/views/reset-pwd-ok', (req, res) => {
  res.render('resetPwdOk');
});

app.get('/api/views/reset-pwd-expired', (req, res) => {
  res.render('resetPwdExpired');
});

app.post('/api/forgot-pwd', async (req, res) => {
  const { email } = req.body;
  const token = crypto.randomBytes(20).toString('hex');
  const expirationTime = Date.now() + 3600000; 
  global.passwordResetToken = { email, token, expirationTime };
  const resetURL = `http://localhost:8080/api/views/reset-pwd/${token}`;
  await transporter.sendMail({
    from: config.gmail_user,
    to: email,
    subject: 'Solicitud de recupero Contraseña',
    html: `Clickea <a href="${resetURL}">aquí</a> para recuperar tu contraseña.`,
  });
  res.redirect('/api/views/forgot-pwd-sent');
});


app.get('/login', (req, res) => {
  res.render('login'); 
});

app.get('/register', (req, res) => {
  res.render('register'); 
});

app.get('/profile', (req, res) => {
  res.render('profile', {
    user: req.session.user,
  }); 
});


const swaggerOptions = {
  definition: {
    openapi: "3.0.1",
    info: {
      title: "Documentación de LD ECOMMERCE",
      description: "Infomación de métodos/funcionalidades aplicados en LD ECOMMERCE",
    },
  },
  apis: [`${__dirname}/docs/**/*.yaml`],  
};
const specs = swaggerJSDoc(swaggerOptions);

app.use("/api/docs", swaggerUiExpress.serve, swaggerUiExpress.setup(specs));

const PORT = config.port||8080
const httpServer = app.listen(PORT, () => {
  console.log(`Escuchando al puerto ${PORT}`)
})

const socketServer = new Server(httpServer);
socketServer.on('connection', (socket) => {
  console.log('Cliente conectado', socket.id);
  socket.on('disconnect', () => {
    console.log(`Cliente desconectado`);
  });

  socket.on('addProduct', (newProduct) => {
    const addedProduct = productManagerInstance.addProduct(newProduct);
    socketServer.emit('addProduct', addedProduct); 
  });

  socket.on('deleteProduct', (productId) => {
    productManagerInstance.deleteProduct(Number(productId));
    socketServer.emit('productDeleted', productId); 
    socketServer.emit('updateProductList'); 
  });

  socket.on('chatMessage', async (messageData) => {
    const { user, message } = messageData;
    const newMessage = new Message({ user, message });
    await newMessage.save();

    socketServer.emit('chatMessage', { user, message });

    console.log(`Mensaje guardado en la base de datos: ${user}: ${message}`);
  });
  
});